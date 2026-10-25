import { AmaClassScaleSelector } from "../components/AmaClassScaleSelector";
import { AmaFindingsCard } from "../components/AmaFindings";
import { useRef, useState } from "react";
import { createLazyRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  Mic,
  Printer,
} from "lucide-react";
import {
  initializeVisitDocumentation,
  currentDiagnoses,
  type AmaMode,
  type AmaAssessment,
  supportedRegions,
  type Region,
  isCurrentDiagnosis,
  type RegionDiagnosesResponse,
  type StoredRefinedAnalysis,
  type AmaTableSelection,
  type VisitAmaHistory,
  type VisitDocumentation,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  canonicalDiagnosesQueryOptions,
  caseQueryOptions,
  patientQuestionnairesQueryOptions,
  saveVisit,
  visitQueryOptions,
  type PatientQuestionnaireWithDefinition,
} from "../../../cases/queries";
import {
  isComponent,
  regionAmaCandidatesQueryOptions,
  toggleComponent,
  type AmaComponentKey,
} from "../amaAssessments";
import { sourceLabel } from "../components/AmaExamTasks";
import {
  diagnosisStatusLabel,
  diagnosisStatusTone,
} from "../components/DiagnosisList";
import { useExamPrepModal } from "../components/ExamPrepModal";
import { RecordDrawer } from "../components/RecordDetail";
import { Badge, Btn, Segmented } from "../components/shared";
import { NOTE_TEMPLATE, useExamPrep, visitBlocker } from "../examPrep";

