#!/usr/bin/env python3
"""Build the first AMA spine upload draft from the three structurally parsed files.

This is a curated normalization pass for the supplied spine rows, not a general
clinical-prose interpreter. The structural parser remains region-independent.
No database writes are performed. See docs/ama-spine-upload.md for semantics.
"""

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGIONS = ("cervical", "thoracic", "lumbar")
OUTPUT = ROOT / "docs/ama-spine.upload.json"

def clean(text):
    """Remove presentation markup, never change numbers or clinical wording."""
    text = re.sub(r"\[([^\]\n]+)\]\(https?://[^\s)]+\)", r"\1", text)
    text = text.replace("*", "").replace("\u00a0", " ").replace("’", "'")
    return re.sub(r"\s+", " ", text).strip().rstrip(";.").strip()


def flatten_help(section):
    parts = [clean(section["lead"])] if section["lead"] else []

    def add(items, depth=0):
        for item in items:
            parts.append("  " * depth + "- " + clean(item["text"]))
            add(item.get("items", []), depth + 1)

    add(section.get("items", []))
    return "\n".join(parts)


def leaf(field, value=True):
    return {"field": field, "equals": value}


def all_of(*rules):
    return {"all": list(rules)}


def nerve_roots_from_description(description):
    """Read spine root labels; vertebral levels in other row families are not roots."""
    if "Radiculopathy" not in description:
        return []
    match = re.search(r"\b([CTLS])(\d+)(?:-([CTLS])(\d+))? Nerve Roots?\b", description)
    if not match:
        raise ValueError(f"Unrecognized nerve-root description: {description}")
    prefix, first, last_prefix, last = match.groups()
    first, last = int(first), int(last or first)
    if (last_prefix and last_prefix != prefix) or last < first:
        raise ValueError(f"Unrecognized nerve-root range: {description}")
    return [f"{prefix}{number}" for number in range(first, last + 1)]


class RowBuilder:
    def __init__(self, source, region):
        self.source = source
        self.row = {
            "row_id": source["row_id"],
            "region_id": region,
            "description": source["description"],
            "nerve_roots": nerve_roots_from_description(source["description"]),
            "questions": [],
            "entries": [],
        }
        help_parts = [clean(source[key]) for key in ("intro", "notes") if source.get(key)]
        if help_parts:
            self.row["help"] = "\n\n".join(help_parts)
        self.by_id = {}
        self.boolean_keys = {}

    def question(self, field, group, prompt, kind="boolean", **extra):
        question = {"id": field, "group": group, "prompt": prompt, "type": kind, **extra}
        if field in self.by_id:
            if self.by_id[field] != question:
                raise ValueError(f"Conflicting question {self.row['row_id']}/{field}")
        else:
            self.row["questions"].append(question)
            self.by_id[field] = question
        return field

    def boolean(self, group, prefix, prompt, help_text):
        # Conservative deduplication: differently worded compound conditions
        # stay separate unless handled explicitly (e.g. sensory status).
        # The L5 SLR list repeats the same condition with a stray closing
        # parenthesis in three entries. Deduplicate that formatting variation.
        key = (group, clean(help_text).replace(
            "in the dermatomal distribution) compatible with",
            "in the dermatomal distribution compatible with"))
        if key in self.boolean_keys:
            return leaf(self.boolean_keys[key])
        field = prefix
        suffix = 2
        while field in self.by_id:
            field = f"{prefix}_{suffix}"
            suffix += 1
        self.question(field, group, prompt, help=clean(help_text))
        self.boolean_keys[key] = field
        return leaf(field)

    def add_entry(self, source_entry, rule):
        self.row["entries"].append({
            "entry_id": source_entry["entry_id"],
            "impairment": source_entry["impairment"],
            "criteria": rule,
        })


def sensory_value(text):
    text = clean(text)
    # User elected to retain this complete condition as written. It is a
    # distinct physician confirmation, not the ordinary sharp/dull choice.
    if "dermatome and/or paresthesias)" in text:
        return None
    if text.startswith("confirms residual radicular symptoms"):
        return "symptoms_without_objective_loss"
    if "dullness to pinprick" in text and "sharp vs dull perception remains intact" in text:
        return "diminished_pinprick"
    if "loss of sharp vs dull perception" in text:
        return "sharp_dull_loss"
    return None


SENSORY_LABELS = {
    "symptoms_without_objective_loss": "Residual radicular symptoms without objective sensory loss",
    "diminished_pinprick": "Diminished pinprick sensation; sharp/dull discrimination intact",
    "sharp_dull_loss": "Loss of sharp/dull discrimination",
}


