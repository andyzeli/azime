#!/usr/bin/env python3
"""Validator for the spine standards-of-care taxonomy JSON files.

Usage: python3 validate.py [directory]   (defaults to this script's directory)
Exit code 0 = no errors (warnings/info allowed), 1 = errors found.
"""
import json, os, re, sys
from collections import Counter, defaultdict

DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
REGIONS = {"cervical_spine", "thoracic_spine", "lumbar_spine"}
CATEGORIES = {"conservative", "medication", "injection", "surgical", "multimodal"}
ID_RE = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*(?:__[a-z0-9_]+)?$")
ICD_RE = re.compile(r"^[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$")

SCHEMA = {
    "canonical_diagnoses.json": {"id": str, "region_id": str, "label": str, "description": str, "icdPrefixes": list},
    "treatments.json": {"id": str, "region": str, "category": str, "name": str},
    "aliases.json": {"treatmentId": str, "alias": str},
    "ladder_entries.json": {"id": str, "region_id": str, "canonical_dx_id": str, "treatment_id": str, "applicability": str, "adequacy": str},
    "sources.json": {"id": str, "ref": str, "edition": str},
    "ladder_entry_sources.json": {"ladder_entry_id": str, "source_id": str},
}

errors, warnings, infos = [], [], []
err = errors.append; warn = warnings.append; info = infos.append

def load(fn):
    path = os.path.join(DIR, fn)
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        err(f"{fn}: file not found"); return []
    except json.JSONDecodeError as e:
        err(f"{fn}: invalid JSON ({e})"); return []
    if not isinstance(data, list):
        err(f"{fn}: top level must be a JSON array"); return []
    schema = SCHEMA[fn]
    for i, row in enumerate(data):
        if not isinstance(row, dict):
            err(f"{fn}[{i}]: not an object"); continue
        missing = [k for k in schema if k not in row]
        extra = [k for k in row if k not in schema]
        if missing: err(f"{fn}[{i}]: missing fields {missing}")
        if extra: err(f"{fn}[{i}]: unexpected fields {extra} (must match table columns exactly)")
        for k, typ in schema.items():
            if k in row:
                v = row[k]
                if not isinstance(v, typ):
                    err(f"{fn}[{i}].{k}: expected {typ.__name__}")
                elif typ is str and not v.strip():
                    err(f"{fn}[{i}].{k}: empty string")
    return [r for r in data if isinstance(r, dict)]

def unique(fn, rows, key="id"):
    c = Counter(r.get(key) for r in rows)
    for k, n in c.items():
        if n > 1: err(f"{fn}: duplicate {key} '{k}' ({n}x)")
    for r in rows:
        v = r.get(key)
        if isinstance(v, str) and not ID_RE.match(v):
            err(f"{fn}: id '{v}' is not stable snake_case")
    return {r.get(key) for r in rows}

dx = load("canonical_diagnoses.json")
tx = load("treatments.json")
al = load("aliases.json")
le = load("ladder_entries.json")
src = load("sources.json")
les = load("ladder_entry_sources.json")

dx_ids = unique("canonical_diagnoses.json", dx)
tx_ids = unique("treatments.json", tx)
le_ids = unique("ladder_entries.json", le)
src_ids = unique("sources.json", src)
dx_region = {d.get("id"): d.get("region_id") for d in dx}
tx_region = {t.get("id"): t.get("region") for t in tx}

# canonical diagnoses
for d in dx:
    if d.get("region_id") not in REGIONS: err(f"canonical_diagnoses: '{d.get('id')}' bad region_id '{d.get('region_id')}'")
    icds = d.get("icdPrefixes") or []
    if not icds: err(f"canonical_diagnoses: '{d.get('id')}' has no icdPrefixes")
    for p in icds:
        if not isinstance(p, str) or not ICD_RE.match(p): err(f"canonical_diagnoses: '{d.get('id')}' malformed ICD-10-CM prefix '{p}'")
    if len(set(icds)) != len(icds): err(f"canonical_diagnoses: '{d.get('id')}' duplicate icdPrefixes")
# ICD prefix shared within a region -> ambiguous (across regions is expected for region-agnostic codes)
by_region_prefix = defaultdict(list)
for d in dx:
    for p in d.get("icdPrefixes") or []:
        by_region_prefix[(d.get("region_id"), p)].append(d.get("id"))
for (r, p), ids in by_region_prefix.items():
    if len(ids) > 1: warn(f"ICD prefix '{p}' maps to multiple dx in {r}: {ids}")
