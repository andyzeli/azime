import {
  postExamInputSnapshotSchema,
  type AmaDiagnosticRow,
  type AmaMode,
  type PostExamPDQ,
  type PostExamQuestionnaire,
  type RefinedAnalysisResponse,
  type VisitDocumentationResponse,
} from "@azime/contracts";
import { freezeAmaFindings } from "../ama/findings.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

export function buildPostExamInputSnapshot({
  refined,
  visit,
  pdq,
  questionnaires,
  amaMode,
  amaRows,
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
  amaMode: AmaMode;
  amaRows: Map<string, AmaDiagnosticRow>;
}) {
  if (visit.caseId !== refined.caseId)
    throw new MissingPrerequisiteError(
      "Visit and exam prep belong to different cases",
    );
  if (pdq && pdq.caseId !== visit.caseId)
    throw new MissingPrerequisiteError("PDQ belongs to a different case");
  const { reviewedAnalysis: _reducedReview, ...caseContext } =
    refined.inputSnapshot.input;
  // Unlinked assessments keep their answers on the visit but are not findings.
  const amaFindings =
    amaMode === "off"
      ? []
      : visit.documentation.amaAssessments
          .filter((a) => a.region === refined.region && a.canonicalDxIds.length)
          .map((a) => {
            const row = amaRows.get(a.rowId);
            if (!row)
              throw new MissingPrerequisiteError(`AMA row ${a.rowId} is unavailable`);
            return freezeAmaFindings(a, row);
          });
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
        amaFindings,
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
