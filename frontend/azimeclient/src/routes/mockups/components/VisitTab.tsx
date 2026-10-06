import { useRef, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ClipboardList, Lightbulb, Mic, Sparkles } from "lucide-react";
import { supportedRegions, type Region } from "@azime/contracts";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { mockupsRoute } from "..";
import type { PriorityResponse, Questionnaire, VisitDocument } from "../data";
import {
  checkNoteCoverage,
  mockCaseQueryOptions,
  mockPostExamQueryOptions,
  mockQuestionnairesQueryOptions,
  mockRefinedQueryOptions,
  mockVisitQueryOptions,
} from "../queries";
import { RecordDrawer } from "./RecordDetail";
import { Badge, Btn } from "./shared";

type Coverage = Awaited<ReturnType<typeof checkNoteCoverage>>;

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const fake = <T,>(value: T, ms = 700) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const nowLabel = () =>
  new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function VisitTab() {
  const { record } = mockupsRoute.useSearch();
  const queryClient = useQueryClient();
  const { data: mockCase } = useSuspenseQuery(mockCaseQueryOptions);
  const { data: visit } = useSuspenseQuery(mockVisitQueryOptions);
  const { data: questionnaires } = useSuspenseQuery(mockQuestionnairesQueryOptions);
  const refined = useSuspenseQueries({ queries: mockCase.regions.map((r) => mockRefinedQueryOptions(r)) });
  const postExam = useSuspenseQueries({ queries: mockCase.regions.map((r) => mockPostExamQueryOptions(r)) });

  const [draft, setDraft] = useState<VisitDocument>(visit);
  const dirty = JSON.stringify(draft) !== JSON.stringify(visit);

  // Regions with exam prep are the ones this visit feeds; each gets its own post-exam analysis.
  const preparedRegions = mockCase.regions.filter((_, i) => refined[i].data.analysis);
  const unpreparedRegions = mockCase.regions.filter((_, i) => !refined[i].data.analysis);
  const priorities = mockCase.regions.flatMap((region, i) =>
    (refined[i].data.analysis?.visitPriority ?? []).map((p) => ({ ...p, region })),
  );
  const lastRun = postExam.map((q) => q.data).find(Boolean);

  const save = useMutation({
    mutationFn: () => fake({ ...draft, revision: visit.revision + 1 }),
    onSuccess: (saved) => {
      queryClient.setQueryData(mockVisitQueryOptions.queryKey, saved);
      setDraft(saved);
    },
  });
  const runPostExam = useMutation({
    mutationFn: async () => {
      const saved = dirty ? await save.mutateAsync() : visit;
      await fake(null, 1200);
      const ranAt = nowLabel();
      for (const region of preparedRegions) {
        queryClient.setQueryData(mockPostExamQueryOptions(region).queryKey, () => ({ region, ranAt, visitRevision: saved.revision }));
      }
    },
  });

  const blocker = !draft.note.trim()
    ? "Add a visit note"
    : !draft.selectedPdqId
      ? "Select a PDQ to include"
      : null;

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="grid flex-1 grid-cols-[2fr_1fr] items-start gap-4 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-4">
            <NoteCard
              note={draft.note}
              regions={preparedRegions}
              onChange={(note) => setDraft((d) => ({ ...d, note }))}
            />
            <QuestionnairesCard
              questionnaires={questionnaires}
              selectedPdqId={draft.selectedPdqId}
              includedIds={draft.includedQuestionnaireIds}
              onSelectPdq={(id) => setDraft((d) => ({ ...d, selectedPdqId: id }))}
              onToggleIncluded={(id) =>
                setDraft((d) => ({
                  ...d,
                  includedQuestionnaireIds: d.includedQuestionnaireIds.includes(id)
                    ? d.includedQuestionnaireIds.filter((x) => x !== id)
                    : [...d.includedQuestionnaireIds, id],
                }))
              }
            />
            <section className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-slate-400" />
                <h2 className="text-[13.5px] font-semibold text-slate-600">Physician questions</h2>
                <Badge className="bg-slate-100 text-slate-500">coming later</Badge>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">Standardized questions for every IME: causation, apportionment, treatment necessity, work status, and next steps.</p>
            </section>
          </div>

          <PrioritiesColumn
            priorities={priorities}
            note={draft.note}
            responses={draft.responses}
            onChange={(responses) => setDraft((d) => ({ ...d, responses }))}
          />
        </div>

        <footer className="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-6px_16px_rgba(15,23,42,.05)]">
          <span className="text-[11px] text-slate-500">
            Post-exam analysis runs per region:{" "}
            <b className="text-slate-800">{preparedRegions.map(regionLabel).join(", ")}</b>
            {unpreparedRegions.length ? <> · {unpreparedRegions.map(regionLabel).join(", ")} has no exam prep, skipped</> : null}
          </span>
          <span className="flex-1" />
          {lastRun && !runPostExam.isPending ? (
            <span className="border-r border-slate-200 pr-3 text-[11px] text-green-700">
              Post-exam analysis ran {lastRun.ranAt} · visit rev {lastRun.visitRevision}
            </span>
          ) : null}
          <span className="text-[11px] text-slate-500">
            {save.isPending ? "Saving…" : dirty ? "Unsaved changes" : "Saved"} · rev {visit.revision}
          </span>
          <Btn disabled={!dirty || save.isPending} onClick={() => save.mutate()}>Save visit</Btn>
          <span title={blocker ?? undefined}>
            <Btn
              variant="primary"
              disabled={Boolean(blocker) || runPostExam.isPending}
              onClick={() => runPostExam.mutate()}
            >
              {runPostExam.isPending ? "Running post-exam analysis…" : blocker ? blocker : "Save & run post-exam analysis →"}
            </Btn>
          </span>
        </footer>
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}

