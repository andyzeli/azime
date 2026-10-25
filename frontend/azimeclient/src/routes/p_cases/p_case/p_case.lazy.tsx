import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  createLazyRoute,
  useRouterState,
} from "@tanstack/react-router";
import { supportedRegions, type Region } from "@azime/contracts";
import { caseQueryOptions } from "../queries";
import {
  caseReportQueryOptions,
  recordsQueryOptions,
  reportInputQueryOptions,
  visitQueryOptions,
} from "../../cases/queries";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Check, ChevronRight, Printer, Stethoscope, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextStep, useExamPrep, visitBlocker } from "./examPrep";
import { ExamPrepModal, useExamPrepModal } from "./components/ExamPrepModal";
import { CaseFacts } from "./components/CaseFacts";

type TabStatus = "done" | "current" | "stale" | "todo";

const statusIcon: Record<TabStatus, string> = {
  done: "bg-green-600 text-white",
  current: "bg-blue-600 text-white",
  stale: "bg-amber-500 text-white",
  todo: "border-[1.5px] border-slate-300 bg-white text-slate-400",
};

function WorkflowTab({
  to,
  n,
  status,
  label,
  meta,
  metaClassName,
}: {
  to:
    | "/p_cases/$caseId/records"
    | "/p_cases/$caseId/summary"
    | "/p_cases/$caseId/analysis"
    | "/p_cases/$caseId/mmi"
    | "/p_cases/$caseId/report";
  n: number;
  status: TabStatus;
  label: string;
  meta?: string;
  metaClassName?: string;
}) {
  const { caseId } = Route.useParams();

  return (
    <Link
      to={to}
      params={{ caseId }}
      className="-mb-px flex items-center gap-2 border-b-[2.5px] border-transparent px-3.5 pb-3 pt-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900"
      activeProps={{ className: "!border-blue-600 !text-blue-700" }}
    >
      <TabIcon n={n} status={status} />
      {label}
      {meta ? (
        <span
          className={cn(
            "text-[11.5px] font-medium text-slate-500",
            metaClassName
          )}
        >
          {meta}
        </span>
      ) : null}
    </Link>
  );
}

function TabIcon({ n, status }: { n: number; status: TabStatus }) {
  return (
    <span
      className={cn(
        "grid size-[17px] place-items-center rounded-full text-[10px] font-extrabold",
        statusIcon[status]
      )}
    >
      {status === "done" ? (
        <Check className="size-3" strokeWidth={3.5} />
      ) : status === "stale" ? (
        "!"
      ) : (
        n
      )}
    </span>
  );
}

const Chevron = () => <ChevronRight className="mb-1 size-3.5 text-slate-300" />;

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

type Step = {
  message: string;
  to: "summary" | "analysis" | "visit" | "mmi" | "report";
  region?: Region;
};