cross = defaultdict(set)
for d in dx:
    for p in d.get("icdPrefixes") or []:
        cross[p].add(d.get("region_id"))
shared = sorted(p for p, rs in cross.items() if len(rs) > 1)
if shared: info(f"region-agnostic ICD prefixes present in >1 region (need region context): {shared}")

# treatments
for t in tx:
    if t.get("region") not in REGIONS: err(f"treatments: '{t.get('id')}' bad region '{t.get('region')}'")
    if t.get("category") not in CATEGORIES: err(f"treatments: '{t.get('id')}' bad category '{t.get('category')}'")

# aliases
seen_alias = Counter((a.get("treatmentId"), str(a.get("alias")).lower()) for a in al)
for (t, a), n in seen_alias.items():
    if n > 1: err(f"aliases: duplicate alias '{a}' for '{t}'")
alias_region = defaultdict(set)
for a in al:
    t = a.get("treatmentId")
    if t not in tx_ids: err(f"aliases: treatmentId '{t}' not in treatments")
    else: alias_region[(tx_region[t], str(a.get("alias")).lower())].add(t)
for (r, a), ts in alias_region.items():
    if len(ts) > 1: warn(f"aliases: '{a}' is ambiguous within {r}: {sorted(ts)}")
no_alias = sorted(tx_ids - {a.get("treatmentId") for a in al})
if no_alias: warn(f"treatments with no aliases: {no_alias}")

# ladder entries
pairs = Counter()
for e in le:
    eid, r, d, t = e.get("id"), e.get("region_id"), e.get("canonical_dx_id"), e.get("treatment_id")
    if r not in REGIONS: err(f"ladder_entries: '{eid}' bad region_id '{r}'")
    if d not in dx_ids: err(f"ladder_entries: '{eid}' canonical_dx_id '{d}' not found")
    elif dx_region[d] != r: err(f"ladder_entries: '{eid}' region_id '{r}' != dx region '{dx_region[d]}'")
    if t not in tx_ids: err(f"ladder_entries: '{eid}' treatment_id '{t}' not found")
    elif tx_region[t] != r: err(f"ladder_entries: '{eid}' treatment region '{tx_region[t]}' != '{r}'")
    pairs[(d, t)] += 1
    for k in ("applicability", "adequacy"):
        v = e.get(k) or ""
        if len(v) > 300: warn(f"ladder_entries: '{eid}' {k} is long ({len(v)} chars); keep to 1-2 sentences")
for (d, t), n in pairs.items():
    if n > 1: err(f"ladder_entries: duplicate (dx, treatment) pair ({d}, {t})")
for d in dx_ids - {e.get("canonical_dx_id") for e in le}:
    err(f"canonical_diagnoses: '{d}' has no ladder entries")

# ladder entry sources
les_pairs = Counter((x.get("ladder_entry_id"), x.get("source_id")) for x in les)
for p, n in les_pairs.items():
    if n > 1: err(f"ladder_entry_sources: duplicate link {p}")
for x in les:
    if x.get("ladder_entry_id") not in le_ids: err(f"ladder_entry_sources: ladder_entry_id '{x.get('ladder_entry_id')}' not found")
    if x.get("source_id") not in src_ids: err(f"ladder_entry_sources: source_id '{x.get('source_id')}' not found")
linked = {x.get("ladder_entry_id") for x in les}
for e in sorted(le_ids - linked):
    err(f"ladder_entries: '{e}' has no source")
unused_src = sorted(src_ids - {x.get("source_id") for x in les})
if unused_src: info(f"sources not linked to any ladder entry (reference-only): {unused_src}")

# orphans
orphans = sorted(tx_ids - {e.get("treatment_id") for e in le})
for t in orphans: warn(f"orphan treatment (not used in any ladder entry): '{t}'")

# summary
print(f"Validating {DIR}")
print(f"  canonical_diagnoses={len(dx)} treatments={len(tx)} aliases={len(al)} ladder_entries={len(le)} sources={len(src)} ladder_entry_sources={len(les)}")
for r in sorted(REGIONS):
    print(f"  {r}: dx={sum(1 for d in dx if d.get('region_id')==r)} treatments={sum(1 for t in tx if t.get('region')==r)} "
          f"ladder_entries={sum(1 for e in le if e.get('region_id')==r)} aliases={sum(1 for a in al if tx_region.get(a.get('treatmentId'))==r)}")
for label, items in (("ERROR", errors), ("WARN", warnings), ("INFO", infos)):
    for m in items: print(f"{label}: {m}")
print(f"Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(infos)} info")
sys.exit(1 if errors else 0)
