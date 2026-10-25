import type { StoredPreExamAnalysis } from "./preExamAnalysis.js";
import type { PhysicianSteering } from "./physicianSteering.js";

export type PreExamAnalysisIdentity = {
  id: number;
  updatedAt: string;
};

export function steeringMatchesAnalysis(
  steering: PhysicianSteering,
  analysis: PreExamAnalysisIdentity,
): boolean {
  return (
    steering.preExamAnalysisId === analysis.id &&
    steering.preExamAnalysisUpdatedAt === analysis.updatedAt
  );
}

// Sparse decisions: omitted entries are unreviewed, never implicit agreement.
export function initializePhysicianSteering(
  analysis: PreExamAnalysisIdentity,
  saved: PhysicianSteering | null = null,
): PhysicianSteering {
  if (saved && steeringMatchesAnalysis(saved, analysis)) {
    return structuredClone(saved);
  }

  return {
    preExamAnalysisId: analysis.id,
    preExamAnalysisUpdatedAt: analysis.updatedAt,
    treatments: {},
    addedTreatments: [],
    inconsistencies: {},
    evidenceGaps: {},
    notes: null,
  };
}

function resolveAssessment<T extends string>(
  value: T,
  rationale: string,
  review?:
    | { action: "agree"; note?: string }
    | { action: "override"; value: T; rationale: string },
) {
  return {
    value: review?.action === "override" ? review.value : value,
    rationale: review?.action === "override" ? review.rationale : rationale,
    source:
      review?.action === "override" ? ("physician" as const) : ("ai" as const),
    reviewStatus: review?.action ?? ("unreviewed" as const),
    note: review?.action === "agree" ? (review.note ?? null) : null,
  };
}

// Shared by the cockpit and future 3B input builder. Never changes either input.
// Retain excluded items and original AI values for provenance and undo.
export function resolvePreExamReview(
  analysis: StoredPreExamAnalysis,
  steering: PhysicianSteering,
) {
  const original = structuredClone(analysis);
  return {
    ...original,
    treatmentAnalysis: original.treatmentAnalysis.map((row) => {
      const review = steering.treatments[row.id];
      return {
        ...row,
        disposition: review?.disposition ?? "keep",
        dispositionReviewed: review?.disposition !== undefined,
        active: review?.disposition !== "prune",
        physicianNote: review?.note ?? null,
        assessments: row.assessments.map((assessment) => ({
          ...assessment,
          applicability: resolveAssessment(
            assessment.aiApplicability,
            assessment.aiApplicabilityRationale,
            review?.assessments?.[assessment.canonicalDx]?.applicability,
          ),
        })),
        exhaustion: resolveAssessment(
          row.aiExhaustion,
          row.aiExhaustionRationale,
          review?.exhaustion,
        ),
      };
    }),
    addedTreatments: structuredClone(steering.addedTreatments).map((row) => ({
      ...row,
      source: "physician" as const,
    })),
    inconsistencies: original.inconsistencies.map((finding) => ({
      ...finding,
      disposition: steering.inconsistencies[finding.id]?.disposition ?? "keep",
      reviewed: steering.inconsistencies[finding.id] !== undefined,
      reason: steering.inconsistencies[finding.id]?.reason ?? null,
    })),
    evidenceGaps: original.evidenceGaps.map((finding) => ({
      ...finding,
      disposition: steering.evidenceGaps[finding.id]?.disposition ?? "keep",
      reviewed: steering.evidenceGaps[finding.id] !== undefined,
      reason: steering.evidenceGaps[finding.id]?.reason ?? null,
    })),
    physicianNotes: steering.notes,
  };
}

// Treatment rows narrowed to the given diagnoses: assessments for other diagnoses are
// hidden (their steering is kept), and rows left with none are dropped.
export const scopedRows = <T extends { assessments: { canonicalDx: string }[] }>(
  rows: T[],
  diagnoses: string[],
) =>
  rows.flatMap((row) => {
    const assessments = row.assessments.filter((a) =>
      diagnoses.includes(a.canonicalDx),
    );
    return row.assessments.length && !assessments.length
      ? []
      : [{ ...row, assessments }];
  });

// Reviewed = pruned, or kept with an exhaustion decision and an applicability decision on
// every assessment shown. An added diagnosis adds an assessment and may clear the exhaustion
// decision (see applyPreExamDelta), which reopens the row.
export const isRowReviewed = (
  row: { assessments: { canonicalDx: string }[] },
  steering: PhysicianSteering["treatments"][string] | undefined,
) =>
  steering?.disposition === "prune" ||
  (steering?.disposition === "keep" &&
    Boolean(steering.exhaustion) &&
    row.assessments.every(
      (a) => steering.assessments?.[a.canonicalDx]?.applicability,
    ));
