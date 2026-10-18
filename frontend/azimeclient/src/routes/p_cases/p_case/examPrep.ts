import { useQueries } from "@tanstack/react-query";
import {
  currentDiagnoses,
  steeringMatchesAnalysis,
  supportedRegions,
  type PhysicianSteering,
  type PhysicianSteeringResponse,
  type PreExamAnalysisResponse,
  type RefinedAnalysisResponse,
  type Region,
  type RegionDiagnosesResponse,
} from "@azime/contracts";
import {
  physicianSteeringQueryOptions,
  preExamAnalysisQueryOptions,
  refinedAnalysisQueryOptions,
  regionDiagnosesQueryOptions,
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

// Treatment rows narrowed to the given diagnoses: assessments for other diagnoses are
// hidden (their steering is kept), and rows left with none are dropped.
export const scopedRows = <T extends { assessments: { canonicalDx: string }[] }>(
  rows: T[],
  current: string[],
) =>
  rows.flatMap((row) => {
    const assessments = row.assessments.filter((a) => current.includes(a.canonicalDx));
    return row.assessments.length && !assessments.length ? [] : [{ ...row, assessments }];
  });

// Order-insensitive, ignoring undefined and empty entries, so undoing an edit counts as no change.
const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value)
    .map(([key, v]) => [key, normalize(v)] as const)
    .filter(([, v]) => v !== undefined && !(v && typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length))
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
};
export const sameSteering = (a: PhysicianSteering, b: PhysicianSteering) =>
  JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

// The prep sheet is stale when updating it would change its input: a different 3A run,
// different saved steering, or a different set of diagnoses in scope. Contents are
// compared, not revisions, so an edit that is saved and then undone is not stale.
// Stale is information only: nothing downstream waits on exam prep.
export function examPrepStatus(
  refined: RefinedAnalysisResponse | null | undefined,
  steering: PhysicianSteeringResponse | null | undefined,
  diagnoses: RegionDiagnosesResponse | null | undefined,
  analyzedDiagnoses: string[],
): ExamPrepStatus {
  if (!refined?.analysis)
    return steering?.id ? { kind: "not-generated" } : { kind: "needs-steering" };
  const { basedOn, physicianSteering, input } = refined.inputSnapshot;
  const reasons: string[] = [];
  // Saved steering only exists for the current 3A run, so none means 3A was re-run.
  if (!steering?.id || basedOn.preExamAnalysisUpdatedAt !== steering.steering.preExamAnalysisUpdatedAt)
    reasons.push("analysis re-run");
  else if (
    physicianSteering
      ? !sameSteering(physicianSteering, steering.steering)
      : basedOn.physicianSteeringRevision !== steering.revision
  )
    reasons.push("steering changed");
  // Same scope rule as the 3B builder: analyzed diagnoses that are still current.
  const current = currentDiagnoses(diagnoses?.diagnoses ?? []);
  if (diagnoses && !sameSet(input.scope.diagnoses, analyzedDiagnoses.filter((dx) => current.includes(dx))))
    reasons.push("diagnoses changed");
  return reasons.length ? { kind: "stale", reasons } : { kind: "current" };
}

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
  const diagnoses = useQueries({
    queries: regions.map((r) => regionDiagnosesQueryOptions(caseId, r)),
  });
  const isPending =
    preExam.some((q) => q.isPending) ||
    refined.some((q) => q.isPending) ||
    steering.some((q, i) => preExam[i].data?.analysis && q.isPending) ||
    diagnoses.some((q) => q.isPending);

  return {
    isPending,
    regions: regions.map((region, i) => {
      const saved = savedSteeringFor(preExam[i].data, steering[i].data);
      const analyzed = preExam[i].data?.analysis?.treatmentAnalysis;
      const listed = (diagnoses[i].data?.diagnoses ?? []).map((d) => d.canonicalDx);
      const rows = analyzed && scopedRows(analyzed, listed);
      return {
        region,
        refined: refined[i].data ?? null,
        diagnoses: diagnoses[i].data ?? null,
        status: examPrepStatus(refined[i].data, saved, diagnoses[i].data, preExam[i].data?.analyzedDiagnoses ?? []),
        analysisRun: Boolean(rows),
        // Listed diagnoses the treatment analysis doesn't cover yet.
        needsAnalysis: listed.filter(
          (dx) => !preExam[i].data?.analyzedDiagnoses.includes(dx),
        ),
        // Update sheet needs saved steering for the current 3A run.
        steeringSaved: Boolean(saved),
        // Same count as the Analysis region tab: treatments without a saved disposition.
        unreviewed: rows?.filter((row) => !saved?.steering.treatments[row.id]?.disposition).length ?? 0,
      };
    }),
  };
}

export type RegionWorkflow = ReturnType<typeof useExamPrep>["regions"][number];

export type NextStep = { message: string; region: Region };

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// First outstanding Analysis step across regions. The prep sheet is optional, so it is never a next step.
// TODO: add visit / post-exam steps once MMI & Report exists.
export function nextStep(regions: RegionWorkflow[]): NextStep | null {
  const rules: [(r: RegionWorkflow) => boolean, (r: RegionWorkflow) => NextStep][] = [
    [(r) => !r.analysisRun, (r) => ({ message: `Analysis not run yet (${regionLabel(r.region)}).`, region: r.region })],
    [(r) => r.needsAnalysis.length > 0, (r) => ({ message: `Treatment analysis needed for ${r.needsAnalysis.length} added diagnos${r.needsAnalysis.length === 1 ? "is" : "es"} (${regionLabel(r.region)}).`, region: r.region })],
    [(r) => r.unreviewed > 0, (r) => ({ message: `${r.unreviewed} treatment${r.unreviewed === 1 ? "" : "s"} still unreviewed in Analysis (${regionLabel(r.region)}).`, region: r.region })],
  ];
  for (const [applies, step] of rules) {
    const region = regions.find(applies);
    if (region) return step(region);
  }
  return null;
}