function NoteCard({ note, regions, onChange }: { note: string; regions: Region[]; onChange: (note: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const words = note.trim() ? note.trim().split(/\s+/).length : 0;

  // Optional: label a section as pertaining to one region. Unlabeled text applies to all regions.
  const insertSection = (region: Region) => {
    const el = ref.current;
    const at = el?.selectionStart ?? note.length;
    const heading = `${at > 0 && note[at - 1] !== "\n" ? "\n" : ""}\n[${regionLabel(region).toUpperCase()}]\n`;
    onChange(note.slice(0, at) + heading + note.slice(at));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Visit note</h2>
        <span className="text-[11px] text-slate-500">Dictate or type. Address the priorities in your own words.</span>
        <span className="flex-1" />
        <Btn className="flex items-center gap-1.5"><Mic className="size-3.5" /> Dictate</Btn>
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
        <span className="text-slate-400">unlabeled text applies to every region</span>
        <span className="flex-1" />
        <span>{words} words</span>
      </div>
    </section>
  );
}

function QuestionnairesCard({
  questionnaires,
  selectedPdqId,
  includedIds,
  onSelectPdq,
  onToggleIncluded,
}: {
  questionnaires: Questionnaire[];
  selectedPdqId: string | null;
  includedIds: string[];
  onSelectPdq: (id: string) => void;
  onToggleIncluded: (id: string) => void;
}) {
  const pdqs = questionnaires.filter((q) => q.kind === "pdq");
  const others = questionnaires.filter((q) => q.kind === "other");

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Questionnaires</h2>
        <span className="text-[11px] text-slate-500">Administered by staff. Choose what the post-exam analysis should use.</span>
      </div>

      <div className="px-4 pt-3 text-[10.5px] font-bold tracking-[.05em] text-slate-500">PDQ · INCLUDE ONE</div>
      <RadioGroup value={selectedPdqId ?? ""} onValueChange={onSelectPdq} className="gap-0 px-2 py-1">
        {pdqs.map((q) => (
          <label key={q.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2", q.id === selectedPdqId && "bg-blue-50/50")}>
            <RadioGroupItem value={q.id} disabled={!q.completedAt} className="mt-0.5 size-4 border-slate-400 text-blue-600" />
            <QuestionnaireRow q={q} />
          </label>
        ))}
      </RadioGroup>

      <div className="border-t border-slate-100 px-4 pt-3 text-[10.5px] font-bold tracking-[.05em] text-slate-500">OTHER</div>
      <div className="px-2 pb-2 pt-1">
        {others.map((q) => (
          <label key={q.id} className={cn("flex items-start gap-3 rounded-lg px-2 py-2", q.completedAt ? "cursor-pointer" : "opacity-60")}>
            <input
              type="checkbox"
              disabled={!q.completedAt}
              checked={includedIds.includes(q.id)}
              onChange={() => onToggleIncluded(q.id)}
              className="mt-0.5 size-4 accent-blue-600"
            />
            <QuestionnaireRow q={q} />
          </label>
        ))}
      </div>
    </section>
  );
}

function QuestionnaireRow({ q }: { q: Questionnaire }) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 text-[12.5px]">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{q.name}</div>
        <div className="text-[11px] text-slate-500">
          {q.completedAt ? `Completed ${q.completedAt}` : "Not completed"} · {q.administeredBy}
        </div>
        {q.subscores ? (
          <div className="mt-1 flex gap-3 text-[11px] text-slate-500">
            {q.subscores.map(([label, value]) => (
              <span key={label}>{label} <b className="text-slate-700">{value}</b></span>
            ))}
          </div>
        ) : null}
      </div>
      {q.score ? (
        <div className="text-right">
          <div className="text-[14px] font-semibold">{q.score}</div>
          <div className="text-[11px] text-slate-500">{q.interpretation}</div>
        </div>
      ) : (
        <button type="button" className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">Resend</button>
      )}
      {q.completedAt ? (
        <button type="button" className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">View</button>
      ) : null}
    </div>
  );
}

