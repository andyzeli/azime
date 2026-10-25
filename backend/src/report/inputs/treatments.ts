import type {
  ReportInappropriateCare,
  ReportExhaustedCare,
  ReportTreatment,
  ReportRemainingCare,
  ReportCurativeCare,
  ReportMaintenanceCare,
} from "@azime/contracts";

// Deterministic care projection. No semantic interpretation, exhaustion inference, or change
// to the original treatment rows. Distinct diagnosis-specific reasons stay separate.
export function careMarkedInappropriate(
  treatments: ReportTreatment[],
): ReportInappropriateCare[] {
  return treatments.flatMap((t): ReportInappropriateCare[] => {
    const common = {
      treatment: t.treatment,
      category: t.category,
      documentedHistory: t.documentedHistory,
    };
    if (t.physicianRecommendation?.disposition === "not_recommended") {
      return [
        {
          ...common,
          diagnoses_considered: [
            ...new Set(t.reviewedAssessments.flatMap((a) => a.diagnoses)),
          ],
          decision_basis: "physician_not_recommended",
          inappropriateness_rationale: t.physicianRecommendation.note,
        },
      ];
    }
    // Not applicable to B alone does not exclude a treatment applicable to A.
    // Unclear assessments and absent assessments do not establish exclusion.
    if (
      !t.reviewedAssessments.length ||
      !t.reviewedAssessments.every(
        (a) =>
          a.applicability === "not_applicable" ||
          a.applicability === "contraIndicated",
      )
    )
      return [];
    return t.reviewedAssessments.map((a) => ({
      ...common,
      diagnoses_considered: a.diagnoses,
      decision_basis:
        a.applicability === "contraIndicated"
          ? "contraindicated"
          : "not_applicable",
      inappropriateness_rationale: a.rationale,
    }));
  });
}

// Exhaustion is already decided at treatment level. Include it independently of
// final care disposition: an exhausted treatment may still be maintenance care.
export function careMarkedExhausted(
  treatments: ReportTreatment[],
): ReportExhaustedCare[] {
  return treatments
    .filter((t) => t.exhaustion.value === "exhausted")
    .map((t) => ({
      treatment: t.treatment,
      category: t.category,
      documentedHistory: t.documentedHistory,
      diagnoses_addressed: [
        ...new Set(
          t.reviewedAssessments
            .filter((a) => a.applicability === "applicable")
            .flatMap((a) => a.diagnoses),
        ),
      ],
      exhaustion_rationale: t.exhaustion.rationale,
    }));
}

function remainingCareDetails(t: ReportTreatment): ReportRemainingCare {
  return {
    treatment: t.treatment,
    category: t.category,
    documentedHistory: t.documentedHistory,
    // Expand any earlier exact-match groups back to one rationale per diagnosis.
    // Do not compare, deduplicate or summarize rationale strings here.
    applicability_rationales: t.reviewedAssessments
      .filter((a) => a.applicability !== "not_applicable")
      .flatMap((a) =>
        a.diagnoses.map((diagnosis) => ({
          diagnosis,
          rationale: a.rationale,
          ...(a.applicability === "applicable"
            ? {}
            : { applicability: a.applicability }),
        })),
      ),
    exhaustion_status: t.exhaustion.value,
    exhaustion_rationale: t.exhaustion.rationale,
  };
}

export function remainingCurativeCare(
  treatments: ReportTreatment[],
): ReportCurativeCare[] {
  return treatments
    .filter((t) => t.physicianRecommendation?.disposition === "curative")
    .map(remainingCareDetails);
}

export function remainingMaintenanceCare(
  treatments: ReportTreatment[],
): ReportMaintenanceCare[] {
  return treatments
    .filter((t) => t.physicianRecommendation?.disposition === "maintenance")
    .map(remainingCareDetails);
}
