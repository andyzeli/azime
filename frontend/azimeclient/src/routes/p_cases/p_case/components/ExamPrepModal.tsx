import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity,
  CircleHelp,
  Lightbulb,
  MoveRight,
  Printer,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  effectiveAmaMode,
  supportedRegions,
  type RefinedAnalysisResponse,
  type Region,
  type StoredRefinedAnalysis,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  caseQueryOptions,
  generateRefinedAnalysis,
  refinedAnalysisQueryOptions,
} from "../../../cases/queries";
import { AmaExamTasks, AmaModeControl } from "./AmaExamTasks";
import { Badge, Btn, Segmented } from "./shared";
import { useExamPrep, type ExamPrepStatus } from "../examPrep";

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

// The modal is driven by the case route's ?prep search param, so any tab or link can open it.
export function useExamPrepModal() {
  const navigate = useNavigate();
  const set = (prep: true | undefined) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, prep }),
    } as never);
  return { open: () => set(true), close: () => set(undefined) };
}

// The printable exam prep sheet. Opening it never runs AI: it shows the last generated
// trajectory and priorities, plus AMA tasks looked up live from the current diagnoses
// and AMA setting. "Update sheet" regenerates out-of-date regions; Print prints what is shown.
export function ExamPrepModal({
  caseId,
  open,
  onClose,
}: {
  caseId: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-prep-sheet
        className="flex h-[92vh] w-[95vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 print:static print:h-auto print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:border-0 print:shadow-none [&>button:last-child]:hidden"
      >
        {open ? <Sheet caseId={caseId} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Sheet({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { isPending, regions } = useExamPrep(caseId, patientCase.regions);
  const mode = effectiveAmaMode(patientCase.caseType, patientCase.amaMode);
  // Out of date or not generated yet; a run needs the region's steering saved in Analysis.
  const outdated = regions.filter(
    (r) => r.status.kind === "stale" || r.status.kind === "not-generated"
  );
  const updatable = outdated.filter((r) => r.steeringSaved);
  const blocked = outdated.filter((r) => !r.steeringSaved);
  const patientName =
    [patientCase.patientName, patientCase.patientLastName].filter(Boolean).join(" ") ||
    "Unnamed patient";

  const update = useMutation({
    mutationFn: () =>
      Promise.all(
        updatable.map(async ({ region }) =>
          queryClient.setQueryData(
            refinedAnalysisQueryOptions(caseId, region).queryKey,
            await generateRefinedAnalysis(caseId, region)
          )
        )
      ),
  });

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 print:hidden">
        <DialogTitle className="text-[15px] font-semibold">Exam prep sheet</DialogTitle>
        <span className="text-[11px] text-slate-500">
          {outdated.length
            ? `Out of date or missing: ${outdated.map((r) => regionLabel(r.region)).join(", ")}`
            : regions.some((r) => r.refined)
              ? "Up to date"
              : null}
          {blocked.length ? (
            <span className="text-amber-700">
              {" "}
              · save steering in Analysis to update {blocked.map((r) => regionLabel(r.region)).join(", ")}
            </span>
          ) : null}
        </span>
        {update.isError ? (
          <span className="text-[11px] font-semibold text-red-700">{apiErrorMessage(update.error)}</span>
        ) : null}
        <span className="flex-1" />
        <AmaModeControl caseId={caseId} caseType={patientCase.caseType} amaMode={patientCase.amaMode} />
        <Btn
          disabled={!updatable.length || update.isPending}
          onClick={() => update.mutate()}
          title="Regenerates trajectory and priorities for out-of-date regions"
        >
          {update.isPending ? "Updating…" : "Update sheet"}
        </Btn>
        <Btn variant="primary" className="flex items-center gap-1.5" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print
        </Btn>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4 print:overflow-visible print:bg-white print:p-0">
        {isPending ? (
          <p className="text-slate-500">Loading exam prep…</p>
        ) : !regions.length ? (
          <p className="text-slate-500">Add body regions to the case to prepare the exam.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="hidden print:block">
              <h1 className="text-[16px] font-semibold">
                Exam prep · {patientName} · Case #{caseId}
              </h1>
            </div>
            <TrajectorySection caseId={caseId} regions={regions} onClose={onClose} />
            <VisitPriorities regions={regions} />
            <AmaExamTasks caseId={caseId} regions={patientCase.regions} mode={mode} />
            <Provenance regions={regions} />
          </div>
        )}
      </div>
    </>
  );
}

// Printed with the sheet: the frozen part (trajectory, priorities) can be older than
// the live part (AMA tasks), so the sheet says which inputs it reflects.
function Provenance({ regions }: { regions: RegionPrep[] }) {
  return (
    <footer className="border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">
      {regions.map(({ region, refined, status }) => (
        <div key={region}>
          {regionLabel(region)}:{" "}
          {refined?.analysis
            ? `trajectory and priorities generated ${formatTime(refined.updatedAt)}`
            : "trajectory and priorities not generated"}
          {status.kind === "stale" ? ` · inputs changed since (${status.reasons.join(", ")})` : ""}
        </div>
      ))}
      <div>AMA tasks reflect the current diagnoses as of {formatTime(new Date().toISOString())}.</div>
    </footer>
  );
}

function TrajectorySection({
  caseId,
  regions,
  onClose,
}: {
  caseId: string;
  regions: RegionPrep[];
  onClose: () => void;
}) {
  return (
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
                <Badge className={cn("mt-1 print:hidden", statusBadge[status.kind].className)}>{statusBadge[status.kind].label}</Badge>
              </div>
              {t ? (
                [t.subjectiveTrajectory, t.functionalTrajectory, t.objectiveTrajectory].map((traj, i) => (
                  <TrajectoryCell key={i} t={traj} />
                ))
              ) : (
                <div className="col-span-3 flex items-center gap-2 px-4 py-3.5 text-[12.5px] text-slate-500">
                  {status.kind === "needs-steering" ? "Save this region's steering in Analysis, then update the prep sheet." : "Not generated yet. Use Update sheet."}
                  <Link
                    to="/p_cases/$caseId/analysis"
                    params={{ caseId }}
                    search={{ region }}
                    onClick={onClose}
                    className="font-semibold text-blue-600 hover:text-blue-800 print:hidden"
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
          <div className="flex items-center gap-2 print:hidden">
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