export default function CockpitShell() {
  const { caseId } = Route.useParams();
  const { prep } = Route.useSearch();
  const prepModal = useExamPrepModal();
  const queryClient = useQueryClient();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const patientName =
    [patientCase.patientName, patientCase.patientLastName]
      .filter(Boolean)
      .join(" ") || "Unnamed patient";
  const { data: records } = useQuery(recordsQueryOptions(caseId));
  const { data: visit } = useQuery(visitQueryOptions(caseId));
  const { data: report } = useQuery(caseReportQueryOptions(caseId));
  // Report readiness is the authority on what's outstanding; each blocker names its tab.
  // It changes as the physician works, so re-check on every tab switch.
  const readinessOptions = reportInputQueryOptions(caseId);
  const { data: readiness } = useQuery(readinessOptions);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: readinessOptions.queryKey });
  }, [pathname, queryClient, readinessOptions.queryKey]);
  const workflow = useExamPrep(caseId, patientCase.regions);
  const statuses = workflow.regions.map((r) => r.status.kind);
  // Dismissing hides only this message; a different next step shows again.
  const [dismissedHint, setDismissedHint] = useState<string>();
  const examPrep = {
    // The modal creates the sheet ("Update sheet"), so it opens once any steering is saved.
    available: workflow.regions.some((r) => r.refined || r.steeringSaved),
    stale: statuses.includes("stale"),
  };

  // Same check as the post-exam analysis gate, so an early draft never reads as documented.
  const visitMissing = visitBlocker(visit?.documentation);
  const visitState = !visit
    ? "not started"
    : visitMissing
      ? "draft"
      : "documented";

  const blockers = readiness?.blockers ?? [];
  const firstBlocker = (tab: Step["to"]) => blockers.find((b) => b.tab === tab);
  const toReview = workflow.regions.reduce(
    (n, r) => n + r.unreviewed + r.undecided,
    0
  );
  const status = {
    records: records?.length ? "done" : "current",
    summary: !readiness ? "todo" : firstBlocker("summary") ? "current" : "done",
    analysis:
      !readiness || firstBlocker("summary")
        ? "todo"
        : firstBlocker("analysis")
          ? "current"
          : "done",
    mmi:
      !readiness || firstBlocker("analysis")
        ? "todo"
        : firstBlocker("mmi")
          ? "current"
          : "done",
    report: !readiness?.input ? "todo" : report ? "done" : "current",
  } satisfies Record<string, TabStatus>;
  const analysisMeta = !workflow.visitSaved
    ? workflow.regions.some((r) => r.analysisRun)
      ? "finish after visit"
      : "not run"
    : toReview
      ? `${toReview} to review`
      : firstBlocker("analysis")
        ? "post-exam analysis due"
        : undefined;

  // One next step for the whole case, in workflow order.
  const analysisStep = workflow.isPending
    ? null
    : nextStep(workflow.regions, workflow.visitSaved);
  const fromBlocker = (tab: Step["to"]): Step | null => {
    const b = firstBlocker(tab);
    return b
      ? {
          message: b.region
            ? `${b.message} (${regionLabel(b.region)})`
            : b.message,
          to: tab,
          region: b.region ?? undefined,
        }
      : null;
  };
  const step: Step | null =
    fromBlocker("summary") ??
    (analysisStep ? { ...analysisStep, to: "analysis" } : null) ??
    (visitMissing
      ? {
          message: visit
            ? `Finish the visit: ${visitMissing.charAt(0).toLowerCase()}${visitMissing.slice(1)}.`
            : "Document the visit.",
          to: "visit",
        }
      : null) ??
    fromBlocker("analysis") ??
    fromBlocker("mmi") ??
    (readiness?.input && !report
      ? { message: "Generate the report.", to: "report" }
      : null);
  // The optional prep step mentions Visit too, so the button is highlighted then as well.
  const visitNext =
    step?.to === "visit" || Boolean(visitMissing && analysisStep?.optional);

  return (
    <div className="flex h-[calc(100vh-49px)] flex-col bg-slate-100 text-[13px] text-slate-900">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5">
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold">{patientName}</span>
          {patientCase.caseType ? (
            <span className="text-[11.5px] text-slate-500">
              {/* Stored as e.g. "work_injury". */}
              {patientCase.caseType.charAt(0).toUpperCase() +
                patientCase.caseType.slice(1).replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
        <CaseFacts patientCase={patientCase} />

        <span className="flex-1" />
        {/* Visit sits outside the tab strip: Analysis feeds it before the exam (prep sheet,
            priorities) and needs it after, so no position in a linear strip fits. */}
        <Link
          to="/p_cases/$caseId/visit"
          params={{ caseId }}
          title={visitMissing ?? undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-semibold",
            visitNext
              ? "border-blue-600 text-blue-700 ring-2 ring-blue-200"
              : "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900"
          )}
          activeProps={{
            className: "!border-blue-600 !bg-blue-600 !text-white",
          }}
        >
          {({ isActive }) => (
            <>
              <Stethoscope className="size-3.5" /> Visit
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isActive
                    ? "text-blue-100"
                    : visitState === "documented"
                      ? "text-green-700"
                      : visitState === "draft"
                        ? "text-amber-700"
                        : "text-slate-500"
                )}
              >
                {visitState === "documented" ? "✓ documented" : visitState}
              </span>
            </>
          )}
        </Link>
        {/* Optional printout, not a workflow step. Available once any region has saved steering. */}
        <button
          type="button"
          onClick={prepModal.open}
          disabled={!examPrep.available}
          title={
            examPrep.available
              ? undefined
              : "Save the treatment review in Analysis first"
          }
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="size-3.5" /> Prep sheet
          {examPrep.stale ? (
            <span className="text-[11px] font-medium text-amber-700">
              out of date
            </span>
          ) : null}
        </button>
      </header>

      <nav
        aria-label="Case workflow"
        className="flex shrink-0 items-center border-b border-slate-200 bg-white px-3.5 pt-1"
      >
        <WorkflowTab
          to="/p_cases/$caseId/records"
          n={1}
          status={status.records}
          label="Records"
          meta={records ? String(records.length) : undefined}
        />
        <Chevron />
        <WorkflowTab
          to="/p_cases/$caseId/summary"
          n={2}
          status={status.summary}
          label="Summary"
        />
        <Chevron />
        <WorkflowTab
          to="/p_cases/$caseId/analysis"
          n={3}
          status={status.analysis}
          label="Analysis"
          meta={analysisMeta}
          metaClassName={
            workflow.visitSaved && analysisMeta ? "text-amber-700" : undefined
          }
        />
        <Chevron />
        <WorkflowTab
          to="/p_cases/$caseId/mmi"
          n={4}
          status={status.mmi}
          label="Opinions"
          meta={status.mmi === "current" ? "decisions due" : undefined}
          metaClassName="text-amber-700"
        />
        <Chevron />
        <WorkflowTab
          to="/p_cases/$caseId/report"
          n={5}
          status={status.report}
          label="Report"
          meta={status.report === "current" ? "ready" : undefined}
        />
      </nav>

      {step && step.message !== dismissedHint ? (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-blue-200 bg-blue-50 px-5 py-2 text-[12.5px] text-blue-950">
          <b>Next:</b> {step.message}
          {step.to === "analysis" ? (
            <Link
              to="/p_cases/$caseId/analysis"
              params={{ caseId }}
              search={{ region: step.region }}
              className="rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Go to Analysis →
            </Link>
          ) : (
            <Link
              to={`/p_cases/$caseId/${step.to}`}
              params={{ caseId }}
              className="rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Go to {stepLabel[step.to]} →
            </Link>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setDismissedHint(step.message)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            dismiss <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <Outlet />
      </div>
      <ExamPrepModal
        caseId={caseId}
        open={Boolean(prep)}
        onClose={prepModal.close}
      />
    </div>
  );
}

const stepLabel: Record<Step["to"], string> = {
  summary: "Summary",
  analysis: "Analysis",
  visit: "Visit",
  mmi: "Opinions",
  report: "Report",
};

export const Route = createLazyRoute("/p_cases/$caseId")({
  component: CockpitShell,
});