const coverageStyle = {
  covered: { label: "In note", className: "bg-green-100 text-green-700" },
  partial: { label: "Partly in note", className: "bg-amber-100 text-amber-800" },
  missing: { label: "Not in note", className: "bg-slate-100 text-slate-600" },
} as const;

const quickResponses: { status: Exclude<PriorityResponse["status"], "response">; label: string }[] = [
  { status: "couldnt_assess", label: "Couldn't assess" },
  { status: "declined", label: "Patient declined" },
];

function PrioritiesColumn({
  priorities,
  note,
  responses,
  onChange,
}: {
  priorities: { id: string; region: Region; focus: string; whyItMatters: string; suggestedApproach: string | null }[];
  note: string;
  responses: PriorityResponse[];
  onChange: (responses: PriorityResponse[]) => void;
}) {
  const [coverage, setCoverage] = useState<{ result: Coverage; note: string } | null>(null);
  const check = useMutation({
    mutationFn: checkNoteCoverage,
    onSuccess: (result) => setCoverage({ result, note }),
  });

  const setResponse = (priorityId: string, next: PriorityResponse | null) =>
    onChange([...responses.filter((r) => r.priorityId !== priorityId), ...(next ? [next] : [])]);

  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-250px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13.5px] font-semibold">Visit priorities</h2>
          <Badge className="bg-slate-100 text-slate-600">{priorities.length}</Badge>
          <span className="flex-1" />
          <Btn onClick={() => check.mutate()} disabled={check.isPending || !note.trim()} className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-violet-600" />
            {check.isPending ? "Checking…" : coverage ? "Recheck note" : "Check note coverage"}
          </Btn>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Address these in your note. Marking them here is optional; use it for what the note won't say.
          {coverage && coverage.note !== note ? <span className="font-semibold text-amber-700"> Note changed since check.</span> : null}
        </p>
      </div>
      <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {priorities.map((p, i) => {
          const response = responses.find((r) => r.priorityId === p.id);
          const cov = coverage?.result[p.id];
          return (
            <li key={p.id} className="px-4 py-3">
              <Collapsible>
                <div className="flex items-start gap-2.5">
                  <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="rounded bg-slate-100 text-slate-600">{regionLabel(p.region).replace(" Spine", "")}</Badge>
                      {cov ? <Badge className={coverageStyle[cov.coverage].className}>{coverageStyle[cov.coverage].label}</Badge> : null}
                    </div>
                    <CollapsibleTrigger className="group mt-1 flex w-full items-start gap-1 text-left text-[13px] font-semibold text-slate-900">
                      <span className="flex-1">{p.focus}</span>
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-400 group-data-[state=open]:hidden" />
                      <ChevronDown className="mt-0.5 hidden size-4 shrink-0 text-slate-400 group-data-[state=open]:block" />
                    </CollapsibleTrigger>
                    {cov?.quote ? <p className="mt-1 border-l-2 border-slate-200 pl-2 text-[11.5px] italic text-slate-500">"{cov.quote}"</p> : null}
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
                          onClick={() => setResponse(p.id, response?.status === q.status ? null : { priorityId: p.id, status: q.status })}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            response?.status === q.status
                              ? "border-slate-800 bg-slate-800 text-white"
                              : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-800",
                          )}
                        >
                          {q.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setResponse(p.id, response?.status === "response" ? null : { priorityId: p.id, status: "response", text: "" })}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          response?.status === "response"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-800",
                        )}
                      >
                        + Response
                      </button>
                    </div>
                    {response?.status === "response" ? (
                      <textarea
                        autoFocus
                        rows={2}
                        value={response.text ?? ""}
                        onChange={(e) => setResponse(p.id, { ...response, text: e.target.value })}
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
      </ol>
    </aside>
  );
}