type Priority = StoredRefinedAnalysis["visitPriority"][number] & {
  region: Region;
  stale: boolean;
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

function Tab() {
  const { caseId } = Route.useParams();
  const { record } = Route.useSearch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { data: visit } = useSuspenseQuery(visitQueryOptions(caseId));
  const { data: questionnaires } = useSuspenseQuery(
    patientQuestionnairesQueryOptions(caseId)
  );
  const examPrep = useExamPrep(caseId, patientCase.regions);
  const amaMode = patientCase.amaMode;
  const canonical = useQueries({
    queries: patientCase.regions.map((r) => canonicalDiagnosesQueryOptions(r)),
  });
  const dxLabel = (dx: string) =>
    canonical.flatMap((q) => q.data ?? []).find((d) => d.canonicalDx === dx)
      ?.label ?? dx.replace(/_/g, " ");

  const [draft, setDraft] = useState<VisitDocumentation>(
    () =>
      visit?.documentation ?? {
        ...initializeVisitDocumentation(),
        note: NOTE_TEMPLATE,
      }
  );
  const [dirty, setDirty] = useState(false);
  const edit = (fn: (d: VisitDocumentation) => VisitDocumentation) => {
    setDraft(fn);
    setDirty(true);
  };

  const priorities: Priority[] = examPrep.regions.flatMap(
    ({ region, refined, status }) =>
      (refined?.analysis.visitPriority ?? []).map((p) => ({
        ...p,
        region,
        stale: status.kind === "stale",
      }))
  );
  const visitKey = visitQueryOptions(caseId).queryKey;
  // Start over: saves a blank visit (a new revision; nothing else is touched).
  const clear = useMutation({
    mutationFn: () =>
      saveVisit(caseId, {
        documentation: { ...initializeVisitDocumentation(), note: NOTE_TEMPLATE },
        expectedRevision: visit?.revision ?? 0,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(visitKey, saved);
      setDraft(saved.documentation);
      setDirty(false);
    },
  });
  const save = useMutation({
    mutationFn: () =>
      saveVisit(caseId, {
        documentation: draft,
        expectedRevision: visit?.revision ?? 0,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(visitKey, saved);
      setDirty(false);
    },
  });

  const diagnosisRegions = examPrep.regions.flatMap(({ region, diagnoses }) =>
    diagnoses ? [{ region, list: diagnoses }] : []
  );
  // Shown as a hint; the post-exam analysis itself runs from Analysis.
  const blocker = visitBlocker(draft);
  const error = save.error ?? clear.error;

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="grid flex-1 grid-cols-[2fr_1fr] items-start gap-4 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-4">
            <NoteCard
              note={draft.note}
              regions={patientCase.regions}
              onChange={(note) => edit((d) => ({ ...d, note }))}
            />
            <DiagnosesCard
              caseId={caseId}
              regions={diagnosisRegions}
              history={draft.amaHistory}
              assessments={draft.amaAssessments}
              tableSelections={draft.amaTableSelections}
              amaMode={amaMode}
              dxLabel={dxLabel}
              onChange={(amaHistory, amaAssessments) =>
                edit((d) => ({ ...d, amaHistory, amaAssessments }))
              }
              onTableSelectionsChange={(amaTableSelections) =>
                edit((d) => ({ ...d, amaTableSelections }))
              }
            />
            <AmaFindingsCard
              caseId={caseId}
              regions={diagnosisRegions.map(({ region, list }) => ({
                region,
                diagnoses: list.diagnoses.map((d) => d.canonicalDx),
                current: currentDiagnoses(list.diagnoses),
              }))}
              assessments={draft.amaAssessments}
              amaMode={amaMode}
              dxLabel={dxLabel}
              onChange={(amaAssessments) =>
                edit((d) => ({ ...d, amaAssessments }))
              }
            />
            <QuestionnairesCard
              questionnaires={questionnaires}
              pdqId={draft.pdqId}
              includedIds={draft.includedQuestionnaireIds}
              onSelectPdq={(id) => edit((d) => ({ ...d, pdqId: id }))}
              onToggleIncluded={(id) =>
                edit((d) => ({
                  ...d,
                  includedQuestionnaireIds: d.includedQuestionnaireIds.includes(
                    id
                  )
                    ? d.includedQuestionnaireIds.filter((x) => x !== id)
                    : [...d.includedQuestionnaireIds, id],
                }))
              }
            />
            <section className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-slate-400" />
                <h2 className="text-[13.5px] font-semibold text-slate-600">
                  Physician questions
                </h2>
                <Badge className="bg-slate-100 text-slate-500">
                  coming later
                </Badge>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">
                Standardized questions for every IME: causation, apportionment,
                treatment necessity, work status, and next steps.
              </p>
            </section>
          </div>

          <PrioritiesColumn
            priorities={priorities}
          />
        </div>

        {/* TEMP debug: the last saved visit document as returned by GET/PUT /cases/:id/visit. */}
        <details className="mx-5 mb-4 rounded-xl border border-dashed border-slate-300 bg-white">
          <summary className="cursor-pointer px-4 py-2.5 text-[12px] font-semibold text-slate-600">
            Saved visit JSON (debug) · rev {visit?.revision ?? 0}
            {dirty ? " · draft has unsaved changes" : ""}
          </summary>
          <pre className="max-h-[600px] overflow-auto border-t border-slate-100 px-4 py-3 text-[11px] leading-snug text-slate-700">
            {visit ? JSON.stringify(visit, null, 2) : "Not saved yet"}
          </pre>
        </details>

        <footer className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-6px_16px_rgba(15,23,42,.05)]">
          <span className="text-[11px] text-slate-500">
            {blocker ? (
              <b className="text-amber-700">{blocker}</b>
            ) : (
              "Visit ready"
            )}{" "}
            · then finish the review and run the post-exam analysis in Analysis
          </span>
          <span className="flex-1" />
          {error ? (
            <span className="text-[11px] font-semibold text-red-700">
              {apiErrorMessage(error)}
            </span>
          ) : null}
          <span className="text-[11px] text-slate-500">
            {save.isPending
              ? "Saving…"
              : dirty
                ? "Unsaved changes"
                : visit
                  ? "Saved"
                  : "Not saved"}{" "}
            · rev {visit?.revision ?? 0}
          </span>
          <Btn
            disabled={save.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Clear the whole visit: note, PDQ choice and AMA findings? This saves immediately."
                )
              )
                clear.mutate();
            }}
          >
            Clear visit
          </Btn>
          <Btn
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            Save visit
          </Btn>
          {/* Saves first and stays here if that fails; never runs the post-exam analysis. */}
          <Btn
            variant="primary"
            disabled={save.isPending}
            onClick={() => {
              const toAnalysis = () => navigate({ to: "/p_cases/$caseId/analysis", params: { caseId } });
              if (dirty) save.mutate(undefined, { onSuccess: toAnalysis });
              else void toAnalysis();
            }}
          >
            {dirty ? "Save & continue to Analysis →" : "Continue to Analysis →"}
          </Btn>
        </footer>
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}

