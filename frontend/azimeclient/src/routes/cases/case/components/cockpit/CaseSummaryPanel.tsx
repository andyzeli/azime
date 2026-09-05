import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  caseSummaryQueryOptions,
  recordsQueryOptions,
  summarizeCase,
} from "../../../queries";
import AggregateSummaryView from "../AggregateSummaryView";
import { CockpitSection } from "./CockpitLayout";

export default function CaseSummaryPanel({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const recordsQuery = useQuery(recordsQueryOptions(caseId));
  const caseSummaryQuery = useQuery(caseSummaryQueryOptions(caseId));

  const summaryMutation = useMutation({
    mutationFn: summarizeCase,
    mutationKey: ["cases", "aggregate-summary"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caseSummary"] });
    },
  });

  if (recordsQuery.isPending || caseSummaryQuery.isPending) {
    return (
      <CockpitSection
        id="case-summary"
        title="Case Summary"
        description="Case-level synthesis of the extracted records."
      >
        <p className="text-sm text-slate-500">Loading case summary…</p>
      </CockpitSection>
    );
  }

  if (recordsQuery.isError || caseSummaryQuery.isError) {
    return (
      <CockpitSection
        id="case-summary"
        title="Case Summary"
        description="Case-level synthesis of the extracted records."
      >
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load the case summary.
        </p>
      </CockpitSection>
    );
  }

  const records = recordsQuery.data;
  const caseSummary = caseSummaryQuery.data;
  const completedExtractionCount = records.filter(
    (record) => record.summaryStatus === "completed",
  ).length;

  const status = summaryMutation.isPending
    ? "Generating"
    : summaryMutation.isError
      ? "Failed"
      : caseSummary
        ? "Ready"
        : "Not generated";

  const statusClassName = summaryMutation.isError
    ? "bg-red-100 text-red-800"
    : summaryMutation.isPending
      ? "bg-amber-100 text-amber-800"
      : caseSummary
        ? "bg-green-100 text-green-800"
        : "bg-slate-100 text-slate-700";

  return (
    <CockpitSection
      id="case-summary"
      title="Case Summary"
      description={`Built from ${completedExtractionCount} extracted record${
        completedExtractionCount === 1 ? "" : "s"
      }.`}
      action={
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName}`}
          >
            {status}
          </span>
          <button
            type="button"
            onClick={() => summaryMutation.mutate(Number(caseId))}
            disabled={
              completedExtractionCount === 0 || summaryMutation.isPending
            }
            className="inline-flex items-center rounded-md bg-emerald-700 px-4 py-2 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {summaryMutation.isPending
              ? "Generating..."
              : caseSummary
                ? "Re-run Aggregate"
                : "Generate Aggregate"}
          </button>
        </div>
      }
    >
      {completedExtractionCount === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Extract the source records first, then generate the case summary.
        </p>
      ) : (
        <AggregateSummaryView
          summary={caseSummary?.parsedAggregateSummary ?? null}
          parseError={caseSummary?.aggregateSummaryParseError}
        />
      )}
      {summaryMutation.isError ? (
        <p className="mt-3 text-sm text-red-600">
          Failed to generate aggregate summary. Please try again.
        </p>
      ) : null}
    </CockpitSection>
  );
}