def make_sensory_question(builder):
    descriptions = {}
    for entry in builder.source["entries"]:
        section = entry["sections"]["PE"]
        texts = [section["lead"]] + [item["text"] for item in section.get("items", [])]
        for text in texts:
            value = sensory_value(text)
            if value:
                # The first detailed description supplies the dermatomal help;
                # later list items often repeat the same status without detail.
                descriptions.setdefault(value, clean(text))
    if descriptions:
        options = [{"value": value, "label": label, "help": descriptions[value]}
                   for value, label in SENSORY_LABELS.items() if value in descriptions]
        options.append({"value": "none", "label": "None of these findings"})
        builder.question("sensory_status", "PE", "Which sensory finding is present?",
                         "choice", options=options)


def pe_item(builder, text):
    if builder.row["row_id"] == "17-21-04" and "dermatome and/or paresthesias)" in text:
        return builder.boolean("PE", "sensory_criterion_2b",
                               "Is the following L2 sensory criterion met?", text)
    value = sensory_value(text)
    if value:
        return leaf("sensory_status", value)
    plain = clean(text)
    if plain.startswith("positive reproducible"):
        name = "Spurling" if "Spurling" in plain else (
            "straight leg raise" if "straight leg raise" in plain else "femoral nerve stretch")
        return builder.boolean("PE", "neural_tension", f"Is the specified {name} test positive?", plain)
    if plain.startswith("motor deficit"):
        grade = re.search(r"motor deficit (0/5 to\s*1/5|[234]/5)", plain)
        if not grade:
            raise ValueError(f"Unrecognized motor grade: {plain}")
        label = re.sub(r"to\s*", "to ", grade[1])
        field = "motor_" + ("0_to_1" if label.startswith("0/") else label[0])
        return builder.boolean("PE", field, f"Are the specified {label} motor findings present?", plain)
    if "atrophy/asymmetry" in plain:
        band = re.search(r">\s*[\d.]+\s*cm(?:\s+to\s*[≤<]?\s*[\d.]+\s*cm)?", plain)
        if not band:
            raise ValueError(f"Unrecognized atrophy band: {plain}")
        return builder.boolean("PE", "atrophy",
                               f"Is the specified {band[0]} muscle atrophy/asymmetry present?", plain)
    if plain.startswith("asymmetrical"):
        state = "diminished" if "diminished" in plain else "absent"
        return builder.boolean("PE", f"reflex_{state}",
                               f"Is the specified asymmetric {state} reflex finding present?", plain)
    raise ValueError(f"Unrecognized PE item for {builder.row['row_id']}: {plain}")


def pe_rule(builder, section):
    if not section.get("items"):
        return pe_item(builder, section["lead"])
    if any(item.get("items") for item in section["items"]):
        raise ValueError("Nested PE list needs explicit normalization")
    rules = [pe_item(builder, item["text"]) for item in section["items"]]
    instruction = section.get("list_instruction")
    if instruction == {"kind": "all"}:
        return {"all": rules}
    if instruction and instruction["kind"] == "stated_count":
        count = instruction["count"]
        if count == 1:
            return {"any": rules}
        # User confirmed that N of the following means at least N for this draft.
        return {"at_least": count, "of": rules}
    raise ValueError(f"Missing PE list connective for {builder.row['row_id']}")


def normalize_radiculopathy(builder):
    source = builder.source
    make_sensory_question(builder)
    cs = source["entries"][0]["sections"]["CS"]
    if len(cs.get("items", [])) != 3:
        raise ValueError(f"Review CS pathways for {source['row_id']}")
    help_text = flatten_help(cs)
    # Include the supplied EMG qualification passage as reference help rather
    # than inventing a machine-readable interpretation of its nested prose.
    emg_source = (ROOT / "docs/ama-electrodiagnostic-source.md").read_text()
    start = emg_source.index("Electromyographic evidence is useful")
    end = emg_source.index("The following has been published", start)
    help_text += "\n\nElectrodiagnostic requirements and limitations:\n" + emg_source[start:end].strip()
    cs_field = builder.question(
        "cs_confirmed", "CS", "Is this nerve-root diagnosis supported by at least one of the listed alternatives?",
        help=help_text,
    )
    for entry in source["entries"]:
        builder.add_entry(entry, all_of(leaf(cs_field), pe_rule(builder, entry["sections"]["PE"])))


def consistent_pe(builder):
    for entry in builder.source["entries"]:
        pe = entry["sections"]["PE"]
        if pe is None or clean(pe["lead"]) != "consistent with DX" or pe.get("items"):
            raise ValueError(f"Unexpected PE for {builder.row['row_id']}")
    builder.question("pe_consistent", "PE", "Is the physical examination consistent with this diagnosis?")
    return leaf("pe_consistent")