function NoteCard({
  note,
  regions,
  onChange,
}: {
  note: string;
  regions: Region[];
  onChange: (note: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const words = note.trim() ? note.trim().split(/\s+/).length : 0;

  // Optional: label a section as pertaining to one region. Unlabeled text applies to all regions.
  const insertSection = (region: Region) => {
    const at = ref.current?.selectionStart ?? note.length;
    const heading = `${at > 0 && note[at - 1] !== "\n" ? "\n" : ""}\n[${regionLabel(region).toUpperCase()}]\n`;
    onChange(note.slice(0, at) + heading + note.slice(at));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Visit note</h2>
        <span className="text-[11px] text-slate-500">
          Dictate or type. Address the priorities in your own words.
        </span>
        <span className="flex-1" />
        {/* TODO: dictation */}
        <Btn className="flex items-center gap-1.5">
          <Mic className="size-3.5" /> Dictate
        </Btn>
      </div>
      <textarea
        ref={ref}
        value={note}
        onChange={(e) => onChange(e.target.value)}
        className="block h-[440px] w-full resize-y px-4 py-3 text-[13px] leading-relaxed text-slate-800 outline-none"
        placeholder="History, exam findings, impressions…"
      />
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
        <span>Region section (optional):</span>
        {regions.map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => insertSection(region)}
            className="rounded border border-slate-300 px-1.5 py-0.5 font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-700"
          >
            + {regionLabel(region)}
          </button>
        ))}
        <span className="text-slate-400">
          unlabeled text applies to every region
        </span>
        <span className="flex-1" />
        <span>{words} words</span>
      </div>
    </section>
  );
}

// The region's current diagnoses (conclusions are set in Analysis) with their AMA
// prerequisites: the history answer, then the roots/sides (or non-root rows) whose
// findings are recorded. Nothing here is gated: findings can be recorded for any
// current diagnosis, and a "no" history answer rates it 0% regardless of them.
function DiagnosesCard({
  caseId,
  regions,
  history,
  assessments,
  tableSelections,
  amaMode,
  dxLabel,
  onChange,
  onTableSelectionsChange,
}: {
  caseId: string;
  regions: { region: Region; list: RegionDiagnosesResponse }[];
  history: VisitAmaHistory[];
  assessments: AmaAssessment[];
  tableSelections: AmaTableSelection[];
  amaMode: AmaMode;
  dxLabel: (dx: string) => string;
  onChange: (history: VisitAmaHistory[], assessments: AmaAssessment[]) => void;
  onTableSelectionsChange: (selections: AmaTableSelection[]) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Diagnoses</h2>
        <span className="flex-1 text-[11px] text-slate-500">
          Record AMA history and the affected roots for each diagnosis in scope.
        </span>
        <Link
          to="/p_cases/$caseId/analysis"
          params={{ caseId }}
          className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-800"
        >
          Edit diagnoses →
        </Link>
      </div>
      {regions.map(({ region, list }) => (
        <RegionDiagnoses
          key={region}
          caseId={caseId}
          region={region}
          list={list}
          history={history}
          assessments={assessments}
          tableSelections={tableSelections}
          amaMode={amaMode}
          dxLabel={dxLabel}
          onChange={onChange}
          onTableSelectionsChange={onTableSelectionsChange}
        />
      ))}
    </section>
  );
}

