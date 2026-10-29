import { useQuery } from "@tanstack/react-query";
import type { PostExamInputSnapshot, Region } from "@azime/contracts";
import {
  caseSummaryQueryOptions,
  physicianSteeringQueryOptions,
  regionDiagnosesQueryOptions,
  visitQueryOptions,
} from "../../cases/queries";

// What changed since the post-exam analysis (pass 4) froze its inputs; the same checks
// the report readiness makes on the backend. Empty = the analysis is current.
export function usePostExamChanges(
  caseId: string,
  region: Region,
  basedOn: PostExamInputSnapshot["basedOn"] | undefined
) {
  const { data: diagnoses } = useQuery(regionDiagnosesQueryOptions(caseId, region));
  const { data: visit } = useQuery(visitQueryOptions(caseId));
  const { data: caseSummary } = useQuery(caseSummaryQueryOptions(caseId));
  const { data: steering } = useQuery(
    physicianSteeringQueryOptions(caseId, region, basedOn?.preExamAnalysisUpdatedAt)
  );
  if (!basedOn) return [];
  return [
    diagnoses && diagnoses.revision !== basedOn.diagnosesRevision && "diagnoses",
    steering &&
      (steering.id !== basedOn.physicianSteeringId ||
        steering.revision !== basedOn.physicianSteeringRevision) &&
      "treatment review",
    visit && visit.revision !== basedOn.visitDocumentationRevision && "visit",
    caseSummary && caseSummary.id !== basedOn.caseSummaryId && "case summary",
  ].filter((x): x is string => !!x);
}
