import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useMutation,
  useQueries,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import {
  supportedRegions,
  type PhysicianSteering,
  type Region,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import { mockupsRoute, mockPreExamRoute } from "..";
import { cervicalAnalysis, type PreExamSetup } from "../data";
import { examPrepStatus, generateExamPrep } from "../examPrep";
import {
  mockCaseQueryOptions,
  mockPreExamQueryOptions,
  mockRefinedQueryOptions,
  mockReferralQuestionsQueryOptions,
  mockTimelineQueryOptions,
} from "../queries";
import { RecordDrawer } from "./RecordDetail";
import { Badge, Btn, Cite, Segmented } from "./shared";

type TreatmentRow = StoredPreExamAnalysis["treatmentAnalysis"][number];
type AiAssessment = TreatmentRow["assessments"][number];
type Applicability = AiAssessment["aiApplicability"];
type Exhaustion = TreatmentRow["aiExhaustion"];
type RowSteering = PhysicianSteering["treatments"][string];
type AssessmentSteering = NonNullable<RowSteering["assessments"]>[string];

const applicabilityLabel: Record<Applicability, string> = {
  applicable: "Applicable",
  not_applicable: "Not applicable",
  contraIndicated: "Contraindicated",
  unclear: "Unclear",
};
const exhaustionLabel: Record<Exhaustion, string> = {
  exhausted: "Exhausted",
  not_exhausted: "Not exhausted",
  unclear: "Unclear",
};
const chipTone: Record<Applicability | Exhaustion, string> = {
  applicable: "bg-green-50 border-green-200 text-green-800",
  not_applicable: "bg-red-50 border-red-200 text-red-800",
  contraIndicated: "bg-red-50 border-red-200 text-red-800",
  unclear: "bg-amber-50 border-amber-200 text-amber-800",
  exhausted: "bg-slate-100 border-slate-300 text-slate-700",
  not_exhausted: "bg-sky-50 border-sky-200 text-sky-800",
};

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const fake = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), 600));
const nowLabel = () =>
  new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const emptySteering = (): PhysicianSteering => ({
  preExamAnalysisId: 1,
  preExamAnalysisUpdatedAt: new Date().toISOString(),
  treatments: {},
  addedTreatments: [],
  inconsistencies: {},
  evidenceGaps: {},
  notes: null,
});

