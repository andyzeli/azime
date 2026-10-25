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

// A 3B issue: unclear applicability, or an applicable treatment not shown to be exhausted.
function isOpenTreatmentIssue(applicability: string, exhaustion: string) {
  return (
    applicability === "unclear" ||
    (applicability === "applicable" && exhaustion !== "exhausted")
  );
}

type TreatmentCategory =
  ReviewedPreExamAnalysis["treatmentIssues"][number]["category"];

// Taxonomy category per treatmentId, from the frozen 3A input's ladder.
export function ladderCategories(
  ladder: { treatmentId: string; category: TreatmentCategory }[]
) {
  return new Map(ladder.map((e) => [e.treatmentId, e.category]));
}

export function projectFullReviewedAnalysis(
  review: ReturnType<typeof resolvePreExamReview>,
  categories: Map<string, TreatmentCategory>
) {
  const treatments = [
    ...review.treatmentAnalysis
      .filter((row) => row.active)
      .map((row) => ({
        id: row.id,
        treatmentId: row.treatmentId,
        treatment: row.treatment,
        source: row.source,
        category: row.treatmentId
          ? (categories.get(row.treatmentId) ?? null)
          : null,
        recordStatus: row.recordStatus,
        recordDetail: row.recordDetail,
        episodeIds: row.episodeIds,
        assessments: row.assessments.map((assessment) => ({
          canonicalDx: assessment.canonicalDx,
          applicability: assessment.applicability,
        })),
        exhaustion: row.exhaustion,
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
      episodeIds: [], // physician additions aren't linked to records
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
        })
      ),
      exhaustion: {
        value: row.exhaustion,
        rationale: row.exhaustionRationale,
        source: "physician",
        reviewStatus: "provided",
        note: null,
      },
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
  review: ReturnType<typeof resolvePreExamReview>,
  categories: Map<string, TreatmentCategory>
) {
  const { treatments, ...findings } = projectFullReviewedAnalysis(
    review,
    categories
  );
  const treatmentIssues = [];
  const treatmentContext: ReviewedPreExamAnalysis["treatmentContext"] = [];
  const treatmentNotes: ReviewedPreExamAnalysis["treatmentNotes"] = [];

  for (const row of treatments) {
    // Split shared treatment rows per diagnosis, using the effective judgments.
    const open = (assessment: (typeof row.assessments)[number]) =>
      isOpenTreatmentIssue(assessment.applicability.value, row.exhaustion.value);
    const assessments = row.assessments.filter(open);
    if (assessments.length > 0) {
      treatmentIssues.push({ ...row, assessments });
    } else {
      for (const [field, note] of [
        ["treatment", row.physicianNote],
        ["exhaustion", row.exhaustion.note],
      ] as const) {
        if (note?.trim()) {
          treatmentNotes.push({
            id: row.id,
            treatment: row.treatment,
            canonicalDx: null,
            field,
            note,
          });
        }
      }
    }

    for (const assessment of row.assessments) {
      if (
        assessment.applicability.value === "applicable" &&
        row.exhaustion.value === "exhausted"
      ) {
        treatmentContext.push({
          id: row.id,
          treatment: row.treatment,
          canonicalDx: assessment.canonicalDx,
          recordDetail: row.recordDetail,
        });
      }
      const note = assessment.applicability.note;
      if (!open(assessment) && note?.trim()) {
        treatmentNotes.push({
          id: row.id,
          treatment: row.treatment,
          canonicalDx: assessment.canonicalDx,
          field: "applicability",
          note,
        });
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
export function scopeReview(
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
  preExam: {
    id: number;
    updatedAt: string;
    analysis: StoredPreExamAnalysis;
    ladder: { treatmentId: string; category: TreatmentCategory }[];
  };
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
      "Save the treatment review before creating the prep sheet"
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
  const categories = ladderCategories(preExam.ladder);

  return refinedAnalysisInputSnapshotSchema.parse({
    input: {
      caseContext,
      scope,
      caseSummary: caseSummary.summary,
      reviewedAnalysis: projectReviewedAnalysis(review, categories),
    },
    fullReviewedAnalysis: projectFullReviewedAnalysis(review, categories),
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
