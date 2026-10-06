import {
  postExamInputSnapshotSchema,
  type PostExamPDQ,
  type PostExamQuestionnaire,
  type RefinedAnalysisResponse,
  type VisitDocumentationResponse,
} from "@azime/contracts";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

export function buildPostExamInputSnapshot({
  refined,
  visit,
  pdq,
  questionnaires,
}: {
  refined: RefinedAnalysisResponse;
  visit: VisitDocumentationResponse;
  pdq: {
    id: number;
    caseId: number;
    updatedAt: string;
    data: PostExamPDQ;
  } | null;
  questionnaires: PostExamQuestionnaire[];
}) {
  if (visit.caseId !== refined.caseId)
    throw new MissingPrerequisiteError(
      "Visit and exam prep belong to different cases",
    );
  if (pdq && pdq.caseId !== visit.caseId)
    throw new MissingPrerequisiteError("PDQ belongs to a different case");
  const { reviewedAnalysis: _reducedReview, ...caseContext } =
    refined.inputSnapshot.input;
  return postExamInputSnapshotSchema.parse({
    input: {
      ...caseContext,
      reviewedTreatmentAnalysis: refined.inputSnapshot.fullReviewedAnalysis,
      refinedAnalysis: refined.analysis,
      visit: {
        note: visit.documentation.note,
        priorityResponses: visit.documentation.priorityResponses.filter(
          (response) => response.region === refined.region,
        ),
        pdq: pdq?.data ?? null,
        questionnaires,
      },
    },
    basedOn: {
      refinedAnalysisId: refined.id,
      refinedAnalysisUpdatedAt: refined.updatedAt,
      visitDocumentationId: visit.id,
      visitDocumentationRevision: visit.revision,
      pdqId: pdq?.id ?? null,
      pdqUpdatedAt: pdq?.updatedAt ?? null,
    },
  });
}