export default function PreExamTab() {
  const { record } = mockupsRoute.useSearch();
  const { region: regionParam } = mockPreExamRoute.useSearch();
  const { data: mockCase } = useSuspenseQuery(mockCaseQueryOptions);
  const region = regionParam ?? mockCase.regions[0];
  const { data: setup } = useSuspenseQuery(mockPreExamQueryOptions(region));
  const regionQueries = useQueries({
    queries: mockCase.regions.map((r) => mockPreExamQueryOptions(r)),
  });

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="px-5 pt-4">
          <div className="flex gap-1 border-b border-slate-200">
            {mockCase.regions.map((r, i) => {
              const data = regionQueries[i].data;
              const rows = data?.analysis?.treatmentAnalysis ?? [];
              const reviewed = rows.filter((row) => data?.steering?.treatments[row.id]?.disposition).length;
              return (
                <Link
                  key={r}
                  from={mockPreExamRoute.fullPath}
                  search={(prev) => ({ ...prev, region: r })}
                  className={cn(
                    "-mb-px flex items-center gap-2 rounded-t-lg border border-b-0 border-transparent px-4 py-2 text-[13px] font-semibold text-slate-600",
                    r === region && "border-slate-200 bg-white text-slate-900",
                  )}
                >
                  {regionLabel(r)}
                  {data?.analysis ? (
                    <Badge className="bg-blue-100 text-blue-700">{reviewed} / {rows.length} reviewed</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500">not run</Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        {/* Remount when the region or analysis run changes so drafts reset. */}
        <RegionPreExam key={`${region}:${setup.analysisRanAt}`} setup={setup} />
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}

function RegionPreExam({ setup }: { setup: PreExamSetup }) {
  const queryClient = useQueryClient();
  const queryKey = mockPreExamQueryOptions(setup.region).queryKey;
  const [selectedDx, setSelectedDx] = useState<string[]>(
    setup.snapshot?.selectedDiagnoses ?? setup.availableDiagnoses.map((dx) => dx.canonicalDx),
  );
  const [draft, setDraft] = useState<PhysicianSteering>(setup.steering ?? emptySteering());
  const [expanded, setExpanded] = useState<string[]>(["lumbar-esi"]);
  const [filter, setFilter] = useState<"all" | "unreviewed" | "pruned">("all");

  const update = (patch: Partial<PreExamSetup>) =>
    queryClient.setQueryData(queryKey, (old) => (old ? { ...old, ...patch } : old));

  const snapshotMutation = useMutation({
    mutationFn: () => fake(null),
    onSuccess: () =>
      update({ snapshot: { takenAt: nowLabel(), selectedDiagnoses: selectedDx, summaryDate: "Sep 28" } }),
  });
  const analysisMutation = useMutation({
    mutationFn: () => fake(null),
    onSuccess: () =>
      update({
        analysis: setup.analysis ?? cervicalAnalysis,
        analysisRanAt: nowLabel(),
        steering: null,
        steeringRevision: 0,
      }),
  });
  const saveMutation = useMutation({
    mutationFn: () => fake(draft),
    onSuccess: (saved) => update({ steering: saved, steeringRevision: setup.steeringRevision + 1 }),
  });

  const { data: refined } = useSuspenseQuery(mockRefinedQueryOptions(setup.region));
  const { data: questions } = useSuspenseQuery(mockReferralQuestionsQueryOptions);

  const scopeChanged =
    setup.snapshot !== null &&
    [...selectedDx].sort().join() !== [...setup.snapshot.selectedDiagnoses].sort().join();
  const rows = setup.analysis?.treatmentAnalysis ?? [];
  const reviewedCount = rows.filter((row) => draft.treatments[row.id]?.disposition).length;
  const prunedCount = rows.filter((row) => draft.treatments[row.id]?.disposition === "prune").length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(setup.steering ?? emptySteering());

  const runAnalysis = () => {
    if (setup.steering && !window.confirm("Re-running the analysis replaces the treatment rows. Saved steering for this region will be discarded. Continue?")) return;
    analysisMutation.mutate();
  };
  // One click for the physician: save steering, snapshot it, and generate exam prep.
  const examPrepMutation = useMutation({
    mutationFn: async () => {
      if (dirty) await saveMutation.mutateAsync();
      await generateExamPrep(queryClient, setup.region);
    },
  });
  const generateExamPrepClick = () => {
    const unreviewed = rows.length - reviewedCount;
    if (unreviewed > 0 && !window.confirm(`${unreviewed} treatments are unreviewed. Generate exam prep anyway?`)) return;
    examPrepMutation.mutate();
  };

  const setRow = (id: string, fn: (row: RowSteering) => RowSteering) =>
    setDraft((d) => ({ ...d, treatments: { ...d.treatments, [id]: fn(d.treatments[id] ?? {}) } }));

  const visibleRows = rows.filter((row) => {
    const disposition = draft.treatments[row.id]?.disposition;
    if (filter === "unreviewed") return !disposition;
    if (filter === "pruned") return disposition === "prune";
    return true;
  });
  const tried = visibleRows.filter((r) => r.recordStatus !== "Not Documented" && r.recordStatus !== "To Be Started");
  const notTried = visibleRows.filter((r) => !tried.includes(r));

  return (
    <>
      <div className="px-5">
        <SetupStrip
          setup={setup}
          selectedDx={selectedDx}
          onToggleDx={(dx) =>
            setSelectedDx((s) => (s.includes(dx) ? s.filter((d) => d !== dx) : [...s, dx]))
          }
          scopeChanged={scopeChanged}
          snapshotPending={snapshotMutation.isPending}
          analysisPending={analysisMutation.isPending}
          onSnapshot={() => snapshotMutation.mutate()}
          onRun={runAnalysis}
        />
      </div>

      {!setup.analysis ? (
        <div className="m-5 grid flex-1 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <div>
            <div className="text-[15px] font-semibold text-slate-700">No analysis for {regionLabel(setup.region)} yet</div>
            <p className="mt-1">Choose diagnoses, take a snapshot, then run the analysis.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid flex-1 grid-cols-[1fr_340px] items-start gap-4 px-5 py-4">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
                <h2 className="text-[13.5px] font-semibold">Treatment analysis</h2>
                <span className="text-[11px] text-slate-500">AI assessment per diagnosis · agree, override, or prune each treatment</span>
                <span className="flex-1" />
                <Segmented
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: `All ${rows.length}` },
                    { value: "unreviewed", label: `Unreviewed ${rows.length - reviewedCount}` },
                    { value: "pruned", label: `Pruned ${prunedCount}` },
                  ]}
                />
              </div>
              <div className={cn(gridCols, "border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10.5px] font-bold tracking-[.05em] text-slate-500")}>
                <span />
                <span>TREATMENT</span>
                <span>IN RECORDS</span>
                <span>AI ASSESSMENT · APPLICABLE / EXHAUSTION</span>
                <span>DECISION</span>
              </div>
              {[
                ["TRIED", tried],
                ["NOT TRIED", notTried],
              ].map(([label, group]) =>
                (group as TreatmentRow[]).length ? (
                  <div key={label as string}>
                    <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-[11px] font-bold tracking-[.04em] text-slate-700">{label as string}</div>
                    {(group as TreatmentRow[]).map((row) => (
                      <TreatmentRowView
                        key={row.id}
                        row={row}
                        steering={draft.treatments[row.id] ?? {}}
                        expanded={expanded.includes(row.id)}
                        onExpand={() => setExpanded((e) => (e.includes(row.id) ? e : [...e, row.id]))}
                        onToggleExpanded={() =>
                          setExpanded((e) => (e.includes(row.id) ? e.filter((id) => id !== row.id) : [...e, row.id]))
                        }
                        onChange={(fn) => setRow(row.id, fn)}
                      />
                    ))}
                  </div>
                ) : null,
              )}
              {!visibleRows.length ? <p className="p-6 text-center text-slate-500">Nothing here.</p> : null}
            </section>

            <div className="flex flex-col gap-3.5">
              <FindingsCard
                title="Inconsistencies"
                badgeClassName="bg-red-100 text-red-700"
                items={setup.analysis.inconsistencies.map((f) => ({
                  id: f.id,
                  body: (
                    <>
                      <Badge className="mr-1 rounded bg-slate-100 text-slate-600">{f.type}</Badge>
                      {f.description}
                    </>
                  ),
                }))}
                dispositions={draft.inconsistencies}
                onChange={(id, value) => setDraft((d) => ({ ...d, inconsistencies: { ...d.inconsistencies, [id]: value } }))}
              />
              <FindingsCard
                title="Evidence gaps"
                badgeClassName="bg-amber-100 text-amber-800"
                items={setup.analysis.evidenceGaps.map((g) => ({
                  id: g.id,
                  body: (
                    <>
                      <b>{g.gap}</b> {g.significance}
                    </>
                  ),
                }))}
                dispositions={draft.evidenceGaps}
                onChange={(id, value) => setDraft((d) => ({ ...d, evidenceGaps: { ...d.evidenceGaps, [id]: value } }))}
              />
              <section className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <h2 className="mb-2 text-[13.5px] font-semibold">Notes for exam prep</h2>
                <textarea
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || null }))}
                  placeholder="What should exam prep focus on?"
                  className="h-20 w-full resize-none rounded-lg border border-slate-300 px-2.5 py-2 text-[12.5px] outline-none focus:border-blue-400"
                />
              </section>
            </div>
          </div>

          <footer className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-6px_16px_rgba(15,23,42,.05)]">
            <div className="h-1.5 w-44 overflow-hidden rounded bg-slate-200">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${rows.length ? (reviewedCount / rows.length) * 100 : 0}%` }} />
            </div>
            <span className="text-[11px] text-slate-500">
              <b className="text-slate-900">{reviewedCount} of {rows.length}</b> treatments reviewed
              {rows.length - reviewedCount ? ` · ${rows.length - reviewedCount} unreviewed` : ""}
            </span>
            <span className="flex-1" />
            <span className="text-[11px] text-slate-500">
              {saveMutation.isPending ? "Saving…" : dirty ? "Unsaved changes" : "Saved"} · rev {setup.steeringRevision}
            </span>
            <ExamPrepState status={examPrepStatus(refined, setup, questions)} dirty={dirty} pending={examPrepMutation.isPending} />
            <Btn disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save steering</Btn>
            <Btn variant="primary" disabled={saveMutation.isPending || examPrepMutation.isPending} onClick={generateExamPrepClick}>
              {examPrepMutation.isPending ? "Generating exam prep…" : "Save & generate exam prep →"}
            </Btn>
          </footer>
        </>
      )}
    </>
  );
}

function ExamPrepState({ status, dirty, pending }: { status: ReturnType<typeof examPrepStatus>; dirty: boolean; pending: boolean }) {
  if (pending) return null;
  const stale = status.kind === "stale" || (status.kind === "current" && dirty);
  return (
    <span className="border-l border-slate-200 pl-3 text-[11px]">
      {status.kind === "current" && !dirty ? (
        <span className="text-green-700">
          Exam prep up to date ·{" "}
          <Link to="/mockups/exam-prep" className="font-semibold underline">view</Link>
        </span>
      ) : stale ? (
        <span className="font-semibold text-amber-700">Exam prep out of date</span>
      ) : (
        <span className="text-slate-500">No exam prep yet</span>
      )}
    </span>
  );
}

function StepNum({ n }: { n: number }) {
  return <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{n}</span>;
}

function SetupStrip({
  setup,
  selectedDx,
  onToggleDx,
  scopeChanged,
  snapshotPending,
  analysisPending,
  onSnapshot,
  onRun,
}: {
  setup: PreExamSetup;
  selectedDx: string[];
  onToggleDx: (dx: string) => void;
  scopeChanged: boolean;
  snapshotPending: boolean;
  analysisPending: boolean;
  onSnapshot: () => void;
  onRun: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 py-3.5">
      <div>
        <div className="mb-2 flex items-center">
          <StepNum n={1} />
          <b>Diagnoses in scope</b>
          <span className="ml-2 text-[11px] text-slate-500">from case summary · each checked dx gets its own treatment ladder</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {setup.availableDiagnoses.map((dx) => {
            const on = selectedDx.includes(dx.canonicalDx);
            return (
              <label
                key={dx.canonicalDx}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]",
                  on ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white",
                )}
              >
                <input type="checkbox" checked={on} onChange={() => onToggleDx(dx.canonicalDx)} className="size-4 accent-blue-600" />
                <Badge className={cn("rounded", on ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600")}>{dx.code}</Badge>
                {dx.label}
                {dx.note ? <span className="text-[11px] text-slate-500">{dx.note}</span> : null}
              </label>
            );
          })}
          <button type="button" className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[12.5px] text-slate-500 hover:text-slate-800">
            <Plus className="size-3.5" /> add diagnosis
          </button>
        </div>
      </div>

      <div className="min-w-[420px] border-l border-slate-200 pl-4">
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <div className="flex items-center"><StepNum n={2} /><b>Snapshot</b></div>
            <div className={cn("ml-[26px] mt-1 text-[11px]", scopeChanged ? "font-semibold text-amber-700" : "text-slate-500")}>
              {scopeChanged
                ? "Diagnoses changed — take a new snapshot"
                : setup.snapshot
                  ? `${setup.snapshot.takenAt} · ${setup.snapshot.selectedDiagnoses.length} dx · summary ${setup.snapshot.summaryDate}`
                  : "No snapshot yet"}
            </div>
          </div>
          <Btn
            onClick={onSnapshot}
            disabled={!selectedDx.length || snapshotPending}
            className={cn(scopeChanged && "border-amber-400 bg-amber-50")}
          >
            {snapshotPending ? "Taking…" : "Take snapshot"}
          </Btn>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex-1">
            <div className="flex items-center"><StepNum n={3} /><b>Analysis</b></div>
            <div className="ml-[26px] mt-1 text-[11px] text-slate-500">
              {setup.analysisRanAt
                ? `Ran ${setup.analysisRanAt} · ${setup.analysis?.treatmentAnalysis.length ?? 0} treatments`
                : "Not run"}
            </div>
          </div>
          <Btn
            variant={setup.analysis ? "default" : "primary"}
            onClick={onRun}
            disabled={!setup.snapshot || analysisPending}
          >
            {analysisPending ? "Running…" : setup.analysis ? "Re-run analysis" : "Run analysis"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

const gridCols = "grid grid-cols-[24px_1.2fr_1.05fr_1.5fr_190px] gap-3.5";

type Decision = "agree" | "override" | "prune";

const hasOverride = (steering: RowSteering) =>
  Object.values(steering.assessments ?? {}).some(
    (a) => a.applicability?.action === "override",
  );

// Every assessment on the row marked agree, keeping any existing overrides.
const agreeAll = (row: TreatmentRow, steering: RowSteering, keepOverrides: boolean) =>
  Object.fromEntries(
    row.assessments.map(({ canonicalDx }) => {
      const current = steering.assessments?.[canonicalDx];
      const keep = <T,>(review: T | undefined) =>
        keepOverrides && (review as { action?: string } | undefined)?.action === "override" ? review! : { action: "agree" as const };
      return [canonicalDx, { applicability: keep(current?.applicability) }];
    }),
  ) as RowSteering["assessments"];

function TreatmentRowView({
  row,
  steering,
  expanded,
  onExpand,
  onToggleExpanded,
  onChange,
}: {
  row: TreatmentRow;
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
      onChange((r) => ({ ...r, disposition: "keep", assessments: agreeAll(row, r, false) }));
    } else if (next === "prune") {
      onChange((r) => ({ ...r, disposition: "prune" }));
    } else {
      onChange((r) => ({ ...r, disposition: hasOverride(r) ? "keep" : undefined }));
      onExpand();
    }
  };

  // Editing an assessment counts as reviewing the row; untouched assessments become agree.
  const setAssessment = (dx: string, fn: (a: AssessmentSteering) => AssessmentSteering) =>
    onChange((r) => {
      const assessments = { ...agreeAll(row, r, true), [dx]: fn(r.assessments?.[dx] ?? {}) };
      return { ...r, disposition: r.disposition ?? "keep", assessments };
    });

  return (
    <div className={cn(gridCols, "items-start border-b border-slate-100 px-4 py-3", pruned && "bg-slate-50/70", expanded && "bg-indigo-50/20")}>
      <button type="button" onClick={onToggleExpanded} className="pt-0.5 text-slate-400 hover:text-slate-800" aria-label="Toggle rationale">
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      <div>
        <span className={cn("text-[13px] font-semibold", pruned && "text-slate-400 line-through")}>{row.treatment}</span>
        {row.source !== "taxonomy" ? (
          <Badge className={cn("ml-1.5 rounded", row.source === "ai" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600")}>
            {row.source === "ai" ? "AI suggested" : "record only"}
          </Badge>
        ) : null}
        {row.suggestionReasoning ? <div className="mt-1 text-[11px] text-slate-500">why: {row.suggestionReasoning}</div> : null}
      </div>
      <div>
        <div className="text-xs font-semibold">{row.recordStatus}</div>
        <div className="mt-0.5 text-[11px] text-slate-500">{row.recordDetail ?? "—"}</div>
        {row.episodeIds.length ? (
          <div className="mt-1 flex flex-wrap gap-2 text-[11.5px]">
            {row.episodeIds.map((id) => (
              <EpisodeCite key={id} recordId={id} />
            ))}
          </div>
        ) : null}
      </div>
      <div className={cn(pruned && "opacity-50")}>
        {row.assessments.map((a, i) => {
          const review = steering.assessments?.[a.canonicalDx];
          const app = review?.applicability?.action === "override" ? review.applicability.value : a.aiApplicability;
          return (
            <div key={a.canonicalDx} className={cn("grid grid-cols-[100px_auto_auto_1fr] items-center gap-1.5 py-0.5 text-[11.5px]", i > 0 && "mt-1 border-t border-dashed border-slate-200 pt-1.5")}>
              <span className="text-[11px] font-semibold text-slate-500">{a.canonicalDx.replace(/_/g, " ")}</span>
              <Chip value={app} label={applicabilityLabel[app]} overridden={review?.applicability?.action === "override"} />
            </div>
          );
        })}
        <div className="mt-1 text-[11.5px]">
          <Chip value={row.aiExhaustion} label={exhaustionLabel[row.aiExhaustion]} />
        </div>
      </div>
      <div>
        <Segmented
          value={decision}
          onChange={choose}
          options={[
            { value: "agree", label: "Agree", activeClassName: "bg-green-100 text-green-700" },
            { value: "override", label: "Override", activeClassName: "bg-violet-100 text-violet-700" },
            { value: "prune", label: "Prune", activeClassName: "bg-red-100 text-red-700" },
          ]}
        />
        {decision === "override" && !overridden ? (
          <div className="mt-1 text-[11px] font-medium text-violet-600">choose what you disagree with ↓</div>
        ) : !decision ? (
          <div className="mt-1 text-[11px] text-slate-400">unreviewed</div>
        ) : null}
      </div>

      {expanded ? (
        <div className={cn("col-span-4 col-start-2 mt-1 space-y-3 rounded-lg border bg-slate-50 p-3", decision === "override" ? "border-violet-200" : "border-slate-200")}>
          {row.assessments.map((a) => (
            <AssessmentEditor
              key={a.canonicalDx}
              ai={a}
              review={steering.assessments?.[a.canonicalDx]}
              onChange={(fn) => setAssessment(a.canonicalDx, fn)}
            />
          ))}
          <input
            value={steering.note ?? ""}
            onChange={(e) => onChange((r) => ({ ...r, note: e.target.value || undefined }))}
            placeholder="Row note (optional)"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </div>
      ) : null}
    </div>
  );
}

function EpisodeCite({ recordId }: { recordId: string }) {
  const { data: events } = useSuspenseQuery(mockTimelineQueryOptions);
  const event = events.find((e) => e.id === recordId);
  return <Cite recordId={recordId}>{event ? `${event.name.split(" · ")[0]} ${event.date.slice(0, 5)}` : recordId}</Cite>;
}

function Chip({ value, label, overridden }: { value: Applicability | Exhaustion; label: string; overridden?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold", chipTone[value], overridden && "outline outline-2 outline-offset-1 outline-violet-500")}>
      {label}
      {overridden ? <Pencil className="size-2.5" /> : null}
    </span>
  );
}

// One diagnosis: AI rationale on the left, physician agree/override on the right.
function AssessmentEditor({
  ai,
  review,
  onChange,
}: {
  ai: AiAssessment;
  review: AssessmentSteering | undefined;
  onChange: (fn: (a: AssessmentSteering) => AssessmentSteering) => void;
}) {
  const appOverride = review?.applicability?.action === "override" ? review.applicability : null;
  const rationale = appOverride?.rationale ?? "";

  const setApp = (value: string) =>
    onChange((a) => ({
      ...a,
      applicability: value === "ai" ? { action: "agree" } : { action: "override", value: value as Applicability, rationale: rationale || " " },
    }));
  const setRationale = (text: string) =>
    onChange((a) => ({
      applicability: a.applicability?.action === "override" ? { ...a.applicability, rationale: text } : a.applicability,
    }));

  return (
    <div className="grid grid-cols-2 gap-3 text-xs leading-normal text-slate-700">
      <div>
        <div className="mb-1 text-[11px] font-semibold text-slate-500">AI RATIONALE · {ai.canonicalDx.replace(/_/g, " ").toUpperCase()}</div>
        <p><b>{applicabilityLabel[ai.aiApplicability]}:</b> {ai.aiApplicabilityRationale}</p>
      </div>
      <div>
        <div className={cn("mb-1 text-[11px] font-semibold", appOverride ? "text-violet-600" : "text-slate-500")}>YOUR REVIEW</div>
        <div className="flex gap-2">
          <select value={appOverride?.value ?? "ai"} onChange={(e) => setApp(e.target.value)} className="rounded-md border border-slate-300 bg-white px-1.5 py-1">
            <option value="ai">Applicability: agree with AI</option>
            {Object.entries(applicabilityLabel).filter(([v]) => v !== ai.aiApplicability).map(([v, l]) => (
              <option key={v} value={v}>Override → {l}</option>
            ))}
          </select>
        </div>
        {appOverride ? (
          <textarea
            value={rationale.trim()}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Why do you disagree? (required)"
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
          <div key={item.id} className="border-t border-slate-100 px-3.5 py-2.5 text-[12.5px] leading-snug">
            <div className={cn(d?.disposition === "dismiss" && "text-slate-400 line-through")}>{item.body}</div>
            <div className="mt-1.5 flex gap-2.5 text-[11px] font-semibold text-slate-500">
              {(["keep", "dismiss"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange(item.id, { ...d, disposition: value })}
                  className={cn("hover:text-slate-900", d?.disposition === value && "text-slate-900")}
                >
                  {d?.disposition === value ? "● " : ""}
                  {value === "keep" ? "Keep" : "Dismiss"}
                </button>
              ))}
              {d?.reason ? <span className="font-normal italic">"{d.reason}"</span> : null}
              {!d ? <span className="font-normal text-slate-400">unreviewed</span> : null}
            </div>
          </div>
        );
      })}
      {!items.length ? <p className="border-t border-slate-100 px-3.5 py-3 text-slate-400">None found.</p> : null}
    </section>
  );
}
