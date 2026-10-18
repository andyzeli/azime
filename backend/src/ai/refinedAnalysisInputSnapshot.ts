import {
  currentDiagnoses,
  refinedAnalysisInputSnapshotSchema,
  fullReviewedPreExamAnalysisSchema,
  reviewedPreExamAnalysisSchema,
  resolvePreExamReview,
  steeringMatchesAnalysis,
  type CaseSummaryResponse,
  type PhysicianSteeringResponse,
  type RefinedAnalysisInput,
  type RefinedAnalysisInputSnapshot,
  type RegionDiagnosesResponse,
  type ReviewedPreExamAnalysis,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

function isOpenTreatmentIssue(
  applicability: string,
  adequacy: string
): boolean {
  return (
    applicability === "unclear" ||
    (applicability === "applicable" && adequacy !== "adequately_trialed")
  );
}

export function projectFullReviewedAnalysis(
  review: ReturnType<typeof resolvePreExamReview>
) {
  const treatments = [
    ...review.treatmentAnalysis
      .filter((row) => row.active)
      .map((row) => ({
        id: row.id,
        treatmentId: row.treatmentId,
        treatment: row.treatment,
        source: row.source,
        category: null,
        recordStatus: row.recordStatus,
        recordDetail: row.recordDetail,
        episodeIds: row.episodeIds,
        assessments: row.assessments.map((assessment) => ({
          canonicalDx: assessment.canonicalDx,
          applicability: assessment.applicability,
          adequacy: assessment.adequacy,
        })),
        dispositionReviewed: row.dispositionReviewed,
        physicianNote: row.physicianNote,
      })),
    ...review.addedTreatments.map((row) => ({
      id: row.id,
      treatmentId: row.treatmentId,
      treatment: row.treatment,
      source: "physician",
      category: row.category,
      recordStatus: null,
      recordDetail: null,
      episodeIds: row.episodeIds,
      assessments: Object.entries(row.assessments).map(
        ([canonicalDx, assessment]) => ({
          canonicalDx,
          applicability: {
            value: assessment.applicability,
            rationale: assessment.rationale,
            source: "physician",
            reviewStatus: "provided",
            note: null,
          },
          adequacy: {
            value: assessment.adequacy,
            rationale: assessment.rationale,
            source: "physician",
            reviewStatus: "provided",
            note: null,
          },
        })
      ),
      dispositionReviewed: true,
      physicianNote: row.note ?? null,
    })),
  ];
  return fullReviewedPreExamAnalysisSchema.parse({
    treatments,
    inconsistencies: review.inconsistencies
      .filter((item) => item.disposition === "keep")
      .map((item) => ({
        id: item.id,
        description: item.description,
        type: item.type,
        reviewed: item.reviewed,
        physicianNote: item.reason,
      })),
    evidenceGaps: review.evidenceGaps
      .filter((item) => item.disposition === "keep")
      .map((item) => ({
        id: item.id,
        gap: item.gap,
        significance: item.significance,
        reviewed: item.reviewed,
        physicianNote: item.reason,
      })),
    physicianNotes: review.physicianNotes,
  });
}

export function projectReviewedAnalysis(
  review: ReturnType<typeof resolvePreExamReview>
) {
  const { treatments, ...findings } = projectFullReviewedAnalysis(review);
  const treatmentIssues = [];
  const treatmentContext: ReviewedPreExamAnalysis["treatmentContext"] = [];
  const treatmentNotes: ReviewedPreExamAnalysis["treatmentNotes"] = [];

  for (const row of treatments) {
    // Split shared treatment rows per diagnosis, using the effective judgments.
    const assessments = row.assessments.filter((assessment) =>
      isOpenTreatmentIssue(
        assessment.applicability.value,
        assessment.adequacy.value
      )
    );
    if (assessments.length > 0) {
      treatmentIssues.push({ ...row, assessments });
    } else if (row.physicianNote?.trim()) {
      treatmentNotes.push({
        id: row.id,
        treatment: row.treatment,
        canonicalDx: null,
        field: "treatment",
        note: row.physicianNote,
      });
    }

    for (const assessment of row.assessments) {
      if (
        assessment.applicability.value === "applicable" &&
        assessment.adequacy.value === "adequately_trialed"
      ) {
        treatmentContext.push({
          id: row.id,
          treatment: row.treatment,
          canonicalDx: assessment.canonicalDx,
          recordDetail: row.recordDetail,
        });
      }
      if (
        isOpenTreatmentIssue(
          assessment.applicability.value,
          assessment.adequacy.value
        )
      )
        continue;
      for (const field of ["applicability", "adequacy"] as const) {
        const note = assessment[field].note;
        if (note?.trim()) {
          treatmentNotes.push({
            id: row.id,
            treatment: row.treatment,
            canonicalDx: assessment.canonicalDx,
            field,
            note,
          });
        }
      }
    }
  }

  return reviewedPreExamAnalysisSchema.parse({
    treatmentIssues,
    treatmentContext,
    treatmentNotes,
    ...findings,
  });
}

// Leaves out assessments for diagnoses no longer in scope, and rows left with none.
function scopeReview(
  review: ReturnType<typeof resolvePreExamReview>,
  diagnoses: string[]
): ReturnType<typeof resolvePreExamReview> {
  const keep = (dx: string) => diagnoses.includes(dx);
  return {
    ...review,
    treatmentAnalysis: review.treatmentAnalysis.flatMap((row) => {
      const assessments = row.assessments.filter((a) => keep(a.canonicalDx));
      return row.assessments.length && !assessments.length
        ? []
        : [{ ...row, assessments }];
    }),
    addedTreatments: review.addedTreatments.flatMap((row) => {
      const entries = Object.entries(row.assessments);
      const kept = entries.filter(([dx]) => keep(dx));
      return entries.length && !kept.length
        ? []
        : [{ ...row, assessments: Object.fromEntries(kept) }];
    }),
  };
}

// The scope is the 3A scope narrowed to the region's current diagnoses. A current
// diagnosis without a 3A run is not covered until 3A runs for it.
export function buildRefinedAnalysisInputSnapshot({
  caseContext,
  scope: analysisScope,
  diagnoses,
  caseSummary,
  preExam,
  steering,
}: {
  caseContext: RefinedAnalysisInput["caseContext"];
  scope: RefinedAnalysisInput["scope"];
  diagnoses: RegionDiagnosesResponse;
  caseSummary: CaseSummaryResponse;
  preExam: { id: number; updatedAt: string; analysis: StoredPreExamAnalysis };
  steering: PhysicianSteeringResponse;
}): RefinedAnalysisInputSnapshot {
  const current = currentDiagnoses(diagnoses.diagnoses);
  const scope = {
    region: analysisScope.region,
    diagnoses: analysisScope.diagnoses.filter((dx) => current.includes(dx)),
  };
  if (!scope.diagnoses.length) {
    throw new MissingPrerequisiteError(
      "None of the analyzed diagnoses is still in scope. Run the analysis for the current diagnoses"
    );
  }
  if (steering.id === null) {
    throw new MissingPrerequisiteError(
      "Save physician steering before taking a refined analysis snapshot"
    );
  }
  if (
    steering.region !== scope.region ||
    !steeringMatchesAnalysis(steering.steering, preExam)
  ) {
    throw new MissingPrerequisiteError(
      "Physician steering does not match this pre-exam analysis. Reload and save the current review"
    );
  }
  const review = scopeReview(
    resolvePreExamReview(preExam.analysis, steering.steering),
    scope.diagnoses
  );

  return refinedAnalysisInputSnapshotSchema.parse({
    input: {
      caseContext,
      scope,
      caseSummary: caseSummary.summary,
      reviewedAnalysis: projectReviewedAnalysis(review),
    },
    fullReviewedAnalysis: projectFullReviewedAnalysis(review),
    physicianSteering: steering.steering,
    basedOn: {
      caseSummaryId: caseSummary.id,
      preExamAnalysisId: preExam.id,
      preExamAnalysisUpdatedAt: preExam.updatedAt,
      physicianSteeringId: steering.id,
      physicianSteeringRevision: steering.revision,
      diagnosesRevision: diagnoses.revision,
    },
  });
}
