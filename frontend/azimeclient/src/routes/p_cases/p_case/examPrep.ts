import { useQueries, useQuery } from "@tanstack/react-query";
import {
  currentDiagnoses,
  isRowReviewed,
  scopedRows,
  steeringMatchesAnalysis,
  supportedRegions,
  type PhysicianSteering,
  type PhysicianSteeringResponse,
  type PreExamAnalysisResponse,
  type RefinedAnalysisResponse,
  type Region,
  type RegionDiagnosesResponse,
  type VisitDocumentation,
} from "@azime/contracts";
import {
  physicianSteeringQueryOptions,
  preExamAnalysisQueryOptions,
  refinedAnalysisQueryOptions,
  regionDiagnosesQueryOptions,
  visitQueryOptions,
} from "../../cases/queries";

// New visits start with these headings; an untouched template counts as an empty note.
export const NOTE_TEMPLATE = "Chief complaint:\n\nHPI:\n\nPMH:\n\nSubjective:\n\nObjective:\n\nImages personally reviewed:\n";

// What the visit still needs before the post-exam analysis can use it.
export const visitBlocker = (visit: VisitDocumentation | undefined) =>
  !visit
    ? "Save the visit"
    : visit.note.trim() === "" || visit.note.trim() === NOTE_TEMPLATE.trim()
      ? "Add a visit note"
      : visit.pdqId === null
        ? "Select a PDQ in the visit"
        : null;

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

export { isRowReviewed, scopedRows } from "@azime/contracts";

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
  const visit = useQuery(visitQueryOptions(caseId));
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
    diagnoses.some((q) => q.isPending) ||
    visit.isPending;

  return {
    isPending,
    // A saved visit switches Analysis from optional prep to finishing the assessment.
    visitSaved: Boolean(visit.data),
    regions: regions.map((region, i) => {
      const saved = savedSteeringFor(preExam[i].data, steering[i].data);
      const analyzed = preExam[i].data?.analysis?.treatmentAnalysis;
      const listed = (diagnoses[i].data?.diagnoses ?? []).map((d) => d.canonicalDx);
      const rows = analyzed && scopedRows(analyzed, listed);
      // After the visit the sheet is a record of what was prepared, so later edits
      // (most review happens then) don't mark it out of date.
      const status = examPrepStatus(refined[i].data, saved, diagnoses[i].data, preExam[i].data?.analyzedDiagnoses ?? []);
      return {
        region,
        refined: refined[i].data ?? null,
        diagnoses: diagnoses[i].data ?? null,
        status: visit.data && status.kind === "stale" ? { kind: "current" as const } : status,
        analysisRun: Boolean(rows),
        // Listed diagnoses the treatment analysis doesn't cover yet.
        needsAnalysis: listed.filter(
          (dx) => !preExam[i].data?.analyzedDiagnoses.includes(dx),
        ),
        // Update sheet needs saved steering for the current 3A run.
        steeringSaved: Boolean(saved),
        undecided: (diagnoses[i].data?.diagnoses ?? []).filter((d) => d.status === "working").length,
        // Same count as the Analysis region tab, from saved steering.
        unreviewed: rows?.filter((row) => !isRowReviewed(row, saved?.steering.treatments[row.id])).length ?? 0,
      };
    }),
  };
}

export type RegionWorkflow = ReturnType<typeof useExamPrep>["regions"][number];

export type NextStep = { message: string; region: Region };

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// First outstanding Analysis step across regions. Before the visit, review is optional and
// the prep sheet is only suggested; after it, the assessment must be finished for pass 4.
export function nextStep(regions: RegionWorkflow[], visitSaved: boolean): NextStep | null {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const rules: [(r: RegionWorkflow) => boolean, (r: RegionWorkflow) => NextStep][] = [
    [(r) => !r.analysisRun, (r) => ({ message: `Analysis not run yet (${regionLabel(r.region)}).`, region: r.region })],
    [(r) => r.needsAnalysis.length > 0, (r) => ({ message: `Treatment analysis needed for ${plural(r.needsAnalysis.length, "added diagnosis", "added diagnoses")} (${regionLabel(r.region)}).`, region: r.region })],
    ...(visitSaved
      ? ([
          [(r) => r.undecided > 0, (r) => ({ message: `Decide ${plural(r.undecided, "diagnosis", "diagnoses")} (${regionLabel(r.region)}) before the post-exam analysis.`, region: r.region })],
          [(r) => r.unreviewed > 0, (r) => ({ message: `${plural(r.unreviewed, "treatment", "treatments")} still unreviewed (${regionLabel(r.region)}) before the post-exam analysis.`, region: r.region })],
        ] as typeof rules)
      : ([
          [(r) => !r.refined, (r) => ({ message: `Optional: create the prep sheet (${regionLabel(r.region)}), or go to Visit.`, region: r.region })],
        ] as typeof rules)),
  ];
  for (const [applies, step] of rules) {
    const region = regions.find(applies);
    if (region) return step(region);
  }
  return null;
}
