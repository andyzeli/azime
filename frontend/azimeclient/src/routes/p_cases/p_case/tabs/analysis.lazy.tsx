import { Suspense, useState } from "react";
import { createLazyRoute, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import {
  initializePhysicianSteering,
  supportedRegions,
  type CanonicalDiagnosis,
  type CaseSummaryCardResponse,
  type PhysicianSteering,
  type PreExamAnalysisResponse,
  type Region,
  type StoredPreExamAnalysis,
  type VisitDocumentationResponse,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  canonicalDiagnosesQueryOptions,
  caseQueryOptions,
  caseSummaryCardQueryOptions,
  generatePreExamAnalysis,
  physicianSteeringQueryOptions,
  preExamAnalysisQueryOptions,
  preExamSnapshotQueryOptions,
  recordsQueryOptions,
  refinedAnalysisQueryOptions,
  savePhysicianSteering,
  takePreExamSnapshot,
  visitQueryOptions,
} from "../../../cases/queries";
import { RecordDrawer } from "../components/RecordDetail";
import { Badge, Btn, Cite, Segmented } from "../components/shared";
import {
  examPrepStatus,
  generateExamPrep,
  rejectedDiagnoses,
  savedSteeringFor,
  type ExamPrepStatus,
} from "../examPrep";
import { toTimeline, type TimelineEvent } from "../recordPresentation";

type TreatmentRow = StoredPreExamAnalysis["treatmentAnalysis"][number];
type AiAssessment = TreatmentRow["assessments"][number];
type Applicability = AiAssessment["aiApplicability"];
type Adequacy = AiAssessment["aiAdequacy"];
type RowSteering = PhysicianSteering["treatments"][string];
type AssessmentSteering = NonNullable<RowSteering["assessments"]>[string];
type Card = CaseSummaryCardResponse | undefined;
type StoredWithAnalysis = PreExamAnalysisResponse & {
  analysis: StoredPreExamAnalysis;
};

const applicabilityLabel: Record<Applicability, string> = {
  applicable: "Applicable",
  not_applicable: "Not applicable",
  contraIndicated: "Contraindicated",
  unclear: "Unclear",
};
const adequacyLabel: Record<Adequacy, string> = {
  adequately_trialed: "Adequate",
  inadequately_trialed: "Inadequate",
  not_tried: "Not tried",
  patient_declined: "Patient declined",
  unclear: "Unclear",
};
const chipTone: Record<Applicability | Adequacy, string> = {
  applicable: "bg-green-50 border-green-200 text-green-800",
  adequately_trialed: "bg-green-50 border-green-200 text-green-800",
  not_applicable: "bg-red-50 border-red-200 text-red-800",
  contraIndicated: "bg-red-50 border-red-200 text-red-800",
  inadequately_trialed: "bg-amber-50 border-amber-200 text-amber-800",
  unclear: "bg-amber-50 border-amber-200 text-amber-800",
  not_tried: "bg-slate-50 border-slate-200 text-slate-600",
  patient_declined: "bg-sky-50 border-sky-200 text-sky-800",
};

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// redaxios rejects with the response; the backend sends { error } bodies.
const apiErrorMessage = (error: unknown) =>
  (error as { data?: { error?: string } } | null)?.data?.error ??
  "Request failed";

const isTried = (row: TreatmentRow) =>
  row.recordStatus !== "Not Documented" && row.recordStatus !== "To Be Started";

// Episode ids end with the id of their first record, e.g. "therapy:3:41".
const episodeKind: Record<string, string> = {
  therapy: "Therapy",
  chiropractic: "Chiro",
  intervention: "Injection",
  surgery: "Surgery",
};

type Lookups = {
  dxLabel: (canonicalDx: string) => string;
  events: Map<string, TimelineEvent>;
};

function Tab() {
  const { caseId } = Route.useParams();
  const { record, region: regionParam } = Route.useSearch();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { data: records } = useSuspenseQuery(recordsQueryOptions(caseId));
  const card = useQuery(caseSummaryCardQueryOptions(caseId)).data;
  const visit = useQuery(visitQueryOptions(caseId)).data;
  const regions = patientCase.regions;
  const region =
    regionParam && regions.includes(regionParam) ? regionParam : regions[0];

  const preExamQueries = useQueries({
    queries: regions.map((r) => preExamAnalysisQueryOptions(caseId, r)),
  });
  const refinedQueries = useQueries({
    queries: regions.map((r) => refinedAnalysisQueryOptions(caseId, r)),
  });
  const steeringQueries = useQueries({
    queries: regions.map((r, i) => ({
      ...physicianSteeringQueryOptions(
        caseId,
        r,
        preExamQueries[i].data?.updatedAt
      ),
      enabled: Boolean(preExamQueries[i].data?.analysis),
    })),
  });

  const labels = new Map(
    card?.diagnoses.map((dx) => [dx.canonicalDx, dx.label])
  );
  const lookups: Lookups = {
    dxLabel: (dx) => (labels.get(dx) ?? dx).replace(/_/g, " "),
    events: new Map(toTimeline(records).map((event) => [event.id, event])),
  };

  if (!region) {
    return (
      <main className="grid flex-1 place-items-center text-slate-500">
        Add body regions to the case to run the analysis.
      </main>
    );
  }

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="px-5 pt-4">
          <div className="flex gap-1 border-b border-slate-200">
            {regions.map((r, i) => {
              const stored = preExamQueries[i].data;
              const saved = savedSteeringFor(stored, steeringQueries[i].data);
              const rows = stored?.analysis?.treatmentAnalysis ?? [];
              const reviewed = rows.filter(
                (row) => saved?.steering.treatments[row.id]?.disposition
              ).length;
              const rejected =
                rejectedDiagnoses(visit, refinedQueries[i].data).length > 0;
              return (
                <Link
                  key={r}
                  from="/p_cases/$caseId/analysis"
                  search={(prev) => ({ ...prev, region: r })}
                  className={cn(
                    "-mb-px flex items-center gap-2 rounded-t-lg border border-b-0 border-transparent px-4 py-2 text-[13px] font-semibold text-slate-600",
                    r === region && "border-slate-200 bg-white text-slate-900"
                  )}
                >
                  {regionLabel(r)}
                  {stored?.analysis ? (
                    <Badge className="bg-blue-100 text-blue-700">
                      {reviewed} / {rows.length} reviewed
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500">
                      not run
                    </Badge>
                  )}
                  {rejected ? (
                    <Badge className="bg-amber-100 text-amber-800">
                      dx rejected at visit
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
        <Suspense
          fallback={<p className="p-5 text-slate-500">Loading analysis…</p>}
        >
          <RegionAnalysis
            key={region}
            caseId={caseId}
            region={region}
            card={card}
            visit={visit}
            lookups={lookups}
          />
        </Suspense>
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}

function RegionAnalysis({
  caseId,
  region,
  card,
  visit,
  lookups: caseLookups,
}: {
  caseId: string;
  region: Region;
  card: Card;
  visit: VisitDocumentationResponse | null | undefined;
  lookups: Lookups;
}) {
  const queryClient = useQueryClient();
  const canonical = useQuery(canonicalDiagnosesQueryOptions(region)).data ?? [];
  const lookups: Lookups = {
    ...caseLookups,
    dxLabel: (dx) =>
      canonical.find((d) => d.canonicalDx === dx)?.label ??
      caseLookups.dxLabel(dx),
  };
  const { data: stored } = useSuspenseQuery(
    preExamAnalysisQueryOptions(caseId, region)
  );
  const { data: snapshotResponse } = useSuspenseQuery(
    preExamSnapshotQueryOptions(caseId, region)
  );
  const snapshot = snapshotResponse.inputSnapshot;
  const availableDiagnoses = snapshotResponse.availableDiagnoses;
  // Before the first snapshot every diagnosis found in the records is in scope.
  const scopeDiagnoses = snapshot?.scope.diagnoses ?? availableDiagnoses;
  // null follows the latest snapshot's scope.
  const [selectedDraft, setSelectedDraft] = useState<string[] | null>(null);
  const selectedDx = selectedDraft ?? scopeDiagnoses;
  // Diagnoses added by the physician stay listed even when unchecked.
  const [added, setAdded] = useState<string[]>([]);
  const shownDiagnoses = [
    ...new Set([
      ...availableDiagnoses,
      ...(snapshot?.scope.diagnoses ?? []),
      ...added,
    ]),
  ];
  const refined = useQuery(refinedAnalysisQueryOptions(caseId, region)).data;
  const rejections = rejectedDiagnoses(visit, refined);

  const invalidate = () => {
    setSelectedDraft(null);
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: preExamAnalysisQueryOptions(caseId, region).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: preExamSnapshotQueryOptions(caseId, region).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: ["physicianSteering", { caseId, region }],
      }),
    ]);
  };
  const snapshotMutation = useMutation({
    mutationFn: () => takePreExamSnapshot(caseId, region, selectedDx),
    onSuccess: invalidate,
  });
  const analysisMutation = useMutation({
    mutationFn: () => generatePreExamAnalysis(caseId, region),
    onSuccess: invalidate,
  });

  const scopeChanged =
    snapshot !== null &&
    [...selectedDx].sort().join() !== [...scopeDiagnoses].sort().join();

  const takeSnapshot = () => {
    if (
      stored?.analysis &&
      !window.confirm(
        "A new snapshot clears this region's analysis and steering. Continue?"
      )
    )
      return;
    snapshotMutation.mutate();
  };
  const runAnalysis = () => {
    if (
      stored?.analysis &&
      !window.confirm(
        "Re-running the analysis replaces the treatment rows. Saved steering for this region will be discarded. Continue?"
      )
    )
      return;
    analysisMutation.mutate();
  };

  return (
    <>
      <div className="px-5">
        <SetupStrip
          stored={stored}
          card={card}
          lookups={lookups}
          scopeDiagnoses={scopeDiagnoses}
          shownDiagnoses={shownDiagnoses}
          addable={canonical.filter(
            (d) => !shownDiagnoses.includes(d.canonicalDx)
          )}
          onAddDx={(dx) => {
            setAdded((a) => [...a, dx]);
            setSelectedDraft([...selectedDx, dx]);
          }}
          hasSnapshot={snapshot !== null}
          selectedDx={selectedDx}
          onToggleDx={(dx) =>
            setSelectedDraft(
              selectedDx.includes(dx)
                ? selectedDx.filter((d) => d !== dx)
                : [...selectedDx, dx]
            )
          }
          scopeChanged={scopeChanged}
          snapshotPending={snapshotMutation.isPending}
          analysisPending={analysisMutation.isPending}
          onSnapshot={takeSnapshot}
          onRun={runAnalysis}
        />
        {rejections.length ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
            <b>Diagnosis rejected at the visit:</b>{" "}
            {rejections.map((r, i) => (
              <span key={r.canonicalDx}>
                {i > 0 ? "; " : ""}
                {lookups.dxLabel(r.canonicalDx)}
                {r.note ? <i> — "{r.note}"</i> : null}
              </span>
            ))}
            . Correct the diagnoses above, take a new snapshot and re-run the
            analysis, then review and regenerate exam prep. The visit is kept.
          </div>
        ) : null}
        {snapshotMutation.isError ? (
          <p className="mt-2 text-red-700">
            Snapshot failed: {apiErrorMessage(snapshotMutation.error)}
          </p>
        ) : null}
        {analysisMutation.isError ? (
          <p className="mt-2 text-red-700">
            Analysis failed: {apiErrorMessage(analysisMutation.error)}
          </p>
        ) : null}
      </div>

      {stored?.analysis ? (
        <Suspense
          fallback={<p className="p-5 text-slate-500">Loading steering…</p>}
        >
          {/* Remount when the analysis run changes so drafts reset. */}
          <AnalysisReview
            key={stored.updatedAt}
            caseId={caseId}
            region={region}
            stored={stored as StoredWithAnalysis}
            visit={visit}
            lookups={lookups}
          />
        </Suspense>
      ) : (
        <div className="m-5 grid flex-1 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <div>
            <div className="text-[15px] font-semibold text-slate-700">
              No analysis for {regionLabel(region)} yet
            </div>
            <p className="mt-1">
              Choose diagnoses, take a snapshot, then run the analysis.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function AnalysisReview({
  caseId,
  region,
  stored,
  visit,
  lookups,
}: {
  caseId: string;
  region: Region;
  stored: StoredWithAnalysis;
  visit: VisitDocumentationResponse | null | undefined;
  lookups: Lookups;
}) {
  const queryClient = useQueryClient();
  const steeringOptions = physicianSteeringQueryOptions(
    caseId,
    region,
    stored.updatedAt
  );
  const refinedOptions = refinedAnalysisQueryOptions(caseId, region);
  const { data: steeringResponse } = useSuspenseQuery(steeringOptions);
  const { data: refined } = useSuspenseQuery(refinedOptions);
  const saved = savedSteeringFor(stored, steeringResponse);
  const revision = steeringResponse?.revision ?? 0;

  // The last saved steering (or a fresh draft). Undoing an edit makes the draft equal again.
  const baseline = initializePhysicianSteering(stored, saved?.steering);
  const [draft, setDraft] = useState<PhysicianSteering>(baseline);
  const dirty = !sameSteering(draft, baseline);
  // Bumped on discard so rows drop their local "override pending" state.
  const [resetCount, setResetCount] = useState(0);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "unreviewed" | "pruned">("all");

  const edit = (fn: (d: PhysicianSteering) => PhysicianSteering) => setDraft(fn);
  const discard = () => {
    setDraft(baseline);
    setResetCount((n) => n + 1);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      savePhysicianSteering(caseId, region, {
        steering: draft,
        expectedRevision: revision,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(steeringOptions.queryKey, response);
    },
  });
  // One click for the physician: save steering, snapshot it, and generate exam prep.
  const examPrepMutation = useMutation({
    mutationFn: async () => {
      if (dirty || !saved) await saveMutation.mutateAsync();
      return generateExamPrep(caseId, region, refined);
    },
    onSuccess: (result) =>
      queryClient.setQueryData(refinedOptions.queryKey, result),
  });

  const rows = stored.analysis.treatmentAnalysis;
  const reviewedCount = rows.filter(
    (row) => draft.treatments[row.id]?.disposition
  ).length;
  const prunedCount = rows.filter(
    (row) => draft.treatments[row.id]?.disposition === "prune"
  ).length;
  const prepStatus = examPrepStatus(refined, saved, visit);
  const prepCurrent =
    prepStatus.kind === "current" && !dirty && !examPrepMutation.isPending;
  const missingRationale = Object.values(draft.treatments).some((row) =>
    Object.values(row.assessments ?? {}).some(
      (a) =>
        (a.applicability?.action === "override" &&
          !a.applicability.rationale.trim()) ||
        (a.adequacy?.action === "override" && !a.adequacy.rationale.trim())
    )
  );
  const busy = saveMutation.isPending || examPrepMutation.isPending;

  const generateExamPrepClick = () => {
    const unreviewed = rows.length - reviewedCount;
    if (
      unreviewed > 0 &&
      !window.confirm(
        `${unreviewed} treatments are unreviewed. Generate exam prep anyway?`
      )
    )
      return;
    examPrepMutation.mutate();
  };

  const setRow = (id: string, fn: (row: RowSteering) => RowSteering) =>
    edit((d) => ({
      ...d,
      treatments: { ...d.treatments, [id]: fn(d.treatments[id] ?? {}) },
    }));

  const visibleRows = rows.filter((row) => {
    const disposition = draft.treatments[row.id]?.disposition;
    if (filter === "unreviewed") return !disposition;
    if (filter === "pruned") return disposition === "prune";
    return true;
  });
  const groups: [string, TreatmentRow[]][] = [
    ["TRIED", visibleRows.filter(isTried)],
    ["NOT TRIED", visibleRows.filter((row) => !isTried(row))],
  ];

  return (
    <>
      <div className="grid flex-1 grid-cols-[1fr_340px] items-start gap-4 px-5 py-4">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
            <h2 className="text-[13.5px] font-semibold">Treatment analysis</h2>
            <span className="text-[11px] text-slate-500">
              AI assessment per diagnosis · agree, override, or prune each
              treatment
            </span>
            <span className="flex-1" />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All ${rows.length}` },
                {
                  value: "unreviewed",
                  label: `Unreviewed ${rows.length - reviewedCount}`,
                },
                { value: "pruned", label: `Pruned ${prunedCount}` },
              ]}
            />
          </div>
          <div
            className={cn(
              gridCols,
              "border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10.5px] font-bold tracking-[.05em] text-slate-500"
            )}
          >
            <span />
            <span>TREATMENT</span>
            <span>IN RECORDS</span>
            <span>AI ASSESSMENT · APPLICABLE / ADEQUATE</span>
            <span>DECISION</span>
          </div>
          {groups.map(([label, group]) =>
            group.length ? (
              <div key={label}>
                <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-[11px] font-bold tracking-[.04em] text-slate-700">
                  {label}
                </div>
                {group.map((row) => (
                  <TreatmentRowView
                    key={`${row.id}:${resetCount}`}
                    row={row}
                    lookups={lookups}
                    steering={draft.treatments[row.id] ?? {}}
                    expanded={expanded.includes(row.id)}
                    onExpand={() =>
                      setExpanded((e) =>
                        e.includes(row.id) ? e : [...e, row.id]
                      )
                    }
                    onToggleExpanded={() =>
                      setExpanded((e) =>
                        e.includes(row.id)
                          ? e.filter((id) => id !== row.id)
                          : [...e, row.id]
                      )
                    }
                    onChange={(fn) => setRow(row.id, fn)}
                  />
                ))}
              </div>
            ) : null
          )}
          {!visibleRows.length ? (
            <p className="p-6 text-center text-slate-500">Nothing here.</p>
          ) : null}
        </section>

        <div className="flex flex-col gap-3.5">
          <FindingsCard
            title="Inconsistencies"
            badgeClassName="bg-red-100 text-red-700"
            items={stored.analysis.inconsistencies.map((f) => ({
              id: f.id,
              body: (
                <>
                  <Badge className="mr-1 rounded bg-slate-100 text-slate-600">
                    {f.type}
                  </Badge>
                  {f.description}
                </>
              ),
            }))}
            dispositions={draft.inconsistencies}
            onChange={(id, value) =>
              edit((d) => ({
                ...d,
                inconsistencies: { ...d.inconsistencies, [id]: value },
              }))
            }
          />
          <FindingsCard
            title="Evidence gaps"
            badgeClassName="bg-amber-100 text-amber-800"
            items={stored.analysis.evidenceGaps.map((g) => ({
              id: g.id,
              body: (
                <>
                  <b>{g.gap}</b> {g.significance}
                </>
              ),
            }))}
            dispositions={draft.evidenceGaps}
            onChange={(id, value) =>
              edit((d) => ({
                ...d,
                evidenceGaps: { ...d.evidenceGaps, [id]: value },
              }))
            }
          />
          <section className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <h2 className="mb-2 text-[13.5px] font-semibold">
              Notes for exam prep
            </h2>
            <textarea
              value={draft.notes ?? ""}
              onChange={(e) =>
                edit((d) => ({ ...d, notes: e.target.value || null }))
              }
              placeholder="What should exam prep focus on?"
              className="h-20 w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-[12.5px] outline-none focus:border-blue-400"
            />
          </section>
        </div>
      </div>

      <footer className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-6px_16px_rgba(15,23,42,.05)]">
        <div className="h-1.5 w-44 overflow-hidden rounded bg-slate-200">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${rows.length ? (reviewedCount / rows.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="text-[11px] text-slate-500">
          <b className="text-slate-900">
            {reviewedCount} of {rows.length}
          </b>{" "}
          treatments reviewed
          {rows.length - reviewedCount
            ? ` · ${rows.length - reviewedCount} unreviewed`
            : ""}
        </span>
        <span className="flex-1" />
        {saveMutation.isError || examPrepMutation.isError ? (
          <span className="text-[11px] font-semibold text-red-700">
            {apiErrorMessage(saveMutation.error ?? examPrepMutation.error)}
          </span>
        ) : missingRationale ? (
          <span className="text-[11px] font-semibold text-violet-700">
            Add a rationale to each override
          </span>
        ) : null}
        <span className="text-[11px] text-slate-500">
          {saveMutation.isPending
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : saved
                ? "Saved"
                : "Not saved"}{" "}
          · rev {revision}
        </span>
        <ExamPrepState
          status={prepStatus}
          dirty={dirty}
          pending={examPrepMutation.isPending}
        />
        {dirty ? (
          <Btn disabled={busy} onClick={discard}>
            Discard changes
          </Btn>
        ) : null}
        <Btn
          disabled={!dirty || busy || missingRationale}
          onClick={() => saveMutation.mutate()}
        >
          Save steering
        </Btn>
        {prepCurrent ? (
          // Nothing to regenerate: send the physician to the result instead.
          <Link
            to="/p_cases/$caseId/exam-prep"
            params={{ caseId }}
            className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            View exam prep →
          </Link>
        ) : (
          <Btn
            variant="primary"
            disabled={busy || missingRationale}
            onClick={generateExamPrepClick}
          >
            {examPrepMutation.isPending
              ? "Generating exam prep…"
              : "Save & generate exam prep →"}
          </Btn>
        )}
      </footer>
    </>
  );
}

function ExamPrepState({
  status,
  dirty,
  pending,
}: {
  status: ExamPrepStatus;
  dirty: boolean;
  pending: boolean;
}) {
  if (pending) return null;
  const stale = status.kind === "stale" || (status.kind === "current" && dirty);
  return (
    <span className="border-l border-slate-200 pl-3 text-[11px]">
      {status.kind === "current" && !dirty ? (
        <span className="text-green-700">Exam prep up to date</span>
      ) : stale ? (
        <span className="font-semibold text-amber-700">
          Exam prep out of date
        </span>
      ) : (
        <span className="text-slate-500">No exam prep yet</span>
      )}
    </span>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
      {n}
    </span>
  );
}

function SetupStrip({
  stored,
  card,
  lookups,
  scopeDiagnoses,
  shownDiagnoses,
  addable,
  onAddDx,
  hasSnapshot,
  selectedDx,
  onToggleDx,
  scopeChanged,
  snapshotPending,
  analysisPending,
  onSnapshot,
  onRun,
}: {
  stored: PreExamAnalysisResponse | null;
  card: Card;
  lookups: Lookups;
  scopeDiagnoses: string[];
  shownDiagnoses: string[];
  addable: CanonicalDiagnosis[];
  onAddDx: (dx: string) => void;
  hasSnapshot: boolean;
  selectedDx: string[];
  onToggleDx: (dx: string) => void;
  scopeChanged: boolean;
  snapshotPending: boolean;
  analysisPending: boolean;
  onSnapshot: () => void;
  onRun: () => void;
}) {
  const busy = snapshotPending || analysisPending;
  const [adding, setAdding] = useState(false);
  // The stored row's updatedAt is bumped by both snapshot and analysis.
  const snapshotStatus = scopeChanged
    ? "Diagnoses changed — take a new snapshot"
    : !hasSnapshot
      ? "No snapshot yet"
      : stored?.analysis
        ? `${scopeDiagnoses.length} dx`
        : `${stored ? formatTime(stored.updatedAt) : "Taken"} · ${scopeDiagnoses.length} dx`;

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 py-3.5">
      <div>
        <div className="mb-2 flex items-center">
          <StepNum n={1} />
          <b>Diagnoses in scope</b>
          <span className="ml-2 text-[11px] text-slate-500">
            from records, or add one · each checked dx gets its own treatment
            ladder
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {shownDiagnoses.map((dx) => {
            const on = selectedDx.includes(dx);
            const codes =
              card?.diagnoses.find((d) => d.canonicalDx === dx)?.icdPrefixes ??
              [];
            return (
              <label
                key={dx}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]",
                  on
                    ? "border-blue-300 bg-blue-50/40"
                    : "border-slate-200 bg-white"
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleDx(dx)}
                  className="size-4 accent-blue-600"
                />
                {codes.length ? (
                  <Badge
                    className={cn(
                      "rounded",
                      on
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {codes.join(", ")}
                  </Badge>
                ) : null}
                {lookups.dxLabel(dx)}
              </label>
            );
          })}
          {adding ? (
            <select
              autoFocus
              value=""
              onChange={(e) => {
                onAddDx(e.target.value);
                setAdding(false);
              }}
              onBlur={() => setAdding(false)}
              className="rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-[12.5px]"
            >
              <option value="" disabled>
                Choose a diagnosis…
              </option>
              {addable.map((d) => (
                <option key={d.canonicalDx} value={d.canonicalDx}>
                  {d.label}
                  {d.icdPrefixes.length ? ` (${d.icdPrefixes.join(", ")})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              disabled={!addable.length}
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[12.5px] text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              <Plus className="size-3.5" /> add diagnosis
            </button>
          )}
        </div>
      </div>

      <div className="min-w-[420px] border-l border-slate-200 pl-4">
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <div className="flex items-center">
              <StepNum n={2} />
              <b>Snapshot</b>
            </div>
            <div
              className={cn(
                "ml-[26px] mt-1 text-[11px]",
                scopeChanged ? "font-semibold text-amber-700" : "text-slate-500"
              )}
            >
              {snapshotStatus}
            </div>
          </div>
          <Btn
            onClick={onSnapshot}
            disabled={!selectedDx.length || busy}
            className={cn(scopeChanged && "border-amber-400 bg-amber-50")}
          >
            {snapshotPending ? "Taking…" : "Take snapshot"}
          </Btn>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex-1">
            <div className="flex items-center">
              <StepNum n={3} />
              <b>Analysis</b>
            </div>
            <div className="ml-[26px] mt-1 text-[11px] text-slate-500">
              {stored?.analysis
                ? `Ran ${formatTime(stored.updatedAt)} · ${stored.analysis.treatmentAnalysis.length} treatments`
                : "Not run"}
            </div>
          </div>
          <Btn
            variant={stored?.analysis ? "default" : "primary"}
            onClick={onRun}
            disabled={!stored?.hasInputSnapshot || scopeChanged || busy}
          >
            {analysisPending
              ? "Running…"
              : stored?.analysis
                ? "Re-run analysis"
                : "Run analysis"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

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
const sameSteering = (a: PhysicianSteering, b: PhysicianSteering) =>
  JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

const gridCols = "grid grid-cols-[24px_1.2fr_1.05fr_1.5fr_190px] gap-3.5";

type Decision = "agree" | "override" | "prune";

const hasOverride = (steering: RowSteering) =>
  Object.values(steering.assessments ?? {}).some(
    (a) =>
      a.applicability?.action === "override" ||
      a.adequacy?.action === "override"
  );

// Every assessment on the row marked agree, optionally keeping existing overrides.
const agreeAll = (
  row: TreatmentRow,
  steering: RowSteering,
  keepOverrides: boolean
) =>
  Object.fromEntries(
    row.assessments.map(({ canonicalDx }) => {
      const current = steering.assessments?.[canonicalDx];
      return [
        canonicalDx,
        {
          applicability:
            keepOverrides && current?.applicability?.action === "override"
              ? current.applicability
              : { action: "agree" as const },
          adequacy:
            keepOverrides && current?.adequacy?.action === "override"
              ? current.adequacy
              : { action: "agree" as const },
        },
      ];
    })
  ) as RowSteering["assessments"];

function TreatmentRowView({
  row,
  lookups,
  steering,
  expanded,
  onExpand,
  onToggleExpanded,
  onChange,
}: {
  row: TreatmentRow;
  lookups: Lookups;
  steering: RowSteering;
  expanded: boolean;
  onExpand: () => void;
  onToggleExpanded: () => void;
  onChange: (fn: (row: RowSteering) => RowSteering) => void;
}) {
  // Override chosen but nothing overridden yet: the row stays unreviewed until it is.
  const [overridePending, setOverridePending] = useState(false);
  const overridden = hasOverride(steering);
  const pruned = steering.disposition === "prune";
  const decision: Decision | undefined = pruned
    ? "prune"
    : overridden || overridePending
      ? "override"
      : steering.disposition === "keep"
        ? "agree"
        : undefined;

  const choose = (next: Decision) => {
    setOverridePending(next === "override");
    if (next === "agree") {
      onChange((r) => ({
        ...r,
        disposition: "keep",
        assessments: agreeAll(row, r, false),
      }));
    } else if (next === "prune") {
      onChange((r) => ({ ...r, disposition: "prune" }));
    } else {
      onChange((r) => ({
        ...r,
        disposition: hasOverride(r) ? "keep" : undefined,
      }));
      onExpand();
    }
  };

  // Editing an assessment counts as reviewing the row; untouched assessments become agree.
  const setAssessment = (
    dx: string,
    fn: (a: AssessmentSteering) => AssessmentSteering
  ) =>
    onChange((r) => {
      const assessments = {
        ...agreeAll(row, r, true),
        [dx]: fn(r.assessments?.[dx] ?? {}),
      };
      return { ...r, disposition: r.disposition ?? "keep", assessments };
    });

  return (
    <div
      className={cn(
        gridCols,
        "items-start border-b border-slate-100 px-4 py-3",
        pruned && "bg-slate-50/70",
        expanded && "bg-indigo-50/20"
      )}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        className="pt-0.5 text-slate-400 hover:text-slate-800"
        aria-label="Toggle rationale"
      >
        {expanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
      <div>
        <span
          className={cn(
            "text-[13px] font-semibold",
            pruned && "text-slate-400 line-through"
          )}
        >
          {row.treatment}
        </span>
        {row.source !== "taxonomy" ? (
          <Badge
            className={cn(
              "ml-1.5 rounded",
              row.source === "ai"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {row.source === "ai" ? "AI suggested" : "record only"}
          </Badge>
        ) : null}
        {row.suggestionReasoning ? (
          <div className="mt-1 text-[11px] text-slate-500">
            why: {row.suggestionReasoning}
          </div>
        ) : null}
      </div>
      <div>
        <div className="text-xs font-semibold">{row.recordStatus}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {row.recordDetail ?? "—"}
        </div>
        {row.episodeIds.length ? (
          <div className="mt-1 flex flex-wrap gap-2 text-[11.5px]">
            {row.episodeIds.map((id) => (
              <EpisodeCite key={id} episodeId={id} events={lookups.events} />
            ))}
          </div>
        ) : null}
      </div>
      <div className={cn(pruned && "opacity-50")}>
        {row.assessments.map((a, i) => {
          const review = steering.assessments?.[a.canonicalDx];
          const app =
            review?.applicability?.action === "override"
              ? review.applicability.value
              : a.aiApplicability;
          const adq =
            review?.adequacy?.action === "override"
              ? review.adequacy.value
              : a.aiAdequacy;
          return (
            <div
              key={a.canonicalDx}
              className={cn(
                "grid grid-cols-[100px_auto_auto_1fr] items-center gap-1.5 py-0.5 text-[11.5px]",
                i > 0 && "mt-1 border-t border-dashed border-slate-200 pt-1.5"
              )}
            >
              <span className="text-[11px] font-semibold text-slate-500">
                {lookups.dxLabel(a.canonicalDx)}
              </span>
              <Chip
                value={app}
                label={applicabilityLabel[app]}
                overridden={review?.applicability?.action === "override"}
              />
              <Chip
                value={adq}
                label={adequacyLabel[adq]}
                overridden={review?.adequacy?.action === "override"}
              />
            </div>
          );
        })}
      </div>
      <div>
        <Segmented
          value={decision}
          onChange={choose}
          options={[
            {
              value: "agree",
              label: "Agree",
              activeClassName: "bg-green-100 text-green-700",
            },
            {
              value: "override",
              label: "Override",
              activeClassName: "bg-violet-100 text-violet-700",
            },
            {
              value: "prune",
              label: "Prune",
              activeClassName: "bg-red-100 text-red-700",
            },
          ]}
        />
        {decision === "override" && !overridden ? (
          <div className="mt-1 text-[11px] font-medium text-violet-600">
            choose what you disagree with ↓
          </div>
        ) : !decision ? (
          <div className="mt-1 text-[11px] text-slate-400">unreviewed</div>
        ) : null}
      </div>

      {expanded ? (
        <div
          className={cn(
            "col-span-4 col-start-2 mt-1 space-y-3 rounded-lg border bg-slate-50 p-3",
            decision === "override" ? "border-violet-200" : "border-slate-200"
          )}
        >
          {row.assessments.map((a) => (
            <AssessmentEditor
              key={a.canonicalDx}
              ai={a}
              dxLabel={lookups.dxLabel(a.canonicalDx)}
              review={steering.assessments?.[a.canonicalDx]}
              onChange={(fn) => setAssessment(a.canonicalDx, fn)}
            />
          ))}
          <input
            value={steering.note ?? ""}
            onChange={(e) =>
              onChange((r) => ({ ...r, note: e.target.value || undefined }))
            }
            placeholder="Row note (optional)"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </div>
      ) : null}
    </div>
  );
}

function EpisodeCite({
  episodeId,
  events,
}: {
  episodeId: string;
  events: Map<string, TimelineEvent>;
}) {
  const parts = episodeId.split(":");
  const recordId = parts.at(-1);
  const event = recordId ? events.get(recordId) : undefined;
  const kind = episodeKind[parts[0]] ?? parts[0];
  return (
    <Cite recordId={event?.id}>
      {event ? `${kind} ${event.date ?? ""}`.trim() : episodeId}
    </Cite>
  );
}

function Chip({
  value,
  label,
  overridden,
}: {
  value: Applicability | Adequacy;
  label: string;
  overridden?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold",
        chipTone[value],
        overridden && "outline outline-2 outline-offset-1 outline-violet-500"
      )}
    >
      {label}
      {overridden ? <Pencil className="size-2.5" /> : null}
    </span>
  );
}

// One diagnosis: AI rationale on the left, physician agree/override on the right.
function AssessmentEditor({
  ai,
  dxLabel,
  review,
  onChange,
}: {
  ai: AiAssessment;
  dxLabel: string;
  review: AssessmentSteering | undefined;
  onChange: (fn: (a: AssessmentSteering) => AssessmentSteering) => void;
}) {
  const appOverride =
    review?.applicability?.action === "override" ? review.applicability : null;
  const adqOverride =
    review?.adequacy?.action === "override" ? review.adequacy : null;
  // One rationale per diagnosis, stored on each overridden field. Save is blocked while it is empty.
  const rationale = appOverride?.rationale ?? adqOverride?.rationale ?? "";

  const setApp = (value: string) =>
    onChange((a) => ({
      ...a,
      applicability:
        value === "ai"
          ? { action: "agree" }
          : { action: "override", value: value as Applicability, rationale },
    }));
  const setAdq = (value: string) =>
    onChange((a) => ({
      ...a,
      adequacy:
        value === "ai"
          ? { action: "agree" }
          : { action: "override", value: value as Adequacy, rationale },
    }));
  const setRationale = (text: string) =>
    onChange((a) => ({
      applicability:
        a.applicability?.action === "override"
          ? { ...a.applicability, rationale: text }
          : a.applicability,
      adequacy:
        a.adequacy?.action === "override"
          ? { ...a.adequacy, rationale: text }
          : a.adequacy,
    }));

  return (
    <div className="grid grid-cols-2 gap-3 text-xs leading-normal text-slate-700">
      <div>
        <div className="mb-1 text-[11px] font-semibold text-slate-500">
          AI RATIONALE · {dxLabel.toUpperCase()}
        </div>
        <p>
          <b>{applicabilityLabel[ai.aiApplicability]}:</b>{" "}
          {ai.aiApplicabilityRationale}
        </p>
        <p className="mt-1">
          <b>Adequacy ({adequacyLabel[ai.aiAdequacy].toLowerCase()}):</b>{" "}
          {ai.aiAdequacyRationale}
        </p>
      </div>
      <div>
        <div
          className={cn(
            "mb-1 text-[11px] font-semibold",
            appOverride || adqOverride ? "text-violet-600" : "text-slate-500"
          )}
        >
          YOUR REVIEW
        </div>
        <div className="flex gap-2">
          <select
            value={appOverride?.value ?? "ai"}
            onChange={(e) => setApp(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-1.5 py-1"
          >
            <option value="ai">Applicability: agree with AI</option>
            {Object.entries(applicabilityLabel)
              .filter(([v]) => v !== ai.aiApplicability)
              .map(([v, l]) => (
                <option key={v} value={v}>
                  Override → {l}
                </option>
              ))}
          </select>
          <select
            value={adqOverride?.value ?? "ai"}
            onChange={(e) => setAdq(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-1.5 py-1"
          >
            <option value="ai">Adequacy: agree with AI</option>
            {Object.entries(adequacyLabel)
              .filter(([v]) => v !== ai.aiAdequacy)
              .map(([v, l]) => (
                <option key={v} value={v}>
                  Override → {l}
                </option>
              ))}
          </select>
        </div>
        {appOverride || adqOverride ? (
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder={
              adqOverride?.value === "patient_declined"
                ? "Basis of decline: what was offered and why the patient declined (required)"
                : "Why do you disagree? (required)"
            }
            className="mt-1.5 h-14 w-full resize-none rounded-md border-[1.5px] border-violet-300 bg-white px-2 py-1.5 outline-none focus:border-violet-500"
          />
        ) : null}
      </div>
    </div>
  );
}

type Disposition = PhysicianSteering["inconsistencies"][string];

function FindingsCard({
  title,
  badgeClassName,
  items,
  dispositions,
  onChange,
}: {
  title: string;
  badgeClassName: string;
  items: { id: string; body: React.ReactNode }[];
  dispositions: Record<string, Disposition>;
  onChange: (id: string, value: Disposition) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center px-3.5 py-3">
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        <span className="flex-1" />
        <Badge className={badgeClassName}>{items.length}</Badge>
      </div>
      {items.map((item) => {
        const d = dispositions[item.id];
        return (
          <div
            key={item.id}
            className="border-t border-slate-100 px-3.5 py-2.5 text-[12.5px] leading-snug"
          >
            <div
              className={cn(
                d?.disposition === "dismiss" && "text-slate-400 line-through"
              )}
            >
              {item.body}
            </div>
            <div className="mt-1.5 flex gap-2.5 text-[11px] font-semibold text-slate-500">
              {(["keep", "dismiss"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onChange(item.id, { ...d, disposition: value })
                  }
                  className={cn(
                    "hover:text-slate-900",
                    d?.disposition === value && "text-slate-900"
                  )}
                >
                  {d?.disposition === value ? "● " : ""}
                  {value === "keep" ? "Keep" : "Dismiss"}
                </button>
              ))}
              {d?.reason ? (
                <span className="font-normal italic">"{d.reason}"</span>
              ) : null}
              {!d ? (
                <span className="font-normal text-slate-400">unreviewed</span>
              ) : null}
            </div>
          </div>
        );
      })}
      {!items.length ? (
        <p className="border-t border-slate-100 px-3.5 py-3 text-slate-400">
          None found.
        </p>
      ) : null}
    </section>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId/analysis")({
  component: Tab,
});