def normalize_fusion(builder):
    pe = consistent_pe(builder)
    options = []
    for entry in builder.source["entries"]:
        lead = clean(entry["sections"]["CS"]["lead"])
        extent = "single_level" if "single-level" in lead else "multiple_levels"
        if extent == "multiple_levels" and "multi-level" not in lead:
            raise ValueError(f"Unrecognized fusion extent: {lead}")
        options.append({"value": extent, "label": lead.split("consistent with DX of ")[1]})
        builder.add_entry(entry, all_of(pe, leaf("fusion_extent", extent)))
    options.append({"value": "not_confirmed", "label": "Not confirmed"})
    builder.question("fusion_extent", "CS", "What does imaging or the operative record confirm?",
                     "choice", options=options)


def normalize_fracture(builder):
    pe = consistent_pe(builder)
    for entry in builder.source["entries"]:
        cs = entry["sections"]["CS"]
        if cs.get("items"):
            if cs.get("list_instruction") != {"kind": "stated_count", "count": 1}:
                raise ValueError("Unrecognized fracture alternative list")
            criteria = []
            for item in cs["items"]:
                if item.get("items"):
                    raise ValueError("Nested fracture criterion needs review")
                criteria.append(builder.boolean(
                    "CS", "fracture_finding",
                    "Do imaging or operative findings confirm this fracture criterion?", item["text"]))
            cs_rule = {"any": criteria}
        else:
            cs_rule = builder.boolean(
                "CS", "fracture_finding",
                "Do imaging or operative findings confirm this fracture criterion?", cs["lead"])
        builder.add_entry(entry, all_of(pe, cs_rule))


def normalize_instability(builder):
    pe = consistent_pe(builder)
    for entry in builder.source["entries"]:
        cs = entry["sections"]["CS"]
        if cs.get("list_instruction") != {"kind": "stated_count", "count": 1}:
            raise ValueError("Unrecognized instability connective")
        # Preserve the region/level-specific nested requirements together in
        # help. Physician confirms them; there is no inferred measurement rule.
        field = builder.question("instability_confirmed", "CS",
                                 "Do flexion/extension radiographs meet at least one of the listed instability criteria?",
                                 help=flatten_help(cs))
        builder.add_entry(entry, all_of(pe, leaf(field)))


def normalize_infection(builder):
    pe = consistent_pe(builder)
    for entry in builder.source["entries"]:
        ch = clean(entry["sections"]["CH"]["lead"])
        if "6 months or longer" not in ch or "chronic osteomyelitis" not in ch:
            raise ValueError("Infection-specific history is missing")
        history = builder.question(
            "infection_history_confirmed", "diagnosis",
            "Does the deep spinal wound infection require chronic suppressive antibiotic therapy for six months or longer due to chronic osteomyelitis?",
        )
        cs = builder.question("cs_confirmed", "CS", "Do imaging or operative findings support this diagnosis?",
                              help=flatten_help(entry["sections"]["CS"]))
        builder.add_entry(entry, all_of(leaf(history), pe, leaf(cs)))


def normalize_claudication(builder):
    entries = builder.source["entries"]
    history_text = entries[0]["sections"]["CH"]["lead"]
    if any(entry["sections"]["CH"]["lead"] != history_text or entry["sections"]["PE"] is not None
           for entry in entries):
        raise ValueError("Claudication history/PE differs from the reviewed source")
    history = builder.question("claudication_history_confirmed", "diagnosis",
                               "Does the history meet the listed neurogenic claudication requirements?",
                               help=clean(history_text))
    options = []
    for entry in entries:
        lead = clean(entry["sections"]["CS"]["lead"])
        extent = "single_level" if "single level" in lead else "multiple_levels_or_bilateral"
        if extent != "single_level" and "multiple levels or bilaterally" not in lead:
            raise ValueError("Unrecognized stenosis extent")
        options.append({"value": extent, "label": "Single level" if extent == "single_level"
                        else "Multiple levels or bilateral involvement", "help": lead})
        builder.add_entry(entry, all_of(leaf(history), leaf("stenosis_extent", extent)))
    options.append({"value": "not_confirmed", "label": "Not confirmed"})
    builder.question("stenosis_extent", "CS",
                     "What extent of stenosis is confirmed by imaging or operative findings and consistent with the history?",
                     "choice", options=options)


def normalize_rows():
    result = []
    for region in REGIONS:
        source_rows = json.loads((ROOT / f"docs/ama-rows-{region}.parsed.json").read_text())["rows"]
        for source in source_rows:
            builder = RowBuilder(source, region)
            name = source["description"]
            if "Radiculopathy" in name:
                normalize_radiculopathy(builder)
            elif "Fracture" in name:
                normalize_fracture(builder)
            elif "Fusion, Arthroplasty, or Pseudarthrosis" in name:
                normalize_fusion(builder)
            elif "Instability" in name:
                normalize_instability(builder)
            elif "Wound Infection" in name:
                normalize_infection(builder)
            elif "Neurogenic Claudication" in name:
                normalize_claudication(builder)
            else:
                raise ValueError(f"Unrecognized row family: {name}")
            result.append(builder.row)
    validate(result)
    return result


