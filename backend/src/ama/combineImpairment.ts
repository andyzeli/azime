import type { AmaRowComponent, Region } from "@azime/contracts";

export type ImpairmentKind =
  "radiculopathy" | "etiology" | "fracture" | "aomsi" | "cns" | "unsupported";
export type ImpairmentComponent = {
  kind: ImpairmentKind;
  root: AmaRowComponent["nerveRoot"];
  side: AmaRowComponent["side"];
  canonicalDxIds: string[];
  // Null means pending, never zero. Not-rated components should be omitted.
  wpi: number | null;
  label: string;
};
export type CombinedImpairment = { wpi: number | null; rationale: string[] };

const caps: Record<Region, number> = {
  lumbar_spine: 33,
  thoracic_spine: 22,
  cervical_spine: 33,
};
const fmt = (n: number) => `${Number(n.toFixed(6))}%`;

/** Supplied CVC formula, in percentage units; no intermediate/final rounding. */
export function combineValues(values: readonly number[]): number {
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100))
    throw new Error("WPI must be a finite percentage from 0 to 100");
  return [...values]
    .sort((a, b) => b - a)
    .reduce((a, b) => a + b * (1 - a / 100), 0);
}

/** Implements the supplied regional rules, retaining an explanation of exclusions. */
export function combineImpairment(
  region: Region,
  components: ImpairmentComponent[]
): CombinedImpairment {
  const rationale: string[] = [];
  const roots = components.filter(
    (c) => c.kind === "radiculopathy" && (c.wpi === null || c.wpi > 0)
  );
  // Subsumption requires the causal diagnosis link, not merely another root in this region.
  const retained = components.filter((c) => {
    if (c.kind !== "etiology") return true;
    const causalRoots = roots.filter((r) =>
      c.canonicalDxIds.some((dx) => r.canonicalDxIds.includes(dx))
    );
    if (!causalRoots.length) return true;
    rationale.push(
      `${c.label}: subsumed by linked radiculopathy (${causalRoots.map((r) => r.label).join(", ")}).`
    );
    return false;
  });
  if (!retained.length)
    return { wpi: null, rationale: [...rationale, "No eligible components."] };
  for (const c of retained) {
    if (c.wpi !== null) combineValues([c.wpi]);
    if (c.wpi === null) rationale.push(`${c.label}: rating is pending.`);
    else if (c.wpi > 0 && (c.kind === "unsupported" || c.kind === "etiology"))
      rationale.push(
        `${c.label}: no supplied combination rule for this component.`
      );
  }
  if (
    retained.some(
      (c) =>
        c.wpi === null ||
        (c.wpi > 0 && ["unsupported", "etiology"].includes(c.kind))
    )
  )
    return { wpi: null, rationale };
  const active = retained.filter((c) => c.wpi! > 0);
  const nerve = active.filter((c) => c.kind === "radiculopathy");
  const seen = new Set<string>();
  for (const c of nerve) {
    if (!c.root || !c.side)
      throw new Error("Radiculopathy requires a root and side");
    const key = `${c.root}:${c.side}`;
    if (seen.has(key))
      throw new Error(`Duplicate radiculopathy component: ${key}`);
    seen.add(key);
  }
  const sideTotals = (["left", "right"] as const).map((side) => {
    const ordered = nerve
      .filter((c) => c.side === side)
      .sort((a, b) => b.wpi! - a.wpi!);
    const adjusted = ordered.map((c, i) => {
      const value = c.wpi! * (i === 0 ? 1 : 0.5);
      rationale.push(
        `${c.root} ${side}: ${fmt(c.wpi!)} at ${i === 0 ? "100%" : "50%"} = ${fmt(value)}.`
      );
      return value;
    });
    const total = combineValues(adjusted);
    if (ordered.length)
      rationale.push(`${side} radiculopathy CVC: ${fmt(total)}.`);
    return total;
  });
  const bilateral = combineValues(sideTotals);
  const radiculopathy = Math.min(bilateral, caps[region]);
  if (nerve.length)
    rationale.push(
      `Bilateral CVC: ${fmt(bilateral)}; ${region} radiculopathy cap ${fmt(caps[region])}: ${fmt(radiculopathy)}.`
    );

  const fractures = active.filter((c) => c.kind === "fracture");
  const instability = active.filter((c) => c.kind === "aomsi");
  if (fractures.length > 1 || instability.length > 1)
    return {
      wpi: null,
      rationale: [
        ...rationale,
        "Multiple fracture or AOMSI components require a within-category rule.",
      ],
    };
  const fracture = fractures[0]?.wpi ?? 0;
  const aomsi = instability[0]?.wpi ?? 0;
  const bone = Math.max(fracture, aomsi);
  if (fracture || aomsi)
    rationale.push(
      `Structural winner: max(fracture ${fmt(fracture)}, AOMSI ${fmt(aomsi)}) = ${fmt(bone)}; the other value is excluded.`
    );
  const chapter17 = combineValues([bone, radiculopathy]);
  // CNS values come from each table's physician-selected A/B/C modifier.
  // Do not apply a second adjustment during combination.
  const chapter13 = combineValues(
    active.filter((c) => c.kind === "cns").map((c) => c.wpi!)
  );
  const wpi = combineValues([chapter17, chapter13]);
  rationale.push(
    `Chapter 17 CVC: ${fmt(chapter17)}.`,
    `Chapter 13 CVC: ${fmt(chapter13)}.`,
    `Regional cross-chapter CVC: ${fmt(wpi)}.`
  );
  return { wpi, rationale };
}

/** Final-screen helper: each region must already have been evaluated independently. */
export function combineRegionalRatings(
  regions: { region: Region; is_mmi: boolean | null; wpi: number | null }[]
): CombinedImpairment {
  const seen = new Set<Region>();
  for (const r of regions) {
    if (seen.has(r.region)) throw new Error(`Duplicate region: ${r.region}`);
    seen.add(r.region);
  }
  const included = regions.filter((r) => r.is_mmi !== false);
  const rationale = regions
    .filter((r) => r.is_mmi === false)
    .map((r) => `${r.region}: excluded, not at MMI.`);
  if (!included.length)
    return {
      wpi: null,
      rationale: [...rationale, "No regions at MMI to combine."],
    };
  if (included.some((r) => r.is_mmi !== true || r.wpi === null))
    return {
      wpi: null,
      rationale: [
        ...rationale,
        "An included region has pending MMI or rating.",
      ],
    };
  const wpi = combineValues(included.map((r) => r.wpi!));
  return { wpi, rationale: [...rationale, `Global CVC: ${fmt(wpi)}.`] };
}