function RegionDiagnoses({
  caseId,
  region,
  list,
  history,
  assessments,
  tableSelections,
  amaMode,
  dxLabel,
  onChange,
  onTableSelectionsChange,
}: {
  caseId: string;
  region: Region;
  list: RegionDiagnosesResponse;
  history: VisitAmaHistory[];
  assessments: AmaAssessment[];
  tableSelections: AmaTableSelection[];
  // off: no AMA at all (saved assessments are kept, just not shown); guidance: rows, no rating tables.
  amaMode: AmaMode;
  dxLabel: (dx: string) => string;
  onChange: (history: VisitAmaHistory[], assessments: AmaAssessment[]) => void;
  onTableSelectionsChange: (selections: AmaTableSelection[]) => void;
}) {
  const current = list.diagnoses.filter(isCurrentDiagnosis);
  const excluded = list.diagnoses.filter((d) => !isCurrentDiagnosis(d));
  // Every listed diagnosis, so this shares one query with the AMA findings card.
  const candidates = useQuery({
    ...regionAmaCandidatesQueryOptions(
      caseId,
      region,
      list.diagnoses.map((d) => d.canonicalDx)
    ),
    enabled: amaMode !== "off" && list.diagnoses.length > 0,
  });
  const rowsById = new Map(
    (candidates.data?.rows ?? []).map((row) => [row.row_id, row])
  );
  const candidateFor = (dx: string) =>
    candidates.data?.diagnoses.find((d) => d.canonicalDx === dx);
  const rowsFor = (dx: string) =>
    (candidateFor(dx)?.candidateRowIds ?? []).flatMap(
      (id) => rowsById.get(id) ?? []
    );
  const regionAssessments = assessments.filter((a) => a.region === region);

  const historyOf = (dx: string) =>
    history.find((h) => h.region === region && h.canonicalDx === dx)?.confirmed;
  // Choosing the current answer again clears it.
  const setHistory = (dx: string, confirmed: boolean) =>
    onChange(
      [
        ...history.filter((h) => h.region !== region || h.canonicalDx !== dx),
        ...(historyOf(dx) === confirmed
          ? []
          : [{ region, canonicalDx: dx, confirmed }]),
      ],
      assessments
    );
  const toggle = (dx: string, key: AmaComponentKey) =>
    onChange(history, toggleComponent(assessments, key, dx));
  const linked = (dx: string, key: AmaComponentKey) =>
    regionAssessments.some(
      (a) => isComponent(a, key) && a.canonicalDxIds.includes(dx)
    );

  return (
    <div className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
      <div className="mb-1.5 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
        {regionLabel(region).toUpperCase()}
      </div>
      {current.map(({ canonicalDx: dx, status }) => {
        const rows = rowsFor(dx);
        const rootRows = rows.filter((r) => r.nerve_roots.length);
        const otherRows = rows.filter((r) => !r.nerve_roots.length);
        const answered = historyOf(dx);
        // Rated tables need the history answer too (myelopathy has tables only).
        const ratedTables =
          amaMode === "rating" && !!candidateFor(dx)?.candidateTableIds.length;
        return (
          <div key={dx} className="py-1">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="font-semibold">{dxLabel(dx)}</span>
              <Badge className={diagnosisStatusTone[status]}>
                {diagnosisStatusLabel[status]}
              </Badge>
            </div>
            {candidates.data && amaMode === "rating" ? (
              <AmaClassScaleSelector
                region={region}
                dx={dx}
                tables={candidates.data.ratingTables.filter((table) =>
                  candidateFor(dx)?.candidateTableIds.includes(table.table_id)
                )}
                selections={tableSelections}
                onChange={onTableSelectionsChange}
              />
            ) : null}
            {candidates.data ? (
              <div className="ml-3 mt-1.5 flex flex-col gap-2 border-l-2 border-slate-100 pl-3 text-[12px]">
                {!rows.length && !ratedTables ? (
                  candidateFor(dx)?.candidateTableIds.length ? (
                    <span className="text-slate-400">
                      Rating tables only (no rating requested).
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      No mapped AMA reference.
                    </span>
                  )
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-slate-700">
                      Residual symptoms and a mechanism consistent with this
                      diagnosis?
                    </span>
                    <Segmented
                      value={
                        answered === undefined ? undefined : answered ? "yes" : "no"
                      }
                      onChange={(v) => setHistory(dx, v === "yes")}
                      options={[
                        {
                          value: "yes",
                          label: "Yes",
                          activeClassName: "bg-slate-900 text-white",
                        },
                        {
                          value: "no",
                          label: "No",
                          activeClassName: "bg-slate-900 text-white",
                        },
                      ]}
                    />
                  </div>
                )}
                {answered === false ? (
                  <span className="text-slate-500">
                    Rated 0% WPI under AMA. Findings are still recorded.
                  </span>
                ) : null}
                {rootRows.length ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Affected roots
                    </span>
                    {rootRows.flatMap((row) =>
                      row.nerve_roots.map((root) => (
                        <span
                          key={root}
                          className="inline-flex items-center gap-1"
                        >
                          <span className="w-6 text-[11.5px] font-semibold text-slate-700">
                            {root}
                          </span>
                          {(["left", "right"] as const).map((side) => {
                            const key = {
                              region,
                              rowId: row.row_id,
                              nerveRoot: root,
                              side,
                            };
                            return (
                              <button
                                key={side}
                                type="button"
                                onClick={() => toggle(dx, key)}
                                className={cn(
                                  "rounded border px-1.5 py-px text-[11px] font-semibold",
                                  linked(dx, key)
                                    ? "border-blue-700 bg-blue-700 text-white"
                                    : "border-slate-300 text-slate-500 hover:border-slate-400"
                                )}
                              >
                                {side === "left" ? "L" : "R"}
                              </button>
                            );
                          })}
                        </span>
                      ))
                    )}
                  </div>
                ) : null}
                {otherRows.length ? (
                  <div className="flex flex-col gap-1">
                    {otherRows.map((row) => {
                      const key = {
                        region,
                        rowId: row.row_id,
                        nerveRoot: null,
                        side: null,
                      };
                      return (
                        <label
                          key={row.row_id}
                          className="flex cursor-pointer items-center gap-2 text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={linked(dx, key)}
                            onChange={() => toggle(dx, key)}
                            className="size-3.5 accent-blue-600"
                          />
                          {sourceLabel(row)}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {!current.length ? (
        <p className="py-1 text-[12.5px] text-slate-400">
          No diagnoses in scope.
        </p>
      ) : null}
      {excluded.length ? (
        <p className="mt-1 text-[11.5px] text-slate-400">
          Not supported (no exam tasks):{" "}
          {excluded.map((d) => dxLabel(d.canonicalDx)).join(", ")}
        </p>
      ) : null}
      {candidates.isError ? (
        <p className="mt-1 text-[11.5px] text-red-700">
          Could not load AMA rows: {apiErrorMessage(candidates.error)}
        </p>
      ) : null}
    </div>
  );
}

function QuestionnairesCard({
  questionnaires,
  pdqId,
  includedIds,
  onSelectPdq,
  onToggleIncluded,
}: {
  questionnaires: PatientQuestionnaireWithDefinition[];
  pdqId: number | null;
  includedIds: number[];
  onSelectPdq: (id: number) => void;
  onToggleIncluded: (id: number) => void;
}) {
  const pdqs = questionnaires.filter((q) => q.type === "pain_disability");
  const others = questionnaires.filter((q) => q.type !== "pain_disability");

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Questionnaires</h2>
        <span className="text-[11px] text-slate-500">
          Administered by staff. Choose what the post-exam analysis should use.
        </span>
      </div>

      <div className="px-4 pt-3 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
        PDQ · INCLUDE ONE
      </div>
      <RadioGroup
        value={pdqId === null ? "" : String(pdqId)}
        onValueChange={(v) => onSelectPdq(Number(v))}
        className="gap-0 px-2 py-1"
      >
        {pdqs.map((q) => (
          <label
            key={q.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2",
              q.id === pdqId && "bg-blue-50/50"
            )}
          >
            <RadioGroupItem
              value={String(q.id)}
              disabled={q.status !== "completed"}
              className="mt-0.5 size-4 border-slate-400 text-blue-600"
            />
            <QuestionnaireRow q={q} />
          </label>
        ))}
        {!pdqs.length ? (
          <p className="px-2 py-2 text-[12.5px] text-slate-400">
            No PDQ sent yet.
          </p>
        ) : null}
      </RadioGroup>

      <div className="border-t border-slate-100 px-4 pt-3 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
        OTHER
      </div>
      <div className="px-2 pb-2 pt-1">
        {others.map((q) => (
          <label
            key={q.id}
            className={cn(
              "flex items-start gap-3 rounded-lg px-2 py-2",
              q.status === "completed" ? "cursor-pointer" : "opacity-60"
            )}
          >
            <input
              type="checkbox"
              disabled={q.status !== "completed"}
              checked={includedIds.includes(q.id)}
              onChange={() => onToggleIncluded(q.id)}
              className="mt-0.5 size-4 accent-blue-600"
            />
            <QuestionnaireRow q={q} />
          </label>
        ))}
        {!others.length ? (
          <p className="px-2 py-2 text-[12.5px] text-slate-400">None sent.</p>
        ) : null}
      </div>
    </section>
  );
}

function QuestionnaireRow({ q }: { q: PatientQuestionnaireWithDefinition }) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 text-[12.5px]">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{q.definition?.title ?? q.type}</div>
        <div className="text-[11px] text-slate-500">
          {q.completedAt
            ? `Completed ${formatTime(String(q.completedAt))}`
            : "Not completed"}
        </div>
      </div>
      {q.scores ? (
        <div className="text-right">
          <div className="text-[14px] font-semibold">
            {q.scores.totalScore} / {q.scores.maxScore}
          </div>
          {q.scores.percentage !== null ? (
            <div className="text-[11px] text-slate-500">
              {Math.round(q.scores.percentage)}%
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Exam prep's priorities as read-only suggestions; anything they prompt goes in the note.
function PrioritiesColumn({ priorities }: { priorities: Priority[] }) {
  const prepModal = useExamPrepModal();
  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-250px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13.5px] font-semibold">Visit priorities</h2>
          <Badge className="bg-slate-100 text-slate-600">
            {priorities.length}
          </Badge>
          <span className="flex-1" />
          <button
            type="button"
            onClick={prepModal.open}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-800"
          >
            <Printer className="size-3.5" /> Prep sheet
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Suggestions from exam prep. Cover whatever matters in your note.
        </p>
      </div>
      <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {priorities.map((p, i) => (
          <li key={`${p.region}:${p.id}`} className="px-4 py-3">
            <Collapsible>
              <div className="flex items-start gap-2.5">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Badge
                    className={cn(
                      "rounded",
                      p.stale
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {regionLabel(p.region).replace(" Spine", "")}
                    {p.stale ? " · stale" : ""}
                  </Badge>
                  <CollapsibleTrigger className="group mt-1 flex w-full items-start gap-1 text-left text-[13px] font-semibold text-slate-900">
                    <span className="flex-1">{p.focus}</span>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-400 group-data-[state=open]:hidden" />
                    <ChevronDown className="mt-0.5 hidden size-4 shrink-0 text-slate-400 group-data-[state=open]:block" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1.5 space-y-1.5 text-[12px] leading-relaxed text-slate-600">
                    <p>{p.whyItMatters}</p>
                    {p.suggestedApproach ? (
                      <div className="flex gap-1.5 rounded-md bg-blue-50 px-2 py-1.5 text-blue-950">
                        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-blue-600" />
                        {p.suggestedApproach}
                      </div>
                    ) : null}
                  </CollapsibleContent>
                </div>
              </div>
            </Collapsible>
          </li>
        ))}
        {!priorities.length ? (
          <li className="p-6 text-center text-slate-500">
            No visit priorities. They come from the prep sheet (Analysis →
            Create prep sheet), and may be empty when nothing case-specific
            stands out.
          </li>
        ) : null}
      </ol>
    </aside>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId/visit")({
  component: Tab,
});
