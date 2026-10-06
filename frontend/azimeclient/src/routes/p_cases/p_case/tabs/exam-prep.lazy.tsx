import { useState } from "react";
import { createLazyRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity,
  CircleHelp,
  Lightbulb,
  MoveRight,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  supportedRegions,
  type RefinedAnalysisResponse,
  type Region,
  type StoredRefinedAnalysis,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import { caseQueryOptions, refinedAnalysisQueryOptions } from "../../../cases/queries";
import { Badge, Btn, Segmented } from "../components/shared";
import { generateExamPrep, useExamPrep, type ExamPrepStatus } from "../examPrep";

type Trajectory = StoredRefinedAnalysis["trajectoryAnalysis"]["subjectiveTrajectory"];
type RegionPrep = { region: Region; refined: RefinedAnalysisResponse | null; status: ExamPrepStatus };

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// redaxios rejects with the response; the backend sends { error } bodies.
const apiErrorMessage = (error: unknown) =>
  (error as { data?: { error?: string } } | null)?.data?.error ?? "Request failed";

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
function Tab() {
  const { caseId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { isPending, regions } = useExamPrep(caseId, patientCase.regions);
  const stale = regions.filter((r) => r.status.kind === "stale");

  const regenerate = useMutation({
    mutationFn: () =>
      Promise.all(
        stale.map(async ({ region, refined }) =>
          queryClient.setQueryData(
            refinedAnalysisQueryOptions(caseId, region).queryKey,
            await generateExamPrep(caseId, region, refined),
          ),
        ),
      ),
  });

  if (isPending) return <main className="flex-1 p-5 text-slate-500">Loading exam prep…</main>;
  if (!regions.length) {
    return <main className="grid flex-1 place-items-center text-slate-500">Add body regions to the case to prepare the exam.</main>;
  }

  return (
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
            {regenerate.isError ? <span className="ml-2 font-semibold text-red-700">{apiErrorMessage(regenerate.error)}</span> : null}
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
            const t = refined?.analysis?.trajectoryAnalysis;
            return (
              <div key={region} className="grid grid-cols-[150px_repeat(3,1fr)] border-b border-slate-100 last:border-b-0">
                <div className="px-4 py-3.5">
                  <div className="text-[13px] font-semibold">{regionLabel(region)}</div>
                  <Badge className={cn("mt-1", statusBadge[status.kind].className)}>{statusBadge[status.kind].label}</Badge>
                  {refined?.analysis ? <div className="mt-1 text-[10.5px] text-slate-400">{formatTime(refined.updatedAt)}</div> : null}
                </div>
                {t ? (
                  [t.subjectiveTrajectory, t.functionalTrajectory, t.objectiveTrajectory].map((traj, i) => (
                    <TrajectoryCell key={i} t={traj} />
                  ))
                ) : (
                  <div className="col-span-3 flex items-center gap-2 px-4 py-3.5 text-[12.5px] text-slate-500">
                    {status.kind === "needs-steering" ? "Review this region's analysis, then generate exam prep." : "Exam prep not generated yet."}
                    <Link
                      to="/p_cases/$caseId/analysis"
                      params={{ caseId }}
                      search={{ region }}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
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
        <ReferralQuestionsCard regions={regions} />
      </div>
    </main>
  );
}

function VisitPriorities({ regions }: { regions: RegionPrep[] }) {
  const [filter, setFilter] = useState<Region | "all">("all");
  const withPriorities = regions.filter((r) => r.refined?.analysis?.visitPriority.length);
  // Union in case region order, keeping each region's model ranking.
  const priorities = withPriorities.flatMap(({ region, refined, status }) =>
    (refined?.analysis?.visitPriority ?? []).map((p) => ({ ...p, region, stale: status.kind === "stale" })),
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
                    label: `${regionLabel(region).replace(" Spine", "")} ${refined?.analysis?.visitPriority.length}`,
                  })),
                ]}
              />
            ) : null}
            <Btn className="flex items-center gap-1.5" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print prep sheet
            </Btn>
          </div>
        }
      />
      <ol className="flex flex-col gap-3">
        {visible.map((p, i) => (
          <li key={`${p.region}:${p.id}`} className="flex gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
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

// Interim: questions live on each region's exam prep snapshot until they are stored per case.
function ReferralQuestionsCard({ regions }: { regions: RegionPrep[] }) {
  const questions = [...new Set(regions.flatMap((r) => r.refined?.inputSnapshot.input.referralQuestions ?? []))];

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <h2 className="text-[13.5px] font-semibold">Referral questions</h2>
      <p className="mb-2.5 mt-0.5 text-[11px] text-slate-500">As used by the current exam prep.</p>
      {questions.length ? (
        <ol className="flex flex-col gap-1.5">
          {questions.map((q, i) => (
            <li key={q} className="flex gap-1.5 text-[12.5px] leading-snug">
              <span className="w-4 shrink-0 text-right text-[11px] font-semibold text-slate-400">{i + 1}.</span>
              <span>{q}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[12.5px] text-slate-400">None.</p>
      )}
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

export const Route = createLazyRoute("/p_cases/$caseId/exam-prep")({
  component: Tab,
});
