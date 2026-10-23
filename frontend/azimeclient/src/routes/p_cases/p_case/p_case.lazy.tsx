import { useState, type ReactNode } from "react";
import { Link, Outlet, createLazyRoute } from "@tanstack/react-router";
import { caseQueryOptions } from "../queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Printer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockCaseQueryOptions } from "../../mockups/queries";
import { nextStep, useExamPrep } from "./examPrep";
import { ExamPrepModal, useExamPrepModal } from "./components/ExamPrepModal";

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
    | "/p_cases/$caseId/visit"
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

function TabGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="px-3.5 pt-2 text-[10px] font-bold tracking-[.07em] text-slate-400">
        {label}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

const Chevron = () => <ChevronRight className="mb-1 size-3.5 text-slate-300" />;
const GroupDivider = () => (
  <div className="mx-2 mb-1.5 h-11 w-px self-end bg-slate-200" />
);

export default function CockpitShell() {
  const { caseId } = Route.useParams();
  const { prep } = Route.useSearch();
  const prepModal = useExamPrepModal();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const patientName =
    [patientCase.patientName, patientCase.patientLastName]
      .filter(Boolean)
      .join(" ") || "Unnamed patient";
  // Workflow status remains mock data while the tabs are ported.
  const { data: mockCase } = useSuspenseQuery(mockCaseQueryOptions);
  const workflow = useExamPrep(caseId, patientCase.regions);
  const statuses = workflow.regions.map((r) => r.status.kind);
  // Dismissing hides only this message; a different next step shows again.
  const [dismissedHint, setDismissedHint] = useState<string>();
  const next = workflow.isPending ? null : nextStep(workflow.regions, workflow.visitSaved);
  const examPrep = {
    // The modal creates the sheet ("Update sheet"), so it opens once any steering is saved.
    available: workflow.regions.some((r) => r.refined || r.steeringSaved),
    stale: statuses.includes("stale"),
  };

  return (
    <div className="flex h-[calc(100vh-49px)] flex-col bg-slate-100 text-[13px] text-slate-900">
      {/* <Link to="/p_cases" className="text-sm text-blue-600 hover:underline">
        ← Provider cases
      </Link> */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5">
        <span className="text-[15px] font-semibold">
          {patientName} · Case #{caseId}
        </span>
        <span className="text-slate-500">Provider cockpit</span>
        <span className="flex-1" />
        {/* Optional printout, not a workflow step. Available once any region has saved steering. */}
        <button
          type="button"
          onClick={prepModal.open}
          disabled={!examPrep.available}
          title={examPrep.available ? undefined : "Save the treatment review in Analysis first"}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="size-3.5" /> Prep sheet
          {examPrep.stale ? (
            <span className="text-[11px] font-medium text-amber-700">out of date</span>
          ) : null}
        </button>
      </header>

      <nav
        aria-label="Case workflow"
        className="flex shrink-0 items-end border-b border-slate-200 bg-white px-3.5"
      >
        <TabGroup label="PREP">
          <WorkflowTab
            to="/p_cases/$caseId/records"
            n={1}
            status="done"
            label="Records"
            meta={String(mockCase.recordCount)}
          />
          <Chevron />
          <WorkflowTab
            to="/p_cases/$caseId/summary"
            n={2}
            status="done"
            label="Summary"
            meta="Pass 2 · Sep 28"
          />
          <Chevron />
          <WorkflowTab
            to="/p_cases/$caseId/analysis"
            n={3}
            status="current"
            label="Analysis"
            meta="2 of 3 regions"
          />
        </TabGroup>
        <GroupDivider />
        <TabGroup label="EXAM DAY">
          <WorkflowTab
            to="/p_cases/$caseId/visit"
            n={4}
            status="todo"
            label="Visit"
            meta="Oct 8"
          />
        </TabGroup>
        <GroupDivider />
        <TabGroup label="REPORT">
          <WorkflowTab
            to="/p_cases/$caseId/mmi"
            n={5}
            status="todo"
            label="MMI"
          />
          <Chevron />
          <WorkflowTab
            to="/p_cases/$caseId/report"
            n={6}
            status="todo"
            label="Report"
          />
        </TabGroup>
      </nav>

      {next && next.message !== dismissedHint ? (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-blue-200 bg-blue-50 px-5 py-2 text-[12.5px] text-blue-950">
          <b>Next:</b> {next.message}
          <Link
            to="/p_cases/$caseId/analysis"
            params={{ caseId }}
            search={{ region: next.region }}
            className="rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Go to Analysis →
          </Link>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setDismissedHint(next.message)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            dismiss <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <Outlet />
      </div>
      <ExamPrepModal caseId={caseId} open={Boolean(prep)} onClose={prepModal.close} />
    </div>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId")({
  component: CockpitShell,
});
