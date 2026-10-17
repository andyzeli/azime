import { AmaClassScaleSelector } from "../components/AmaClassScaleSelector";
import { AmaFindingsCard } from "../components/AmaFindings";
import { useRef, useState } from "react";
import { createLazyRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import {
  effectiveAmaMode,
  initializeVisitDocumentation,
  type AmaMode,
  type AmaAssessment,
  supportedRegions,
  type Region,
  type RefinedAnalysisResponse,
  type StoredRefinedAnalysis,
  type VisitDiagnosisReview,
  type VisitDocumentation,
  type VisitPriorityResponse,
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
  postExamAnalysisQueryOptions,
  saveVisit,
  takePostExamSnapshot,
  visitQueryOptions,
  type PatientQuestionnaireWithDefinition,
} from "../../../cases/queries";
import {
  isComponent,
  regionAmaCandidatesQueryOptions,
  toggleComponent,
  unlinkDiagnosis,
  type AmaComponentKey,
} from "../amaAssessments";
import { sourceLabel } from "../components/AmaExamTasks";
import { RecordDrawer } from "../components/RecordDetail";
import { Badge, Btn, Segmented } from "../components/shared";
import { useExamPrep } from "../examPrep";

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

// Responses are keyed by region + focus because priority IDs are positional per exam prep run.
const sameResponse = (
  a: Pick<VisitPriorityResponse, "region" | "focus">,
  b: Pick<VisitPriorityResponse, "region" | "focus">
) => a.region === b.region && a.focus === b.focus;

// New visits start with these headings; an untouched template counts as an empty note.
const NOTE_TEMPLATE = "Chief complaint:\n\nHPI:\n\nSubjective:\n\nObjective:\n";

function Tab() {
  const { caseId } = Route.useParams();
  const { record } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { data: visit } = useSuspenseQuery(visitQueryOptions(caseId));
  const { data: questionnaires } = useSuspenseQuery(
    patientQuestionnairesQueryOptions(caseId)
  );
  const examPrep = useExamPrep(caseId, patientCase.regions);
  const amaMode = effectiveAmaMode(patientCase.caseType, patientCase.amaMode);
  const postExam = useQueries({
    queries: patientCase.regions.map((r) =>
      postExamAnalysisQueryOptions(caseId, r)
    ),
  });
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

  // Regions with exam prep are the ones this visit feeds; each gets its own post-exam analysis.
  const preparedRegions = examPrep.regions
    .filter((r) => r.refined)
    .map((r) => r.region);
  const unpreparedRegions = patientCase.regions.filter(
    (r) => !preparedRegions.includes(r)
  );
  const priorities: Priority[] = examPrep.regions.flatMap(
    ({ region, refined, status }) =>
      (refined?.analysis.visitPriority ?? []).map((p) => ({
        ...p,
        region,
        stale: status.kind === "stale",
      }))
  );
  const lastRun = postExam
    .map((q) => q.data)
    .filter((d) => d != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const visitKey = visitQueryOptions(caseId).queryKey;
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
  // Post-exam generation is gated on the backend until its prompt is final, so this
  // saves the visit and snapshots each prepared region's post-exam input.
  const runPostExam = useMutation({
    mutationFn: async () => {
      if (dirty || !visit) await save.mutateAsync();
      await Promise.all(
        preparedRegions.map(async (region) =>
          queryClient.setQueryData(
            postExamAnalysisQueryOptions(caseId, region).queryKey,
            await takePostExamSnapshot(caseId, region)
          )
        )
      );
    },
  });

  // A diagnosis rejected after a region's exam prep was generated: that region must be redone in Analysis first.
  const rejectedRegions = examPrep.regions.filter(({ region, refined }) =>
    draft.diagnosisReviews.some(
      (r) =>
        r.region === region &&
        r.status === "rejected" &&
        r.refinedUpdatedAt === refined?.updatedAt
    )
  );
  const blocker = rejectedRegions.length
    ? `Redo Analysis for ${rejectedRegions.map((r) => regionLabel(r.region)).join(", ")}`
    : draft.note.trim() === "" || draft.note.trim() === NOTE_TEMPLATE.trim()
      ? "Add a visit note"
      : draft.pdqId === null
        ? "Select a PDQ to include"
        : !preparedRegions.length
          ? "No exam prep yet"
          : null;
  const error = save.error ?? runPostExam.error;

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
              regions={examPrep.regions.flatMap((r) =>
                r.refined ? [{ region: r.region, refined: r.refined }] : []
              )}
              reviews={draft.diagnosisReviews}
              assessments={draft.amaAssessments}
              amaMode={amaMode}
              dxLabel={dxLabel}
              onChange={(diagnosisReviews, amaAssessments) =>
                edit((d) => ({ ...d, diagnosisReviews, amaAssessments }))
              }
            />
            <AmaFindingsCard
              caseId={caseId}
              regions={examPrep.regions.flatMap((r) => r.refined ?? [])}
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
            responses={draft.priorityResponses}
            onChange={(priorityResponses) =>
              edit((d) => ({ ...d, priorityResponses }))
            }
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
            Post-exam analysis runs per region:{" "}
            <b className="text-slate-800">
              {preparedRegions.length
                ? preparedRegions.map(regionLabel).join(", ")
                : "none yet"}
            </b>
            {unpreparedRegions.length ? (
              <>
                {" "}
                · {unpreparedRegions.map(regionLabel).join(", ")} has no exam
                prep, skipped
              </>
            ) : null}
          </span>
          <span className="flex-1" />
          {error ? (
            <span className="text-[11px] font-semibold text-red-700">
              {apiErrorMessage(error)}
            </span>
          ) : lastRun && !runPostExam.isPending ? (
            <span className="border-r border-slate-200 pr-3 text-[11px] text-green-700">
              Post-exam input taken {formatTime(lastRun.createdAt)} · visit rev{" "}
              {lastRun.inputSnapshot.basedOn.visitDocumentationRevision}
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
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            Save visit
          </Btn>
          <span title={blocker ?? undefined}>
            <Btn
              variant="primary"
              disabled={
                Boolean(blocker) || save.isPending || runPostExam.isPending
              }
              onClick={() => runPostExam.mutate()}
            >
              {runPostExam.isPending
                ? "Preparing post-exam analysis…"
                : (blocker ?? "Save & run post-exam analysis →")}
            </Btn>
          </span>
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

// Confirm or reject each diagnosis the region's exam prep was built on. A rejection
// (wrong or incomplete) sends the physician back to Analysis; the visit itself is kept.
// A confirmed diagnosis with AMA rows then goes through the AMA prerequisites:
// history, then the roots/sides (or non-root rows) that become rated components.
function DiagnosesCard({
  caseId,
  regions,
  reviews,
  assessments,
  amaMode,
  dxLabel,
  onChange,
}: {
  caseId: string;
  regions: { region: Region; refined: RefinedAnalysisResponse }[];
  reviews: VisitDiagnosisReview[];
  assessments: AmaAssessment[];
  amaMode: AmaMode;
  dxLabel: (dx: string) => string;
  onChange: (
    reviews: VisitDiagnosisReview[],
    assessments: AmaAssessment[]
  ) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Diagnoses</h2>
        <span className="text-[11px] text-slate-500">
          Confirm the working diagnoses. Reject one that is wrong or incomplete
          to redo that region's analysis.
        </span>
      </div>
      {regions.map(({ region, refined }) => (
        <RegionDiagnoses
          key={region}
          caseId={caseId}
          refined={refined}
          reviews={reviews}
          assessments={assessments}
          amaMode={amaMode}
          dxLabel={dxLabel}
          onChange={onChange}
        />
      ))}
      {!regions.length ? (
        <p className="px-4 py-3 text-[12.5px] text-slate-400">
          No exam prep yet.
        </p>
      ) : null}
    </section>
  );
}

function RegionDiagnoses({
  caseId,
  refined,
  reviews,
  assessments,
  amaMode,
  dxLabel,
  onChange,
}: {
  caseId: string;
  refined: RefinedAnalysisResponse;
  reviews: VisitDiagnosisReview[];
  assessments: AmaAssessment[];
  // off: no AMA at all (saved assessments are kept, just not shown); guidance: rows, no rating tables.
  amaMode: AmaMode;
  dxLabel: (dx: string) => string;
  onChange: (
    reviews: VisitDiagnosisReview[],
    assessments: AmaAssessment[]
  ) => void;
}) {
  const { region } = refined;
  const scope = refined.inputSnapshot.input.scope.diagnoses;
  const candidates = useQuery({
    ...regionAmaCandidatesQueryOptions(caseId, refined),
    enabled: amaMode !== "off",
  });
  const rowsById = new Map(
    (candidates.data?.rows ?? []).map((row) => [row.row_id, row])
  );
  const rowsFor = (dx: string) =>
    (
      candidates.data?.diagnoses.find((d) => d.canonicalDx === dx)
        ?.candidateRowIds ?? []
    ).flatMap((id) => rowsById.get(id) ?? []);
  const regionAssessments = assessments.filter((a) => a.region === region);

  const find = (dx: string) =>
    reviews.find((r) => r.region === region && r.canonicalDx === dx);
  const setReview = (
    canonicalDx: string,
    next:
      | (Pick<VisitDiagnosisReview, "status" | "note"> &
          Partial<Pick<VisitDiagnosisReview, "amaHistoryConfirmed">>)
      | null
  ) => {
    const current = find(canonicalDx);
    const others = reviews.filter((r) => r !== current);
    // Only a confirmed diagnosis that passed the history prerequisite is rated.
    const amaHistoryConfirmed =
      next?.status === "confirmed"
        ? (next.amaHistoryConfirmed ?? current?.amaHistoryConfirmed ?? null)
        : null;
    const nextAssessments = amaHistoryConfirmed
      ? assessments
      : unlinkDiagnosis(assessments, region, canonicalDx);
    if (!next) return onChange(others, nextAssessments);
    // A decision is tied to the exam prep it was made against; editing the note keeps that link.
    const refinedUpdatedAt =
      current?.status === next.status
        ? current.refinedUpdatedAt
        : refined.updatedAt;
    onChange(
      [
        ...others,
        { region, canonicalDx, ...next, amaHistoryConfirmed, refinedUpdatedAt },
      ],
      nextAssessments
    );
  };
  const toggle = (dx: string, key: AmaComponentKey) =>
    onChange(reviews, toggleComponent(assessments, key, dx));
  const linked = (dx: string, key: AmaComponentKey) =>
    regionAssessments.some(
      (a) => isComponent(a, key) && a.canonicalDxIds.includes(dx)
    );

  return (
    <div className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
      <div className="mb-1.5 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
        {regionLabel(region).toUpperCase()}
      </div>
      {scope.map((dx) => {
        const review = find(dx);
        const pending =
          review?.status === "rejected" &&
          review.refinedUpdatedAt === refined.updatedAt;
        const rows = rowsFor(dx);
        const rootRows = rows.filter((r) => r.nerve_roots.length);
        const otherRows = rows.filter((r) => !r.nerve_roots.length);
        return (
          <div key={dx} className="py-1">
            <div className="flex items-center gap-3 text-[12.5px]">
              <span
                className={cn(
                  "flex-1 font-semibold",
                  review?.status === "rejected" && "text-amber-800"
                )}
              >
                {dxLabel(dx)}
              </span>
              <Segmented
                value={review?.status}
                onChange={(status) =>
                  setReview(
                    dx,
                    review?.status === status
                      ? null
                      : { status, note: review?.note ?? null }
                  )
                }
                options={[
                  {
                    value: "confirmed",
                    label: "Confirm",
                    activeClassName: "bg-green-100 text-green-700",
                  },
                  {
                    value: "rejected",
                    label: "Reject",
                    activeClassName: "bg-amber-100 text-amber-800",
                  },
                ]}
              />
            </div>
            {review?.status === "rejected" ? (
              <div className="mt-1.5 flex items-start gap-2">
                <input
                  value={review.note ?? ""}
                  onChange={(e) =>
                    setReview(dx, {
                      status: "rejected",
                      note: e.target.value || null,
                    })
                  }
                  placeholder="What's wrong or missing?"
                  className="min-w-0 flex-1 rounded-md border border-amber-300 px-2 py-1 text-[12px] outline-none focus:border-amber-500"
                />
                {pending ? (
                  <Link
                    to="/p_cases/$caseId/analysis"
                    params={{ caseId }}
                    search={{ region }}
                    className="whitespace-nowrap pt-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Update in Analysis →
                  </Link>
                ) : (
                  <span className="whitespace-nowrap pt-1 text-[11px] text-slate-500">
                    exam prep redone since
                  </span>
                )}
              </div>
            ) : null}
            {review?.status === "confirmed" &&
            candidates.data &&
            amaMode === "rating" ? (
              <AmaClassScaleSelector
                key={`${caseId}:${region}:${dx}`}
                tables={candidates.data.ratingTables.filter((table) =>
                  candidates
                    .data!.diagnoses.find((d) => d.canonicalDx === dx)
                    ?.candidateTableIds.includes(table.table_id)
                )}
              />
            ) : null}
            {review?.status === "confirmed" && candidates.data ? (
              <div className="ml-3 mt-1.5 flex flex-col gap-2 border-l-2 border-slate-100 pl-3 text-[12px]">
                {!rows.length ? (
                  candidates.data.diagnoses.find((d) => d.canonicalDx === dx)
                    ?.candidateTableIds.length ? (
                    amaMode === "rating" ? null : (
                      <span className="text-slate-400">
                        Rating tables only (no rating requested).
                      </span>
                    )
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
                        review.amaHistoryConfirmed === null
                          ? undefined
                          : review.amaHistoryConfirmed
                            ? "yes"
                            : "no"
                      }
                      onChange={(v) =>
                        setReview(dx, {
                          status: "confirmed",
                          note: review.note,
                          amaHistoryConfirmed: v === "yes",
                        })
                      }
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
                {review.amaHistoryConfirmed === false ? (
                  <span className="text-slate-500">Not rated under AMA.</span>
                ) : null}
                {review.amaHistoryConfirmed && rootRows.length ? (
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
                {review.amaHistoryConfirmed && otherRows.length ? (
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

const quickResponses: {
  status: Exclude<VisitPriorityResponse["status"], "response">;
  label: string;
}[] = [
  { status: "couldnt_assess", label: "Couldn't assess" },
  { status: "declined", label: "Patient declined" },
  { status: "not_relevant", label: "Not relevant" },
];

function PrioritiesColumn({
  priorities,
  responses,
  onChange,
}: {
  priorities: Priority[];
  responses: VisitPriorityResponse[];
  onChange: (responses: VisitPriorityResponse[]) => void;
}) {
  const setResponse = (
    p: Priority,
    next: Pick<VisitPriorityResponse, "status" | "note"> | null
  ) =>
    onChange([
      ...responses.filter((r) => !sameResponse(r, p)),
      ...(next ? [{ region: p.region, focus: p.focus, ...next }] : []),
    ]);
  // Responses whose priority disappeared when exam prep was regenerated.
  const orphaned = responses.filter(
    (r) => !priorities.some((p) => sameResponse(r, p))
  );

  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-250px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13.5px] font-semibold">Visit priorities</h2>
          <Badge className="bg-slate-100 text-slate-600">
            {priorities.length}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Address these in your note. Marking them here is optional; use it for
          what the note won't say.
          {orphaned.length ? (
            <span className="font-semibold text-amber-700">
              {" "}
              {orphaned.length} earlier response{orphaned.length > 1 ? "s" : ""}{" "}
              no longer match a priority.
            </span>
          ) : null}
        </p>
      </div>
      <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {priorities.map((p, i) => {
          const response = responses.find((r) => sameResponse(r, p));
          return (
            <li key={`${p.region}:${p.id}`} className="px-4 py-3">
              <Collapsible>
                <div className="flex items-start gap-2.5">
                  <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                    </div>
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

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {quickResponses.map((q) => (
                        <button
                          key={q.status}
                          type="button"
                          onClick={() =>
                            setResponse(
                              p,
                              response?.status === q.status
                                ? null
                                : { status: q.status, note: null }
                            )
                          }
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            response?.status === q.status
                              ? "border-slate-800 bg-slate-800 text-white"
                              : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-800"
                          )}
                        >
                          {q.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setResponse(
                            p,
                            response?.status === "response"
                              ? null
                              : { status: "response", note: "" }
                          )
                        }
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          response?.status === "response"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-800"
                        )}
                      >
                        + Response
                      </button>
                    </div>
                    {response?.status === "response" ? (
                      <textarea
                        autoFocus
                        rows={2}
                        value={response.note ?? ""}
                        onChange={(e) =>
                          setResponse(p, {
                            status: "response",
                            note: e.target.value,
                          })
                        }
                        placeholder="Short answer, if the note doesn't cover it"
                        className="mt-1.5 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-[12px] outline-none focus:border-blue-400"
                      />
                    ) : null}
                  </div>
                </div>
              </Collapsible>
            </li>
          );
        })}
        {!priorities.length ? (
          <li className="p-6 text-center text-slate-500">
            No visit priorities yet. Generate exam prep from Analysis.
          </li>
        ) : null}
      </ol>
    </aside>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId/visit")({
  component: Tab,
});
