import { useState, type ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { useQueries, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { examPrepStatus } from "../examPrep";
import {
  mockCaseQueryOptions,
  mockPreExamQueryOptions,
  mockRefinedQueryOptions,
  mockReferralQuestionsQueryOptions,
} from "../queries";

// Exam prep tab status across regions. Non-suspense: the shell shouldn't wait on per-region data.
function useExamPrepSummary(regions: string[]) {
  const questions = useQuery(mockReferralQuestionsQueryOptions).data;
  const refined = useQueries({ queries: regions.map((r) => mockRefinedQueryOptions(r)) });
  const preExam = useQueries({ queries: regions.map((r) => mockPreExamQueryOptions(r)) });
  const statuses = regions.flatMap((_, i) => {
    const a = refined[i].data;
    const b = preExam[i].data;
    return a && b && questions ? [examPrepStatus(a, b, questions).kind] : [];
  });
  return {
    stale: statuses.includes("stale"),
    current: statuses.includes("current") && !statuses.includes("stale"),
  };
}

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
  to: "/mockups/records" | "/mockups/summary" | "/mockups/analysis" | "/mockups/exam-prep" | "/mockups/visit";
  n: number;
  status: TabStatus;
  label: string;
  meta?: string;
  metaClassName?: string;
}) {
  return (
    <Link
      to={to}
      className="-mb-px flex items-center gap-2 border-b-[2.5px] border-transparent px-3.5 pb-3 pt-2.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900"
      activeProps={{ className: "!border-blue-600 !text-blue-700" }}
    >
      <TabIcon n={n} status={status} />
      {label}
      {meta ? (
        <span className={cn("text-[11.5px] font-medium text-slate-500", metaClassName)}>{meta}</span>
      ) : null}
    </Link>
  );
}

function TabIcon({ n, status }: { n: number; status: TabStatus }) {
  return (
    <span
      className={cn(
        "grid size-[17px] place-items-center rounded-full text-[10px] font-extrabold",
        statusIcon[status],
      )}
    >
      {status === "done" ? <Check className="size-3" strokeWidth={3.5} /> : status === "stale" ? "!" : n}
    </span>
  );
}

// Tabs for steps not built in the mockup yet.
function PlaceholderTab({ n, label }: { n: number; label: string }) {
  return (
    <span className="flex cursor-not-allowed items-center gap-2 px-3.5 pb-3 pt-2.5 text-[13px] font-semibold text-slate-400">
      <TabIcon n={n} status="todo" />
      {label}
    </span>
  );
}

function TabGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="px-3.5 pt-2 text-[10px] font-bold tracking-[.07em] text-slate-400">{label}</div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

const Chevron = () => <ChevronRight className="mb-1 size-3.5 text-slate-300" />;
const GroupDivider = () => <div className="mx-2 mb-1.5 h-11 w-px self-end bg-slate-200" />;

export default function CockpitShell() {
  const { data: mockCase } = useSuspenseQuery(mockCaseQueryOptions);
  const [hintDismissed, setHintDismissed] = useState(false);
  const examPrep = useExamPrepSummary(mockCase.regions);

  return (
    <div className="flex h-[calc(100vh-49px)] flex-col bg-slate-100 text-[13px] text-slate-900">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5">
        <span className="text-[15px] font-semibold">
          {mockCase.patient} · {mockCase.claim}
        </span>
        <span className="text-slate-500">
          DOI {mockCase.dateOfInjury} · Exam {mockCase.examDate}
        </span>
      </header>

      <nav aria-label="Case workflow" className="flex shrink-0 items-end border-b border-slate-200 bg-white px-3.5">
        <TabGroup label="PREP">
          <WorkflowTab to="/mockups/records" n={1} status="done" label="Records" meta={String(mockCase.recordCount)} />
          <Chevron />
          <WorkflowTab to="/mockups/summary" n={2} status="done" label="Summary" meta="Pass 2 · Sep 28" />
          <Chevron />
          <WorkflowTab to="/mockups/analysis" n={3} status="current" label="Analysis" meta="2 of 3 regions" />
          <Chevron />
          <WorkflowTab
            to="/mockups/exam-prep"
            n={4}
            status={examPrep.stale ? "stale" : examPrep.current ? "done" : "todo"}
            label="Exam prep"
            meta={examPrep.stale ? "stale" : undefined}
            metaClassName="text-amber-700"
          />
        </TabGroup>
        <GroupDivider />
        <TabGroup label="EXAM DAY">
          <WorkflowTab to="/mockups/visit" n={5} status="todo" label="Visit" meta="Oct 8" />
        </TabGroup>
        <GroupDivider />
        <TabGroup label="REPORT">
          <PlaceholderTab n={6} label="MMI & Report" />
        </TabGroup>
      </nav>

      {!hintDismissed ? (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-blue-200 bg-blue-50 px-5 py-2 text-[12.5px] text-blue-950">
          <b>Next:</b> 2 treatments still unreviewed in Analysis (Lumbar).
          <Link
            to="/mockups/analysis"
            className="rounded-md bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Go to Analysis →
          </Link>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setHintDismissed(true)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            dismiss <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