def validate(rows):
    """Validate the upload contract and all row-local rule references."""
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    require(isinstance(rows, list) and bool(rows), "Expected a nonempty row array")
    row_ids = set()
    for row in rows:
        require(set(row) <= {"row_id", "region_id", "description", "nerve_roots", "help", "questions", "entries"},
                "Unexpected row property")
        require(re.fullmatch(r"\d{2}-\d{2}-\d{2}", row["row_id"]) and row["row_id"] not in row_ids,
                "Invalid or duplicate row ID")
        row_ids.add(row["row_id"])
        require(row["region_id"] in REGIONS and bool(row["description"]), "Invalid row description/region")
        require(row.get("nerve_roots") == nerve_roots_from_description(row["description"]),
                f"Missing or mismatched nerve roots for {row['row_id']}")
        questions = {}
        for question in row["questions"]:
            require(set(question) <= {"id", "group", "prompt", "type", "options", "help"}, "Unexpected question property")
            require(question["id"] not in questions and re.fullmatch(r"[a-z][a-z0-9_]*", question["id"]), "Invalid/duplicate question ID")
            require(question["group"] in {"PE", "CS", "diagnosis"} and bool(question["prompt"]), "Invalid question group/prompt")
            require(question["type"] in {"boolean", "choice"}, "Unknown question type")
            if question["type"] == "choice":
                options = question.get("options", [])
                require(len(options) >= 2, "Choice needs options")
                require(len({option["value"] for option in options}) == len(options), "Duplicate option value")
                for option in options:
                    require(set(option) <= {"value", "label", "help"} and bool(option["value"]) and bool(option["label"]), "Invalid option")
            else:
                require("options" not in question, "Boolean cannot have choice options")
            questions[question["id"]] = question

        used = set()

        def check_rule(rule):
            require(isinstance(rule, dict), "Rule must be an object")
            if set(rule) == {"field", "equals"}:
                require(rule["field"] in questions, f"Unknown field {rule['field']}")
                question = questions[rule["field"]]
                used.add(rule["field"])
                if question["type"] == "boolean":
                    require(type(rule["equals"]) is bool, "Boolean predicate needs true/false")
                else:
                    require(rule["equals"] in {option["value"] for option in question["options"]}, "Unknown choice value")
            elif set(rule) in ({"all"}, {"any"}):
                children = next(iter(rule.values()))
                require(isinstance(children, list) and bool(children), "Empty logical group")
                for child in children:
                    check_rule(child)
            elif set(rule) == {"at_least", "of"}:
                require(isinstance(rule["of"], list) and type(rule["at_least"]) is int
                        and 1 <= rule["at_least"] <= len(rule["of"]), "Invalid count")
                require(len({json.dumps(child, sort_keys=True) for child in rule["of"]}) == len(rule["of"]), "Repeated counted predicate")
                for child in rule["of"]:
                    check_rule(child)
            else:
                raise ValueError(f"Unknown rule: {rule}")

        entry_ids = set()
        require(bool(row["entries"]), "Row needs entries")
        for entry in row["entries"]:
            require(set(entry) == {"entry_id", "impairment", "criteria"}, "Unexpected entry property")
            require(re.fullmatch(r"\d+[A-Z]", entry["entry_id"]) and entry["entry_id"] not in entry_ids, "Invalid/duplicate entry ID")
            entry_ids.add(entry["entry_id"])
            require(set(entry["impairment"]) == {"value", "unit"}, "Invalid impairment shape")
            require(type(entry["impairment"]["value"]) in (int, float)
                    and 0 <= entry["impairment"]["value"] <= 100 and entry["impairment"]["unit"] == "WPI", "Invalid impairment")
            check_rule(entry["criteria"])
        require(used == set(questions), f"Unused questions in {row['row_id']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-only", type=Path, metavar="UPLOAD_JSON")
    args = parser.parse_args()
    if args.validate_only:
        rows = json.loads(args.validate_only.read_text())
        validate(rows)
    else:
        rows = normalize_rows()
        OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    entries = [entry for row in rows for entry in row["entries"]]
    print(f"Validated {len(rows)} rows, {len(entries)} entries, "
          f"{sum(len(row['questions']) for row in rows)} questions; "
          f"{sum(entry['criteria'] is None for entry in entries)} entries lack matching rules.")


if __name__ == "__main__":
    main()
