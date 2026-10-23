import { Suspense, useState } from "react";
import { createLazyRoute, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import {
  initializePhysicianSteering,
  supportedRegions,
  type CanonicalDiagnosis,
  type CaseSummaryCardResponse,
  type PhysicianSteering,
  type PreExamAnalysisResponse,
  type Region,
  type RegionDiagnosesResponse,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  analyzeAddedDiagnosis,
  canonicalDiagnosesQueryOptions,
  caseQueryOptions,
  caseSummaryCardQueryOptions,
  generatePreExamAnalysis,
  generateRefinedAnalysis,
  physicianSteeringQueryOptions,
  postExamAnalysisQueryOptions,
  preExamAnalysisQueryOptions,
  preExamSnapshotQueryOptions,
  recordsQueryOptions,
  refinedAnalysisQueryOptions,
  regionDiagnosesQueryOptions,
  runPostExamAnalysis,
  savePhysicianSteering,
  takePreExamSnapshot,
  visitQueryOptions,
  type PreExamSnapshotResponse,
} from "../../../cases/queries";
import { AmaModeControl } from "../components/AmaExamTasks";
import { DiagnosisList } from "../components/DiagnosisList";
import { useExamPrepModal } from "../components/ExamPrepModal";
import { RecordDrawer } from "../components/RecordDetail";
import { Badge, Btn, Cite, Segmented } from "../components/shared";
import {
  examPrepStatus,
  isRowReviewed,
  sameSteering,
  savedSteeringFor,
  scopedRows,
  visitBlocker,
  type ExamPrepStatus,
} from "../examPrep";
import { toTimeline, type TimelineEvent } from "../recordPresentation";

type TreatmentRow = StoredPreExamAnalysis["treatmentAnalysis"][number];
type AiAssessment = TreatmentRow["assessments"][number];
type Applicability = AiAssessment["aiApplicability"];
type Exhaustion = TreatmentRow["aiExhaustion"];
type RowSteering = PhysicianSteering["treatments"][string];
type AssessmentSteering = NonNullable<RowSteering["assessments"]>[string];
type AddedTreatment = PhysicianSteering["addedTreatments"][number];
type Category = AddedTreatment["category"];
type LadderEntry = NonNullable<
  PreExamSnapshotResponse["inputSnapshot"]
>["ladder"][number];
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
const exhaustionLabel: Record<Exhaustion, string> = {
  exhausted: "Exhausted",
  not_exhausted: "Not exhausted",
  unclear: "Unclear",
};
const categoryLabel: Record<Category, string> = {
  conservative: "Conservative",
  medication: "Medication",
  injection: "Injection",
  surgical: "Surgical",
  multimodal: "Multimodal",
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
  // Diagnoses the physician found not supported: still reviewed, shown greyed.
  notSupported: Set<string>;
};

function Tab() {
  const { caseId } = Route.useParams();
  const { record, region: regionParam } = Route.useSearch();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { data: records } = useSuspenseQuery(recordsQueryOptions(caseId));
  const card = useQuery(caseSummaryCardQueryOptions(caseId)).data;
  const regions = patientCase.regions;
  const region =
    regionParam && regions.includes(regionParam) ? regionParam : regions[0];

  const preExamQueries = useQueries({
    queries: regions.map((r) => preExamAnalysisQueryOptions(caseId, r)),
  });
  const diagnosesQueries = useQueries({
    queries: regions.map((r) => regionDiagnosesQueryOptions(caseId, r)),
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
    notSupported: new Set(),
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
              const rows = scopedRows(
                stored?.analysis?.treatmentAnalysis ?? [],
                (diagnosesQueries[i].data?.diagnoses ?? []).map((d) => d.canonicalDx)
              );
              const reviewed = rows.filter((row) =>
                isRowReviewed(row, saved?.steering.treatments[row.id])
              ).length;
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
                </Link>
              );
            })}
            <span className="flex-1" />
            {/* Case-level: also controls Visit and the report, so it is shown here, not only on the prep sheet. */}
            <span className="self-center pb-1">
              <AmaModeControl
                caseId={caseId}
                caseType={patientCase.caseType}
                amaMode={patientCase.amaMode}
              />
            </span>
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
  lookups: caseLookups,
}: {
  caseId: string;
  region: Region;
  card: Card;
  lookups: Lookups;
}) {
  const queryClient = useQueryClient();
  const canonical = useQuery(canonicalDiagnosesQueryOptions(region)).data ?? [];
  const { data: stored } = useSuspenseQuery(
    preExamAnalysisQueryOptions(caseId, region)
  );
  const { data: snapshotResponse } = useSuspenseQuery(
    preExamSnapshotQueryOptions(caseId, region)
  );
  const { data: list } = useSuspenseQuery(
    regionDiagnosesQueryOptions(caseId, region)
  );
  const lookups: Lookups = {
    ...caseLookups,
    dxLabel: (dx) =>
      canonical.find((d) => d.canonicalDx === dx)?.label ??
      caseLookups.dxLabel(dx),
    notSupported: new Set(
      list.diagnoses
        .filter((d) => d.status === "not_supported")
        .map((d) => d.canonicalDx)
    ),
  };
  const snapshot = snapshotResponse.inputSnapshot;
  const listed = list.diagnoses.map((d) => d.canonicalDx);
  // Listed diagnoses the snapshot doesn't cover: the treatment analysis must be redone for them.
  const needsAnalysis = listed.filter(
    (dx) => !snapshot?.scope.diagnoses.includes(dx)
  );

  const invalidate = () =>
    Promise.all([
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
  const snapshotMutation = useMutation({
    mutationFn: () => takePreExamSnapshot(caseId, region),
    onSuccess: invalidate,
  });
  const analysisMutation = useMutation({
    mutationFn: () => generatePreExamAnalysis(caseId, region),
    onSuccess: invalidate,
  });

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
          caseId={caseId}
          region={region}
          stored={stored}
          card={card}
          lookups={lookups}
          list={list}
          addable={canonical.filter(
            (d) => !list.diagnoses.some((x) => x.canonicalDx === d.canonicalDx)
          )}
          analyzedCount={snapshot?.scope.diagnoses.length ?? 0}
          hasSnapshot={snapshot !== null}
          hasCurrent={listed.length > 0}
          needsAnalysis={needsAnalysis}
          snapshotPending={snapshotMutation.isPending}
          analysisPending={analysisMutation.isPending}
          onSnapshot={takeSnapshot}
          onRun={runAnalysis}
        />
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
            list={list}
            lookups={lookups}
            ladder={snapshot?.ladder ?? []}
          />
        </Suspense>
      ) : (
        <div className="m-5 grid flex-1 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <div>
            <div className="text-[15px] font-semibold text-slate-700">
              No analysis for {regionLabel(region)} yet
            </div>
            <p className="mt-1">
              Set the diagnoses, take a snapshot, then run the analysis.
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
  list,
  lookups,
  ladder,
}: {
  caseId: string;
  region: Region;
  stored: StoredWithAnalysis;
  list: RegionDiagnosesResponse;
  lookups: Lookups;
  ladder: LadderEntry[];
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
  const [adding, setAdding] = useState(false);

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
  // Saves steering first if needed, then regenerates this region's trajectory and
  // priorities (3B), which appear on the prep sheet and in the Visit priorities column.
  const examPrepMutation = useMutation({
    mutationFn: async () => {
      if (dirty || !saved) await saveMutation.mutateAsync();
      return generateRefinedAnalysis(caseId, region);
    },
    onSuccess: (result) =>
      queryClient.setQueryData(refinedOptions.queryKey, result),
  });

  // Listed diagnoses the run doesn't cover. Analyzing them adds an assessment to every row
  // (and maybe new rows); saved steering is kept, so unsaved edits are saved first.
  const notAnalyzed = list.diagnoses
    .map((d) => d.canonicalDx)
    .filter((dx) => !stored.analyzedDiagnoses.includes(dx));
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (dirty) await saveMutation.mutateAsync();
      for (const dx of notAnalyzed) await analyzeAddedDiagnosis(caseId, region, dx);
    },
    onSettled: () =>
      Promise.all(
        [
          preExamAnalysisQueryOptions(caseId, region).queryKey,
          preExamSnapshotQueryOptions(caseId, region).queryKey,
          ["physicianSteering", { caseId, region }],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      ),
  });

  // Every listed diagnosis is reviewed, not supported ones too (treatment given for them
  // still needs a necessity opinion). Assessments for removed diagnoses are hidden.
  const rows = scopedRows(
    stored.analysis.treatmentAnalysis,
    list.diagnoses.map((d) => d.canonicalDx)
  );
  const reviewedCount = rows.filter((row) =>
    isRowReviewed(row, draft.treatments[row.id])
  ).length;
  const prunedCount = rows.filter(
    (row) => draft.treatments[row.id]?.disposition === "prune"
  ).length;
  const prepStatus = examPrepStatus(refined, saved, list, stored.analyzedDiagnoses);
  const prepCurrent =
    prepStatus.kind === "current" && !dirty && !examPrepMutation.isPending;
  const missingRationale = Object.values(draft.treatments).some(
    (row) =>
      (row.exhaustion?.action === "override" &&
        !row.exhaustion.rationale.trim()) ||
      Object.values(row.assessments ?? {}).some(
        (a) =>
          a.applicability?.action === "override" &&
          !a.applicability.rationale.trim()
      )
  );
  const prepModal = useExamPrepModal();
  const busy =
    saveMutation.isPending ||
    examPrepMutation.isPending ||
    analyzeMutation.isPending;

  // After the visit is saved, the footer runs the post-exam analysis (pass 4) once the
  // assessment is finished. The backend enforces the same checks.
  const { data: visit } = useQuery(visitQueryOptions(caseId));
  const postExamOptions = postExamAnalysisQueryOptions(caseId, region);
  const { data: lastPostExam } = useQuery(postExamOptions);
  const undecided = list.diagnoses.filter((d) => d.status === "working").length;
  const visitMissing = visitBlocker(visit?.documentation);
  const readiness = [
    { label: visitMissing ?? "Visit documented", ok: !visitMissing },
    {
      label: undecided
        ? `${undecided} diagnos${undecided === 1 ? "is" : "es"} still working`
        : list.diagnoses.some((d) => d.status === "supported")
          ? "Diagnoses decided"
          : "No diagnosis supported",
      ok: !undecided && list.diagnoses.some((d) => d.status === "supported"),
    },
    {
      label: notAnalyzed.length
        ? `${notAnalyzed.length} diagnos${notAnalyzed.length === 1 ? "is" : "es"} not analyzed`
        : "Diagnoses analyzed",
      ok: !notAnalyzed.length,
    },
    {
      label: `${reviewedCount} of ${rows.length} treatments reviewed`,
      ok: reviewedCount === rows.length,
    },
  ];
  const postExamMutation = useMutation({
    mutationFn: async () => {
      if (dirty || !saved) await saveMutation.mutateAsync();
      return runPostExamAnalysis(caseId, region);
    },
    onSuccess: (result) =>
      queryClient.setQueryData(postExamOptions.queryKey, result),
  });

  const setRow = (id: string, fn: (row: RowSteering) => RowSteering) =>
    edit((d) => ({
      ...d,
      treatments: { ...d.treatments, [id]: fn(d.treatments[id] ?? {}) },
    }));

  // Physician-added treatments are reviewed by definition, so they show only under "All".
  // They can be assessed for analyzed diagnoses (the backend checks the snapshot scope).
  const addedVisible = filter === "all" ? draft.addedTreatments : [];
  const assessable = list.diagnoses.filter((d) =>
    stored.analyzedDiagnoses.includes(d.canonicalDx)
  );
  // Ladder treatments that no row or added treatment covers yet.
  const covered = new Set([
    ...rows.map((row) => row.treatmentId),
    ...draft.addedTreatments.map((t) => t.treatmentId),
  ]);
  const addableLadder = [
    ...new Map(
      ladder
        .filter((entry) => !covered.has(entry.treatmentId))
        .map((entry) => [entry.treatmentId, entry])
    ).values(),
  ];
  const setAdded = (id: string, fn: (t: AddedTreatment) => AddedTreatment) =>
    edit((d) => ({
      ...d,
      addedTreatments: d.addedTreatments.map((t) => (t.id === id ? fn(t) : t)),
    }));

  const visibleRows = rows.filter((row) => {
    const steering = draft.treatments[row.id];
    if (filter === "unreviewed") return !isRowReviewed(row, steering);
    if (filter === "pruned") return steering?.disposition === "prune";
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
              Applicability per diagnosis, exhaustion per treatment · agree,
              override, or prune each treatment
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
          {notAnalyzed.length ? (
            <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-900">
              <span className="flex-1">
                <b>{notAnalyzed.map(lookups.dxLabel).join(", ")}</b>{" "}
                {notAnalyzed.length === 1 ? "isn't" : "aren't"} in this analysis
                yet. Analyzing adds{" "}
                {notAnalyzed.length === 1 ? "it" : "them"} to every treatment
                and keeps your review.
                {analyzeMutation.isError ? (
                  <span className="ml-2 font-semibold text-red-700">
                    {apiErrorMessage(analyzeMutation.error)}
                  </span>
                ) : null}
              </span>
              <Btn
                disabled={busy || missingRationale}
                onClick={() => analyzeMutation.mutate()}
                className="border-amber-400 bg-white"
              >
                {analyzeMutation.isPending
                  ? "Analyzing…"
                  : `Analyze ${notAnalyzed.length === 1 ? "diagnosis" : `${notAnalyzed.length} diagnoses`}`}
              </Btn>
            </div>
          ) : null}
          <div
            className={cn(
              gridCols,
              "border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10.5px] font-bold tracking-[.05em] text-slate-500"
            )}
          >
            <span />
            <span>TREATMENT</span>
            <span>IN RECORDS</span>
            <span>APPLICABILITY</span>
            <span>EXHAUSTION</span>
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
          {addedVisible.length ? (
            <div>
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-[11px] font-bold tracking-[.04em] text-slate-700">
                ADDED BY PHYSICIAN
              </div>
              {addedVisible.map((t) => (
                <AddedTreatmentRow
                  key={t.id}
                  treatment={t}
                  lookups={lookups}
                  onChange={(fn) => setAdded(t.id, fn)}
                  onRemove={() =>
                    edit((d) => ({
                      ...d,
                      addedTreatments: d.addedTreatments.filter(
                        (x) => x.id !== t.id
                      ),
                    }))
                  }
                />
              ))}
            </div>
          ) : null}
          {!visibleRows.length && !addedVisible.length ? (
            <p className="p-6 text-center text-slate-500">Nothing here.</p>
          ) : null}
          {filter !== "all" ? null : adding ? (
            <AddTreatmentForm
              ladder={addableLadder}
              diagnoses={assessable}
              lookups={lookups}
              onCancel={() => setAdding(false)}
              onAdd={(t) => {
                edit((d) => ({
                  ...d,
                  addedTreatments: [...d.addedTreatments, t],
                }));
                setAdding(false);
              }}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full px-4 py-2.5 text-left text-[12px] font-semibold text-blue-700 hover:bg-slate-50"
            >
              + Add treatment
            </button>
          )}
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
        {visit ? (
          <span className="flex items-center gap-3 text-[11px]">
            {readiness.map((item) => (
              <span
                key={item.label}
                className={item.ok ? "text-slate-500" : "font-semibold text-amber-700"}
              >
                {item.ok ? "✓" : "○"} {item.label}
              </span>
            ))}
            {lastPostExam?.analysis ? (
              <Link
                to="/p_cases/$caseId/mmi"
                params={{ caseId }}
                className="border-l border-slate-200 pl-3 text-blue-700 hover:underline"
              >
                Post-exam analysis {formatTime(lastPostExam.updatedAt)} →
              </Link>
            ) : null}
          </span>
        ) : (
          <>
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
          </>
        )}
        <span className="flex-1" />
        {saveMutation.isError ||
        examPrepMutation.isError ||
        postExamMutation.isError ? (
          <span className="text-[11px] font-semibold text-red-700">
            {apiErrorMessage(
              saveMutation.error ??
                examPrepMutation.error ??
                postExamMutation.error
            )}
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
        {visit ? null : (
          <ExamPrepState
            status={prepStatus}
            dirty={dirty}
            pending={examPrepMutation.isPending}
            onOpen={prepModal.open}
          />
        )}
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
        {/* Before the visit, review is optional; the prep sheet is the useful next thing. */}
        {visit ? null : (
          <Btn
            variant="primary"
            disabled={busy || prepCurrent || missingRationale}
            onClick={() => examPrepMutation.mutate()}
          >
            {examPrepMutation.isPending
              ? "Preparing sheet…"
              : refined?.analysis
                ? "Update prep sheet"
                : "Create prep sheet"}
          </Btn>
        )}
        {visit ? (
          <Btn
            variant="primary"
            disabled={
              busy ||
              postExamMutation.isPending ||
              missingRationale ||
              !readiness.every((item) => item.ok)
            }
            onClick={() => postExamMutation.mutate()}
          >
            {postExamMutation.isPending
              ? "Running post-exam analysis…"
              : "Run post-exam analysis"}
          </Btn>
        ) : null}
      </footer>
    </>
  );
}

function ExamPrepState({
  status,
  dirty,
  pending,
  onOpen,
}: {
  status: ExamPrepStatus;
  dirty: boolean;
  pending: boolean;
  onOpen: () => void;
}) {
  if (pending) return null;
  const exists = status.kind === "current" || status.kind === "stale";
  const stale = status.kind === "stale" || (status.kind === "current" && dirty);
  return (
    <span className="border-l border-slate-200 pl-3 text-[11px]">
      {!exists ? (
        <span className="text-slate-500">No prep sheet yet</span>
      ) : (
        <>
          {stale ? (
            <span className="font-semibold text-amber-700">
              Prep sheet out of date
            </span>
          ) : (
            <span className="text-green-700">Prep sheet ready</span>
          )}
          {" · "}
          <button
            type="button"
            onClick={onOpen}
            className="font-semibold text-blue-700 hover:underline"
          >
            Open
          </button>
        </>
      )}
    </span>
  );
}

function SetupStrip({
  caseId,
  region,
  stored,
  card,
  lookups,
  list,
  addable,
  analyzedCount,
  hasSnapshot,
  hasCurrent,
  needsAnalysis,
  snapshotPending,
  analysisPending,
  onSnapshot,
  onRun,
}: {
  caseId: string;
  region: Region;
  stored: PreExamAnalysisResponse | null;
  card: Card;
  lookups: Lookups;
  list: RegionDiagnosesResponse;
  addable: CanonicalDiagnosis[];
  analyzedCount: number;
  hasSnapshot: boolean;
  hasCurrent: boolean;
  needsAnalysis: string[];
  snapshotPending: boolean;
  analysisPending: boolean;
  onSnapshot: () => void;
  onRun: () => void;
}) {
  const busy = snapshotPending || analysisPending;
  const outdated = hasSnapshot && needsAnalysis.length > 0;
  // The stored row's updatedAt is bumped by both snapshot and analysis.
  // With a run, uncovered diagnoses are analyzed into it (bar above the treatments);
  // a new snapshot is the full redo. Without one, the snapshot must include them.
  const snapshotStatus = outdated
    ? stored?.analysis
      ? `Not covered: ${needsAnalysis.map(lookups.dxLabel).join(", ")} — analyze below, or take a new snapshot to redo everything`
      : `Not covered: ${needsAnalysis.map(lookups.dxLabel).join(", ")} — take a new snapshot`
    : !hasSnapshot
      ? "No snapshot yet"
      : stored?.analysis
        ? `${analyzedCount} dx`
        : `${stored ? formatTime(stored.updatedAt) : "Taken"} · ${analyzedCount} dx`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-b-xl border border-t-0 border-slate-200 bg-white px-4 py-3.5">
      <div>
        <div className="mb-2 flex items-center">
          <b>Diagnoses</b>
          <span className="ml-2 text-[11px] text-slate-500">
            from records, or add one · working and supported ones are in scope
            · set a conclusion any time, before or after the exam
          </span>
        </div>
        <DiagnosisList
          caseId={caseId}
          region={region}
          list={list}
          addable={addable}
          dxLabel={lookups.dxLabel}
          icdCodes={(dx) =>
            card?.diagnoses.find((d) => d.canonicalDx === dx)?.icdPrefixes ?? []
          }
        />
      </div>

      <div className="w-[340px] border-l border-slate-200 pl-4">
        <div className="mb-2 text-[11px] font-semibold text-slate-500">
          Treatment analysis
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <b>Snapshot</b>
            <div
              className={cn(
                "mt-1 text-[11px]",
                outdated ? "font-semibold text-amber-700" : "text-slate-500"
              )}
            >
              {snapshotStatus}
            </div>
          </div>
          <Btn
            onClick={onSnapshot}
            disabled={!hasCurrent || busy}
            className={cn(
              outdated && !stored?.analysis && "border-amber-400 bg-amber-50"
            )}
          >
            {snapshotPending ? "Taking…" : "Take snapshot"}
          </Btn>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex-1">
            <b>Analysis</b>
            <div className="mt-1 text-[11px] text-slate-500">
              {stored?.analysis
                ? `Ran ${formatTime(stored.updatedAt)} · ${stored.analysis.treatmentAnalysis.length} treatments`
                : "Not run"}
            </div>
          </div>
          <Btn
            variant={stored?.analysis ? "default" : "primary"}
            onClick={onRun}
            disabled={!stored?.hasInputSnapshot || outdated || busy}
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

const gridCols =
  "grid grid-cols-[24px_1.2fr_1.05fr_1.25fr_110px_190px] gap-3.5";

type Decision = "agree" | "override" | "prune";

const hasOverride = (steering: RowSteering) =>
  steering.exhaustion?.action === "override" ||
  Object.values(steering.assessments ?? {}).some(
    (a) => a.applicability?.action === "override"
  );

// Every judgment on the row (applicability per diagnosis, exhaustion) marked agree,
// optionally keeping existing overrides.
const agreeAll = (
  row: TreatmentRow,
  steering: RowSteering,
  keepOverrides: boolean
): Pick<RowSteering, "assessments" | "exhaustion"> => {
  const keep = <T extends { action: string }>(review: T | undefined) =>
    keepOverrides && review?.action === "override"
      ? review
      : { action: "agree" as const };
  return {
    assessments: Object.fromEntries(
      row.assessments.map(({ canonicalDx }) => [
        canonicalDx,
        { applicability: keep(steering.assessments?.[canonicalDx]?.applicability) },
      ])
    ),
    exhaustion: keep(steering.exhaustion),
  };
};

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
  const reviewed = isRowReviewed(row, steering);
  const decision: Decision | undefined = pruned
    ? "prune"
    : overridden || overridePending
      ? "override"
      : reviewed
        ? "agree"
        : undefined;

  const choose = (next: Decision) => {
    setOverridePending(next === "override");
    if (next === "agree") {
      onChange((r) => ({
        ...r,
        disposition: "keep",
        ...agreeAll(row, r, false),
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

  // Editing a judgment counts as reviewing the row; untouched judgments become agree.
  const edit = (
    fn: (filled: ReturnType<typeof agreeAll>) => Partial<RowSteering>
  ) =>
    onChange((r) => {
      const filled = agreeAll(row, r, true);
      return { ...r, ...filled, disposition: r.disposition ?? "keep", ...fn(filled) };
    });
  const setApplicability = (dx: string, review: AssessmentSteering["applicability"]) =>
    edit((filled) => ({
      assessments: { ...filled.assessments, [dx]: { applicability: review } },
    }));
  const setExhaustion = (review: RowSteering["exhaustion"]) =>
    edit(() => ({ exhaustion: review }));
  const exhaustion =
    steering.exhaustion?.action === "override"
      ? steering.exhaustion.value
      : row.aiExhaustion;

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
          return (
            <div
              key={a.canonicalDx}
              className={cn(
                "grid grid-cols-[100px_auto_1fr] items-center gap-1.5 py-0.5 text-[11.5px]",
                i > 0 && "mt-1 border-t border-dashed border-slate-200 pt-1.5",
                lookups.notSupported.has(a.canonicalDx) && "opacity-55"
              )}
            >
              <span className="text-[11px] font-semibold text-slate-500">
                {lookups.dxLabel(a.canonicalDx)}
                {lookups.notSupported.has(a.canonicalDx) ? (
                  <span className="block text-[10px] font-semibold text-amber-700">
                    dx not supported
                  </span>
                ) : null}
                {/* The rest of the row was reviewed before this diagnosis was added. */}
                {steering.disposition === "keep" && !review?.applicability ? (
                  <span className="block text-[10px] font-semibold text-blue-700">
                    new · unreviewed
                  </span>
                ) : null}
              </span>
              <Chip
                value={app}
                label={applicabilityLabel[app]}
                overridden={review?.applicability?.action === "override"}
              />
            </div>
          );
        })}
      </div>
      <div className={cn(pruned && "opacity-50")}>
        <Chip
          value={exhaustion}
          label={exhaustionLabel[exhaustion]}
          overridden={steering.exhaustion?.action === "override"}
        />
        {/* Re-judged after a diagnosis was added; the earlier review was cleared. */}
        {steering.disposition === "keep" && !steering.exhaustion ? (
          <span className="mt-0.5 block text-[10px] font-semibold text-blue-700">
            new · unreviewed
          </span>
        ) : null}
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
        ) : !reviewed ? (
          <div className="mt-1 text-[11px] text-slate-400">unreviewed</div>
        ) : null}
      </div>

      {expanded ? (
        <div
          className={cn(
            "col-span-5 col-start-2 mt-1 space-y-3 rounded-lg border bg-slate-50 p-3",
            decision === "override" ? "border-violet-200" : "border-slate-200"
          )}
        >
          {row.assessments.map((a) => (
            <ReviewEditor
              key={a.canonicalDx}
              title={`Applicability · ${lookups.dxLabel(a.canonicalDx)}`}
              labels={applicabilityLabel}
              aiValue={a.aiApplicability}
              aiRationale={a.aiApplicabilityRationale}
              review={steering.assessments?.[a.canonicalDx]?.applicability}
              onChange={(review) => setApplicability(a.canonicalDx, review)}
            />
          ))}
          <ReviewEditor
            title="Exhaustion · across applicable diagnoses"
            labels={exhaustionLabel}
            aiValue={row.aiExhaustion}
            aiRationale={row.aiExhaustionRationale}
            review={steering.exhaustion}
            onChange={setExhaustion}
          />
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

// A treatment the physician added: a proposal, or care the records don't show.
// Applicability and exhaustion are the physician's own, edited in place.
function AddedTreatmentRow({
  treatment,
  lookups,
  onChange,
  onRemove,
}: {
  treatment: AddedTreatment;
  lookups: Lookups;
  onChange: (fn: (t: AddedTreatment) => AddedTreatment) => void;
  onRemove: () => void;
}) {
  const setAssessment = (
    dx: string,
    patch: Partial<AddedTreatment["assessments"][string]>
  ) =>
    onChange((t) => ({
      ...t,
      assessments: { ...t.assessments, [dx]: { ...t.assessments[dx], ...patch } },
    }));
  const select =
    "rounded-md border border-slate-300 bg-white px-1 py-0.5 text-[11px]";
  return (
    <div className={cn(gridCols, "items-start border-b border-slate-200 px-4 py-3")}>
      <span />
      <div>
        <span className="text-[13px] font-semibold">{treatment.treatment}</span>
        <Badge className="ml-1.5 rounded bg-violet-100 text-violet-700">
          physician
        </Badge>
        <div className="mt-1 text-[11px] text-slate-500">
          {categoryLabel[treatment.category]}
          {treatment.treatmentId ? "" : " · not in taxonomy"}
        </div>
      </div>
      <div className="text-[11px] text-slate-500">Added by you</div>
      <div>
        {Object.entries(treatment.assessments).map(([dx, a], i) => (
          <div
            key={dx}
            className={cn(
              "grid grid-cols-[100px_auto_1fr] items-center gap-1.5 py-0.5",
              i > 0 && "mt-1 border-t border-dashed border-slate-200 pt-1.5",
              lookups.notSupported.has(dx) && "opacity-55"
            )}
          >
            <span className="text-[11px] font-semibold text-slate-500">
              {lookups.dxLabel(dx)}
            </span>
            <select
              value={a.applicability}
              onChange={(e) =>
                setAssessment(dx, { applicability: e.target.value as Applicability })
              }
              className={select}
            >
              {Object.entries(applicabilityLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <span />
            <input
              value={a.rationale}
              onChange={(e) => setAssessment(dx, { rationale: e.target.value })}
              placeholder="Rationale (optional)"
              className="col-span-2 col-start-2 rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-400"
            />
          </div>
        ))}
      </div>
      <div className="grid gap-1">
        <select
          value={treatment.exhaustion}
          onChange={(e) =>
            onChange((t) => ({ ...t, exhaustion: e.target.value as Exhaustion }))
          }
          className={select}
        >
          {Object.entries(exhaustionLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          value={treatment.exhaustionRationale}
          onChange={(e) =>
            onChange((t) => ({ ...t, exhaustionRationale: e.target.value }))
          }
          placeholder="Rationale (optional)"
          className="rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px] outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <Btn onClick={onRemove}>Remove</Btn>
      </div>
    </div>
  );
}

// New treatments default to applicable and not exhausted: the usual "I'd recommend X".
function AddTreatmentForm({
  ladder,
  diagnoses,
  lookups,
  onAdd,
  onCancel,
}: {
  ladder: LadderEntry[];
  diagnoses: RegionDiagnosesResponse["diagnoses"];
  lookups: Lookups;
  onAdd: (treatment: AddedTreatment) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("conservative");
  const [dxs, setDxs] = useState(() =>
    diagnoses
      .filter((d) => d.status !== "not_supported")
      .map((d) => d.canonicalDx)
  );
  const match = ladder.find(
    (e) => e.treatment.toLowerCase() === name.trim().toLowerCase()
  );
  const add = () =>
    onAdd({
      id: crypto.randomUUID(),
      treatmentId: match?.treatmentId ?? null,
      treatment: match?.treatment ?? name.trim(),
      category: match?.category ?? category,
      assessments: Object.fromEntries(
        dxs.map((dx) => [
          dx,
          { applicability: "applicable", rationale: "" },
        ])
      ),
      exhaustion: "not_exhausted",
      exhaustionRationale: "",
    });
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-3 text-[12px]">
      <input
        autoFocus
        list="add-treatment-ladder"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Treatment: pick from the list or type your own"
        className="w-80 rounded-md border border-slate-300 bg-white px-2 py-1.5 outline-none focus:border-blue-400"
      />
      <datalist id="add-treatment-ladder">
        {ladder.map((e) => (
          <option key={e.treatmentId} value={e.treatment} />
        ))}
      </datalist>
      {match ? (
        <span className="text-[11px] text-slate-500">
          {categoryLabel[match.category]} · taxonomy
        </span>
      ) : (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="rounded-md border border-slate-300 bg-white px-1.5 py-1.5"
        >
          {Object.entries(categoryLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      )}
      <span className="text-slate-500">for</span>
      {diagnoses.map((d) => (
        <label key={d.canonicalDx} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={dxs.includes(d.canonicalDx)}
            onChange={(e) =>
              setDxs((current) =>
                e.target.checked
                  ? [...current, d.canonicalDx]
                  : current.filter((x) => x !== d.canonicalDx)
              )
            }
          />
          {lookups.dxLabel(d.canonicalDx)}
        </label>
      ))}
      <span className="flex-1" />
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn
        variant="primary"
        disabled={!name.trim() || !dxs.length}
        onClick={add}
      >
        Add
      </Btn>
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
  value: Applicability | Exhaustion;
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

// One judgment (applicability for a diagnosis, or the treatment's exhaustion): AI
// rationale on the left, physician agree/override on the right.
function ReviewEditor<T extends string>({
  title,
  labels,
  aiValue,
  aiRationale,
  review,
  onChange,
}: {
  title: string;
  labels: Record<T, string>;
  aiValue: T;
  aiRationale: string;
  review:
    | { action: "agree"; note?: string }
    | { action: "override"; value: T; rationale: string }
    | undefined;
  onChange: (
    review:
      | { action: "agree" }
      | { action: "override"; value: T; rationale: string }
  ) => void;
}) {
  // Save is blocked while an override's rationale is empty.
  const override = review?.action === "override" ? review : null;
  return (
    <div className="grid grid-cols-2 gap-3 text-xs leading-normal text-slate-700">
      <div>
        <div className="mb-1 text-[11px] font-semibold text-slate-500">
          AI RATIONALE · {title.toUpperCase()}
        </div>
        <p>
          <b>{labels[aiValue]}:</b> {aiRationale}
        </p>
      </div>
      <div>
        <div
          className={cn(
            "mb-1 text-[11px] font-semibold",
            override ? "text-violet-600" : "text-slate-500"
          )}
        >
          YOUR REVIEW
        </div>
        <select
          value={override?.value ?? "ai"}
          onChange={(e) =>
            onChange(
              e.target.value === "ai"
                ? { action: "agree" }
                : {
                    action: "override",
                    value: e.target.value as T,
                    rationale: override?.rationale ?? "",
                  }
            )
          }
          className="rounded-md border border-slate-300 bg-white px-1.5 py-1"
        >
          <option value="ai">Agree with AI</option>
          {(Object.entries(labels) as [T, string][])
            .filter(([v]) => v !== aiValue)
            .map(([v, l]) => (
              <option key={v} value={v}>
                Override → {l}
              </option>
            ))}
        </select>
        {override ? (
          <textarea
            value={override.rationale}
            onChange={(e) => onChange({ ...override, rationale: e.target.value })}
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
