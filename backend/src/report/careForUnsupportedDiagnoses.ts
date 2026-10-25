import {
  resolvePreExamReview,
  type DiagnosisState,
  type PhysicianSteering,
  type ReportCareForUnsupportedDiagnosis,
  type StoredPreExamAnalysis,
} from "@azime/contracts";

// Reach back to the unscoped 3A review: pass 4 has already removed these assessments.
// This is recorded history, not an opinion that the care was inappropriate.
export function careForUnsupportedDiagnoses(
  analysis: StoredPreExamAnalysis,
  steering: PhysicianSteering,
  diagnoses: DiagnosisState[],
  label: (dx: string) => string,
): ReportCareForUnsupportedDiagnosis[] {
  const supported = new Set(
    diagnoses.filter((d) => d.status === "supported").map((d) => d.canonicalDx),
  );
  const rows = resolvePreExamReview(
    analysis,
    steering,
  ).treatmentAnalysis.filter(
    (row) =>
      row.active &&
      // Same recorded-care filter as the Analysis tab; preserve "Unclear" as recorded.
      row.recordStatus !== "Not Documented" &&
      row.recordStatus !== "To Be Started" &&
      !row.assessments.some(
        (a) =>
          supported.has(a.canonicalDx) &&
          a.applicability.value === "applicable",
      ),
  );
  return diagnoses.flatMap((diagnosis) => {
    if (diagnosis.status !== "not_supported") return [];
    const treatments = rows
      .filter((row) =>
        row.assessments.some((a) => a.canonicalDx === diagnosis.canonicalDx),
      )
      .map((row) => ({
        treatment: row.treatment,
        documentedHistory: {
          status: row.recordStatus,
          detail: row.recordDetail,
        },
      }));
    return treatments.length
      ? [{ diagnosis: label(diagnosis.canonicalDx), treatments }]
      : [];
  });
}
