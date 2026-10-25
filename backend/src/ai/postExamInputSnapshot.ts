import {
  isRowReviewed,
  postExamInputSnapshotSchema,
  resolvePreExamReview,
  scopedRows,
  steeringMatchesAnalysis,
  type AmaDiagnosticRow,
  type AmaMode,
  type CaseSummaryResponse,
  type PhysicianSteeringResponse,
  type PostExamInput,
  type PostExamPDQ,
  type PostExamQuestionnaire,
  type Region,
  type RegionDiagnosesResponse,
  type StoredPreExamAnalysis,
  type VisitDocumentationResponse,
} from "@azime/contracts";
import { freezeAmaFindings } from "../ama/findings.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import {
  ladderCategories,
  projectFullReviewedAnalysis,
  scopeReview,
} from "./refinedAnalysisInputSnapshot.js";

// Readiness for pass 4, in the order a physician would fix them. Returns the first blocker.
function blocker(
  diagnoses: RegionDiagnosesResponse,
  analyzed: string[],
  preExam: { id: number; updatedAt: string; analysis: StoredPreExamAnalysis },
  steering: PhysicianSteeringResponse,
  dxLabel: (dx: string) => string
): string | null {
  const list = diagnoses.diagnoses;
  const working = list.filter((d) => d.status === "working");
  if (working.length)
    return `Decide every diagnosis first (still working: ${working.map((d) => dxLabel(d.canonicalDx)).join(", ")})`;
  const supported = list.filter((d) => d.status === "supported");
  if (!supported.length) return "No diagnosis in this region is supported";
  const notAnalyzed = list.filter((d) => !analyzed.includes(d.canonicalDx));
  if (notAnalyzed.length)
    return `Analyze ${notAnalyzed.map((d) => dxLabel(d.canonicalDx)).join(", ")} first`;
  if (steering.id === null || !steeringMatchesAnalysis(steering.steering, preExam))
    return "Save the treatment review first";
  const unreviewed = scopedRows(
    preExam.analysis.treatmentAnalysis,
    list.map((d) => d.canonicalDx)
  ).filter((row) => !isRowReviewed(row, steering.steering.treatments[row.id]));
  if (unreviewed.length)
    return `${unreviewed.length} treatment${unreviewed.length === 1 ? " is" : "s are"} unreviewed`;
  return null;
}

// Pass 4 input from 3A + saved steering + the diagnosis list + the visit, scoped to the
// supported diagnoses (the gate leaves none working). No dependency on exam prep.
export function buildPostExamInputSnapshot({
  caseContext,
  region,
  caseSummary,
  preExam,
  steering,
  diagnoses,
  dxLabel,
  visit,
  pdq,
  questionnaires,
  amaMode,
  amaRows,
}: {
  caseContext: PostExamInput["caseContext"];
  region: Region;
  caseSummary: CaseSummaryResponse;
  preExam: {
    id: number;
    updatedAt: string;
    analysis: StoredPreExamAnalysis;
    analyzedDiagnoses: string[];
    ladder: Parameters<typeof ladderCategories>[0];
  };
  steering: PhysicianSteeringResponse;
  diagnoses: RegionDiagnosesResponse;
  dxLabel: (dx: string) => string;
  visit: VisitDocumentationResponse;
  pdq: { id: number; caseId: number; updatedAt: string; data: PostExamPDQ } | null;
  questionnaires: PostExamQuestionnaire[];
  amaMode: AmaMode;
  amaRows: Map<string, AmaDiagnosticRow>;
}) {
  const reason = blocker(diagnoses, preExam.analyzedDiagnoses, preExam, steering, dxLabel);
  if (reason) throw new MissingPrerequisiteError(reason);
  if (pdq && pdq.caseId !== visit.caseId)
    throw new MissingPrerequisiteError("PDQ belongs to a different case");

  const supported = diagnoses.diagnoses
    .filter((d) => d.status === "supported")
    .map((d) => d.canonicalDx);
  const review = scopeReview(
    resolvePreExamReview(preExam.analysis, steering.steering),
    supported
  );
  // Findings stay encounter evidence even when their diagnosis links are gone.
  const amaFindings =
    amaMode === "off"
      ? []
      : visit.documentation.amaAssessments
          .filter((a) => a.region === region)
          .map((a) => {
            const row = amaRows.get(a.rowId);
            if (!row)
              throw new MissingPrerequisiteError(`AMA row ${a.rowId} is unavailable`);
            return freezeAmaFindings(a, row);
          });

  return postExamInputSnapshotSchema.parse({
    input: {
      caseContext,
      region,
      diagnoses: supported.map((canonicalDx) => ({
        canonicalDx,
        label: dxLabel(canonicalDx),
      })),
      caseSummary: caseSummary.summary,
      reviewedTreatmentAnalysis: projectFullReviewedAnalysis(
        review,
        ladderCategories(preExam.ladder)
      ),
      visit: {
        examinationDate: visit.createdAt.slice(0, 10),
        note: visit.documentation.note,
        pdq: pdq?.data ?? null,
        questionnaires,
        amaFindings,
      },
    },
    basedOn: {
      caseSummaryId: caseSummary.id,
      preExamAnalysisId: preExam.id,
      preExamAnalysisUpdatedAt: preExam.updatedAt,
      physicianSteeringId: steering.id,
      physicianSteeringRevision: steering.revision,
      diagnosesRevision: diagnoses.revision,
      visitDocumentationId: visit.id,
      visitDocumentationRevision: visit.revision,
      pdqId: pdq?.id ?? null,
      pdqUpdatedAt: pdq?.updatedAt ?? null,
    },
  });
}
