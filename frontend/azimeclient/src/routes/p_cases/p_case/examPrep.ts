import { useQueries, useQuery } from "@tanstack/react-query";
import {
  steeringMatchesAnalysis,
  supportedRegions,
  type PhysicianSteeringResponse,
  type PreExamAnalysisResponse,
  type RefinedAnalysisResponse,
  type Region,
  type VisitDocumentationResponse,
} from "@azime/contracts";
import {
  generateRefinedAnalysis,
  physicianSteeringQueryOptions,
  preExamAnalysisQueryOptions,
  refinedAnalysisQueryOptions,
  visitQueryOptions,
} from "../../cases/queries";

export type ExamPrepStatus =
  | { kind: "needs-steering" }
  | { kind: "not-generated" }
  | { kind: "stale"; reasons: string[] }
  | { kind: "current" };

// Saved steering only counts when it belongs to the current analysis run.
export const savedSteeringFor = (
  stored: PreExamAnalysisResponse | null | undefined,
  response: PhysicianSteeringResponse | null | undefined,
) => (stored && response?.id && steeringMatchesAnalysis(response.steering, stored) ? response : null);

// Diagnoses rejected at the visit against the region's current exam prep, i.e. not yet
// addressed by redoing Analysis and regenerating exam prep.
export const rejectedDiagnoses = (
  visit: VisitDocumentationResponse | null | undefined,
  refined: RefinedAnalysisResponse | null | undefined,
) =>
  (visit?.documentation.diagnosisReviews ?? []).filter(
    (r) =>
      refined &&
      r.region === refined.region &&
      r.status === "rejected" &&
      r.refinedUpdatedAt === refined.updatedAt,
  );

// Exam prep is stale when its snapshot no longer matches the region's saved steering,
// or a diagnosis was rejected at the visit after it was generated.
// Shared by the tab badge, the Analysis footer and the Exam prep banner.
// TODO: also compare referral questions once they are stored per case.
export function examPrepStatus(
  refined: RefinedAnalysisResponse | null | undefined,
  steering: PhysicianSteeringResponse | null | undefined,
  visit?: VisitDocumentationResponse | null,
): ExamPrepStatus {
  if (!steering?.id) return { kind: "needs-steering" };
  if (!refined?.analysis) return { kind: "not-generated" };
  const { basedOn } = refined.inputSnapshot;
  const reasons: string[] = [];
  if (basedOn.preExamAnalysisUpdatedAt !== steering.steering.preExamAnalysisUpdatedAt)
    reasons.push("analysis re-run");
  else if (basedOn.physicianSteeringRevision !== steering.revision)
    reasons.push(`steering changed, rev ${basedOn.physicianSteeringRevision} → ${steering.revision}`);
  if (rejectedDiagnoses(visit, refined).length)
    reasons.push("diagnosis rejected at visit");
  return reasons.length ? { kind: "stale", reasons } : { kind: "current" };
}

// Run exam prep (3B) on the region's saved steering.
// Referral questions are carried over from the region's last exam prep until they are stored per case.
export const generateExamPrep = (
  caseId: string,
  region: Region,
  previous: RefinedAnalysisResponse | null | undefined,
) => generateRefinedAnalysis(caseId, region, previous?.inputSnapshot.input.referralQuestions ?? []);

// Exam prep status for every region. Non-suspense so the cockpit shell doesn't wait on it.
export function useExamPrep(caseId: string, regions: Region[]) {
  const preExam = useQueries({
    queries: regions.map((r) => preExamAnalysisQueryOptions(caseId, r)),
  });
  const steering = useQueries({
    queries: regions.map((r, i) => ({
      ...physicianSteeringQueryOptions(caseId, r, preExam[i].data?.updatedAt),
      enabled: Boolean(preExam[i].data?.analysis),
    })),
  });
  const refined = useQueries({
    queries: regions.map((r) => refinedAnalysisQueryOptions(caseId, r)),
  });
  const visit = useQuery(visitQueryOptions(caseId));
  const isPending =
    preExam.some((q) => q.isPending) ||
    refined.some((q) => q.isPending) ||
    steering.some((q, i) => preExam[i].data?.analysis && q.isPending) ||
    visit.isPending;

  return {
    isPending,
    regions: regions.map((region, i) => {
      const saved = savedSteeringFor(preExam[i].data, steering[i].data);
      const rows = preExam[i].data?.analysis?.treatmentAnalysis;
      return {
        region,
        refined: refined[i].data ?? null,
        status: examPrepStatus(refined[i].data, saved, visit.data),
        analysisRun: Boolean(rows),
        // Same count as the Analysis region tab: treatments without a saved disposition.
        unreviewed: rows?.filter((row) => !saved?.steering.treatments[row.id]?.disposition).length ?? 0,
        rejected: rejectedDiagnoses(visit.data, refined[i].data).length > 0,
      };
    }),
  };
}

export type RegionWorkflow = ReturnType<typeof useExamPrep>["regions"][number];

export type NextStep = { message: string; tab: "analysis" | "exam-prep"; region: Region };

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// First outstanding step across regions, in workflow order. Null once exam prep is current everywhere.
// TODO: add visit / post-exam steps once MMI & Report exists.
export function nextStep(regions: RegionWorkflow[]): NextStep | null {
  const rules: [(r: RegionWorkflow) => boolean, (r: RegionWorkflow) => NextStep][] = [
    [(r) => r.rejected, (r) => ({ message: `Diagnosis rejected at visit (${regionLabel(r.region)}) — update Analysis and regenerate exam prep.`, tab: "analysis", region: r.region })],
    [(r) => !r.analysisRun, (r) => ({ message: `Analysis not run yet (${regionLabel(r.region)}).`, tab: "analysis", region: r.region })],
    [(r) => r.unreviewed > 0, (r) => ({ message: `${r.unreviewed} treatment${r.unreviewed === 1 ? "" : "s"} still unreviewed in Analysis (${regionLabel(r.region)}).`, tab: "analysis", region: r.region })],
    [(r) => r.status.kind !== "current", (r) => ({ message: `Exam prep ${r.status.kind === "stale" ? "out of date" : "not generated"} (${regionLabel(r.region)}).`, tab: "exam-prep", region: r.region })],
  ];
  for (const [applies, step] of rules) {
    const region = regions.find(applies);
    if (region) return step(region);
  }
  return null;
}
