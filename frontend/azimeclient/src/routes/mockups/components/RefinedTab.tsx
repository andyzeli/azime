import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Activity,
  CircleHelp,
  Lightbulb,
  MoveRight,
  Plus,
  Printer,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  supportedRegions,
  type Region,
  type StoredRefinedAnalysis,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import { mockupsRoute } from "..";
import type { RefinedSetup } from "../data";
import { examPrepStatus, generateExamPrep, type ExamPrepStatus } from "../examPrep";
import {
  mockCaseQueryOptions,
  mockPreExamQueryOptions,
  mockRefinedQueryOptions,
  mockReferralQuestionsQueryOptions,
} from "../queries";
import { RecordDrawer } from "./RecordDetail";
import { Badge, Btn, Segmented } from "./shared";

type Trajectory = StoredRefinedAnalysis["trajectoryAnalysis"]["subjectiveTrajectory"];

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const fake = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), 900));

const direction: Record<Trajectory["direction"], { icon: typeof Activity; className: string }> = {
  Improving: { icon: TrendingUp, className: "bg-green-50 text-green-700" },
  Stable: { icon: MoveRight, className: "bg-slate-100 text-slate-700" },
  Worsening: { icon: TrendingDown, className: "bg-red-50 text-red-700" },
  Fluctuating: { icon: Activity, className: "bg-amber-50 text-amber-700" },
  "Insufficient Data": { icon: CircleHelp, className: "bg-slate-50 text-slate-500" },
};

// Bars for the ordinal levels; "Conflicting" isn't a level, so it gets its own treatment.
const evidenceBars: Record<Trajectory["evidenceQuality"], number> = {
  Strong: 3,
  Moderate: 2,
  Sparse: 1,
  Absent: 0,
  Conflicting: 0,
};

const statusBadge: Record<ExamPrepStatus["kind"], { label: string; className: string }> = {
  "needs-steering": { label: "needs analysis review", className: "bg-slate-100 text-slate-500" },
  "not-generated": { label: "not generated", className: "bg-slate-100 text-slate-500" },
  stale: { label: "stale", className: "bg-amber-100 text-amber-800" },
  current: { label: "current", className: "bg-green-100 text-green-700" },
};

