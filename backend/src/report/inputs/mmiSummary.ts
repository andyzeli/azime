import type { ReportBaseInput } from "@azime/contracts";

export function mmiStatusByRegion(base: ReportBaseInput) {
  return Object.fromEntries(
    base.discussion.regions.map((r) => [
      r.region,
      r.physicianDecisions.mmi.status,
    ]),
  );
}

export function wholePersonImpairment(base: ReportBaseInput) {
  const regions = base.discussion.regions;
  const included = regions
    .filter((r) => r.physicianDecisions.mmi.status === "at_mmi")
    .map((r) => r.region);
  const excluded = regions
    .filter((r) => r.physicianDecisions.mmi.status !== "at_mmi")
    .map((r) => r.region);
  const impairment = base.discussion.wholePerson.impairment;
  return {
    scope: excluded.length ? "mmi_regions_only" : "all_regions",
    included_regions: included,
    excluded_regions: excluded,
    percentage: impairment?.wpi ?? null,
  };
}