// Read-only exam prep for the whole case. Generation happens from Analysis;
// the only action here is regenerating regions that went stale.
export default function RefinedTab() {
  const { record } = mockupsRoute.useSearch();
  const queryClient = useQueryClient();
  const { data: mockCase } = useSuspenseQuery(mockCaseQueryOptions);
  const { data: questions } = useSuspenseQuery(mockReferralQuestionsQueryOptions);
  const refinedQueries = useSuspenseQueries({ queries: mockCase.regions.map((r) => mockRefinedQueryOptions(r)) });
  const preExamQueries = useSuspenseQueries({ queries: mockCase.regions.map((r) => mockPreExamQueryOptions(r)) });

  const regions = mockCase.regions.map((region, i) => {
    const refined = refinedQueries[i].data;
    const preExam = preExamQueries[i].data;
    return { region, refined, status: examPrepStatus(refined, preExam, questions) };
  });
  const stale = regions.filter((r) => r.status.kind === "stale");

  const regenerate = useMutation({
    mutationFn: () => Promise.all(stale.map((r) => generateExamPrep(queryClient, r.region))),
  });

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {stale.length ? (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
            <span className="flex-1">
              <b>Out of date:</b>{" "}
              {stale.map((r, i) => (
                <span key={r.region}>
                  {i > 0 ? "; " : ""}
                  {regionLabel(r.region)} ({r.status.kind === "stale" ? r.status.reasons.join(", ") : ""})
                </span>
              ))}
              . Showing the older results until regenerated.
            </span>
            <Btn variant="primary" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
              {regenerate.isPending ? "Regenerating…" : stale.length > 1 ? `Regenerate ${stale.length} regions` : "Regenerate"}
            </Btn>
          </div>
        ) : null}

        <section>
          <SectionHeading title="Trajectory" hint="By region. Each dimension is assessed independently; they can differ without contradicting each other." />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[150px_repeat(3,1fr)] border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
              <span className="px-4 py-2" />
              <span className="px-4 py-2">SUBJECTIVE <span className="font-medium normal-case tracking-normal text-slate-400">· symptoms</span></span>
              <span className="px-4 py-2">FUNCTIONAL <span className="font-medium normal-case tracking-normal text-slate-400">· activity, work</span></span>
              <span className="px-4 py-2">OBJECTIVE <span className="font-medium normal-case tracking-normal text-slate-400">· exam findings</span></span>
            </div>
            {regions.map(({ region, refined, status }) => {
              const t = refined.analysis?.trajectoryAnalysis;
              return (
                <div key={region} className="grid grid-cols-[150px_repeat(3,1fr)] border-b border-slate-100 last:border-b-0">
                  <div className="px-4 py-3.5">
                    <div className="text-[13px] font-semibold">{regionLabel(region)}</div>
                    <Badge className={cn("mt-1", statusBadge[status.kind].className)}>{statusBadge[status.kind].label}</Badge>
                    {refined.generatedAt ? <div className="mt-1 text-[10.5px] text-slate-400">{refined.generatedAt}</div> : null}
                  </div>
                  {t ? (
                    [t.subjectiveTrajectory, t.functionalTrajectory, t.objectiveTrajectory].map((traj, i) => (
                      <TrajectoryCell key={i} t={traj} />
                    ))
                  ) : (
                    <div className="col-span-3 flex items-center gap-2 px-4 py-3.5 text-[12.5px] text-slate-500">
                      {status.kind === "needs-steering" ? "Review this region's analysis, then generate exam prep." : "Exam prep not generated yet."}
                      <Link to="/mockups/analysis" search={{ region }} className="font-semibold text-blue-600 hover:text-blue-800">
                        Open in Analysis →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-[1fr_340px] items-start gap-4">
          <VisitPriorities regions={regions} />
          <ReferralQuestionsCard questions={questions} />
        </div>
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}

function VisitPriorities({
  regions,
}: {
  regions: { region: Region; refined: RefinedSetup; status: ExamPrepStatus }[];
}) {
  const [filter, setFilter] = useState<Region | "all">("all");
  const withPriorities = regions.filter((r) => r.refined.analysis?.visitPriority.length);
  // Union in case region order, keeping each region's model ranking.
  const priorities = withPriorities.flatMap(({ region, refined, status }) =>
    (refined.analysis?.visitPriority ?? []).map((p) => ({ ...p, region, stale: status.kind === "stale" })),
  );
  const visible = priorities.filter((p) => filter === "all" || p.region === filter);

  return (
    <section>
      <SectionHeading
        title="Visit priorities"
        hint="What this exam should clarify, across all regions. These carry into the Visit tab."
        action={
          <div className="flex items-center gap-2">
            {withPriorities.length > 1 ? (
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all" as const, label: `All ${priorities.length}` },
                  ...withPriorities.map(({ region, refined }) => ({
                    value: region,
                    label: `${regionLabel(region).replace(" Spine", "")} ${refined.analysis?.visitPriority.length}`,
                  })),
                ]}
              />
            ) : null}
            <Btn className="flex items-center gap-1.5"><Printer className="size-3.5" /> Print prep sheet</Btn>
          </div>
        }
      />
      <ol className="flex flex-col gap-3">
        {visible.map((p, i) => (
          <li key={p.id} className="flex gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-[14px] font-semibold text-slate-900">{p.focus}</h3>
                <Badge className={p.stale ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}>
                  {regionLabel(p.region)}{p.stale ? " · stale" : ""}
                </Badge>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700">{p.whyItMatters}</p>
              {p.suggestedApproach ? (
                <div className="mt-2.5 flex gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[12.5px] leading-relaxed text-blue-950">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-blue-600" />
                  <span>{p.suggestedApproach}</span>
                </div>
              ) : null}
            </div>
          </li>
        ))}
        {!visible.length ? (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">No visit priorities yet.</li>
        ) : null}
      </ol>
    </section>
  );
}

function ReferralQuestionsCard({ questions }: { questions: string[] }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(questions);
  const dirty = draft.join("\n") !== questions.join("\n");
  const save = useMutation({
    mutationFn: () => fake(draft.map((q) => q.trim()).filter(Boolean)),
    onSuccess: (saved) => {
      queryClient.setQueryData(mockReferralQuestionsQueryOptions.queryKey, saved);
      setDraft(saved);
    },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <h2 className="text-[13.5px] font-semibold">Referral questions</h2>
      <p className="mb-2.5 mt-0.5 text-[11px] text-slate-500">Usually entered by staff at intake. One set for the case; changes mark every region's exam prep stale.</p>
      <div className="flex flex-col gap-1.5">
        {draft.map((q, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 w-4 shrink-0 text-right text-[11px] font-semibold text-slate-400">{i + 1}.</span>
            <textarea
              rows={2}
              value={q}
              onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
              className="min-w-0 flex-1 resize-none rounded-md border border-slate-300 px-2 py-1 text-[12.5px] outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              className="mt-1 text-slate-400 hover:text-slate-800"
              aria-label="Remove question"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDraft((d) => [...d, ""])}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
        >
          <Plus className="size-3.5" /> Add question
        </button>
        <span className="flex-1" />
        {dirty ? (
          <>
            <Btn onClick={() => setDraft(questions)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Btn>
          </>
        ) : null}
      </div>
    </section>
  );
}

function SectionHeading({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <span className="text-[11px] text-slate-500">{hint}</span>
      <span className="flex-1" />
      {action}
    </div>
  );
}

function TrajectoryCell({ t }: { t: Trajectory }) {
  const { icon: Icon, className } = direction[t.direction];
  const conflicting = t.evidenceQuality === "Conflicting";
  return (
    <div className="border-l border-slate-100 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold", className)}>
          <Icon className="size-4" strokeWidth={2.4} />
          {t.direction}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500" title="Evidence quality">
          <span className="flex items-end gap-[2px]">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={cn(
                  "w-1 rounded-sm",
                  level === 1 ? "h-1.5" : level === 2 ? "h-2.5" : "h-3.5",
                  conflicting ? "bg-amber-400" : level <= evidenceBars[t.evidenceQuality] ? "bg-slate-700" : "bg-slate-200",
                )}
              />
            ))}
          </span>
          <span className={cn(conflicting && "font-semibold text-amber-700")}>{t.evidenceQuality}</span>
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-700">{t.interpretation}</p>
    </div>
  );
}
