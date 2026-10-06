import { createLazyRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Check, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  getProviderDisciplineLabel,
  type CaseSummaryResponse,
  type ProviderSummary,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  caseSummaryQueryOptions,
  caseSummaryCardQueryOptions,
  providerSummariesQueryOptions,
  recordsQueryOptions,
  summarizeCase,
  type RecordWithParsedSummary,
} from "../../../cases/queries";
import TimelineColumn from "../components/Timeline";
import { RecordDrawer } from "../components/RecordDetail";
import { Badge, Btn, Cite, Segmented } from "../components/shared";
import { toTimeline } from "../recordPresentation";

const workStatusLabels = {
  full_duty: "Full duty",
  modified_duty: "Modified duty",
  off_work: "Off work",
  unknown: "Not documented",
};

function SummaryTab() {
  const { caseId } = Route.useParams();
  const { record, view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { data: records } = useSuspenseQuery(recordsQueryOptions(caseId));
  const { data: caseSummary } = useSuspenseQuery(
    caseSummaryQueryOptions(caseId)
  );
  const { data: providerData } = useSuspenseQuery(
    providerSummariesQueryOptions(caseId)
  );
  const cardQuery = useQuery(caseSummaryCardQueryOptions(caseId));
  const currentWorkStatus = cardQuery.data?.currentWorkStatus;
  const summary = caseSummary?.parsedAggregateSummary ?? null;
  const providers = providerData?.summary.providerSummaries ?? [];
  const timeline = toTimeline(records);
  const completedExtractionCount = records.filter(
    (item) => item.summaryStatus === "completed"
  ).length;
  const summaryMutation = useMutation({
    mutationFn: () => summarizeCase(Number(caseId)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: caseSummaryQueryOptions(caseId).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: providerSummariesQueryOptions(caseId).queryKey,
        }),
      ]),
  });
  const status = summaryMutation.isPending
    ? "Generating…"
    : summaryMutation.isError
      ? "Generation failed"
      : caseSummary?.aggregateSummaryParseError
        ? "Summary unavailable"
        : summary
          ? `generated from ${summary.sourceMetadata.sourceRecordCount} records`
          : "Not generated";

  return (
    <>
      <TimelineColumn events={timeline} selectedId={record} caseId={caseId} />
      <main className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4 px-5">
        <div className="flex items-center gap-3">
          <Segmented
            size="md"
            value={view ?? "summary"}
            onChange={(next) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  view: next === "providers" ? "providers" : undefined,
                }),
              })
            }
            options={[
              { value: "summary", label: "Case summary" },
              { value: "providers", label: `Providers · ${providers.length}` },
            ]}
          />
          <Badge
            className={cn(
              "flex items-center gap-1",
              summaryMutation.isError
                ? "bg-red-100 text-red-700"
                : summaryMutation.isPending ||
                    caseSummary?.aggregateSummaryParseError
                  ? "bg-amber-100 text-amber-700"
                  : summary
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
            )}
          >
            {summary &&
            !summaryMutation.isPending &&
            !summaryMutation.isError &&
            !caseSummary?.aggregateSummaryParseError ? (
              <Check className="size-3" strokeWidth={3} />
            ) : null}
            {status}
          </Badge>
          <span className="flex-1" />
          <Btn
            disabled={
              completedExtractionCount === 0 || summaryMutation.isPending
            }
            onClick={() => summaryMutation.mutate()}
          >
            {summaryMutation.isPending
              ? "Generating…"
              : summary
                ? "Regenerate"
                : "Generate"}
          </Btn>
        </div>

        {summaryMutation.isError ? (
          <p className="text-sm text-red-600">
            Failed to generate the case summary. Please try again.
          </p>
        ) : null}

        {view === "providers" ? (
          <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[210px_1fr] gap-3.5 bg-slate-50 px-3.5 py-2 text-[11px] font-bold tracking-[.04em] text-slate-500">
              <span>PROVIDER</span>
              <span>SUMMARY</span>
            </div>
            {providers.length > 0 ? (
              providers.map((provider) => (
                <ProviderRow
                  key={`${caseId}:${provider.providerName}`}
                  provider={provider}
                  records={records}
                />
              ))
            ) : (
              <p className="px-3.5 py-3 text-[12.5px] text-slate-500">
                No provider summaries have been generated yet.
              </p>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3.5",
              record ? "grid-cols-1" : "grid-cols-[1fr_280px]"
            )}
          >
            <div className="flex min-w-0 flex-col gap-3.5">
              <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <h2 className="mb-2 text-[13.5px] font-semibold">
                  Clinical summary
                </h2>
                {caseSummary?.aggregateSummaryParseError ? (
                  <p className="text-[13.5px] text-amber-700">
                    Aggregate summary data exists, but it did not match the
                    current schema.
                  </p>
                ) : summary ? (
                  <>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-800">
                      {summary.caseWideSummary}
                    </p>
                    {summary.incidentNarrative ? (
                      <SummaryField
                        label="Incident Narrative"
                        value={summary.incidentNarrative}
                      />
                    ) : null}
                    {summary.psychosocialFactors ? (
                      <SummaryField
                        label="Psychosocial Factors"
                        value={summary.psychosocialFactors}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="text-[13.5px] text-slate-500">
                    {completedExtractionCount === 0
                      ? "Extract the source records first, then generate the case summary."
                      : "No aggregate summary has been generated yet."}
                  </p>
                )}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="text-[13.5px] font-semibold">
                    Status timeline
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    Subjective · objective · functional
                  </span>
                </div>
                <StatusTimeline entries={summary?.statusTimeline ?? []} />
              </section>
            </div>
            <section className="self-start rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <h2 className="mb-1.5 text-[13.5px] font-semibold">
                Consolidated diagnoses
              </h2>
              {cardQuery.isPending ? (
                <p className="py-2 text-[12.5px] text-slate-500">
                  Loading diagnoses…
                </p>
              ) : cardQuery.isError ? (
                <p className="py-2 text-[12.5px] text-red-600">
                  Could not load diagnoses.
                </p>
              ) : cardQuery.data.diagnoses.length === 0 ? (
                <p className="py-2 text-[12.5px] text-slate-500">
                  No diagnosis mentions yet.
                </p>
              ) : (
                cardQuery.data.diagnoses.map((dx) => (
                  <div
                    key={dx.canonicalDx}
                    className="border-t border-slate-100 py-2 text-[12.5px]"
                  >
                    <div>{dx.label || dx.canonicalDx}</div>
                    {dx.icdPrefixes.length > 0 ? (
                      <div
                        className="mt-1 flex flex-wrap gap-1"
                        aria-label="ICD prefixes"
                      >
                        {dx.icdPrefixes.map((prefix) => (
                          <Badge
                            key={prefix}
                            className="rounded bg-blue-50 text-blue-700"
                          >
                            {prefix}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              <h2 className="mb-1.5 mt-4 text-[13.5px] font-semibold">
                Current work status
              </h2>
              {cardQuery.isPending ? (
                <p className="py-2 text-[12.5px] text-slate-500">Loading work status…</p>
              ) : cardQuery.isError ? (
                <p className="py-2 text-[12.5px] text-red-600">Could not load work status.</p>
              ) : !currentWorkStatus ? (
                <p className="py-2 text-[12.5px] text-slate-500">No work status available yet.</p>
              ) : (
                <>
                  <div className="flex border-t border-slate-100 py-2 text-[12.5px]">
                    <span className="w-[90px] shrink-0 text-slate-500">Work</span>
                    {workStatusLabels[currentWorkStatus.status]}
                  </div>
                  {currentWorkStatus.restrictions.length > 0 ? (
                    <div className="flex border-t border-slate-100 py-2 text-[12.5px]">
                      <span className="w-[90px] shrink-0 text-slate-500">Restrictions</span>
                      <ul className="min-w-0 list-disc space-y-1 pl-4">
                        {currentWorkStatus.restrictions.map((restriction, index) => <li key={index}>{restriction}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex border-t border-slate-100 py-2 text-[12.5px]">
                    <span className="w-[90px] shrink-0 text-slate-500">As of</span>
                    <Cite recordId={String(currentWorkStatus.recordId)}>{currentWorkStatus.date ?? "Undated"}</Cite>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value}</p>
    </div>
  );
}

function StatusTimeline({
  entries,
}: {
  entries: CaseSummaryResponse["summary"]["statusTimeline"];
}) {
  if (entries.length === 0)
    return (
      <p className="mt-2 text-[12.5px] text-slate-500">
        No status timeline is available yet.
      </p>
    );
  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            {["Visit", "Subjective", "Objective", "Functional"].map((label) => (
              <th key={label} className="px-3 py-2 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 align-top text-slate-800">
          {entries.map((entry) => (
            <tr key={entry.recordId}>
              <td className="whitespace-nowrap px-3 py-2">
                <Cite recordId={entry.recordId}>
                  <span className="font-medium">{entry.date ?? "Undated"}</span>
                </Cite>
                <div className="text-xs text-slate-500">
                  {[entry.providerName, entry.providerType]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </td>
              <td className="px-3 py-2">{entry.subjective}</td>
              <td className="px-3 py-2">{entry.objective ?? "—"}</td>
              <td className="px-3 py-2">{entry.functional ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProviderRow({
  provider,
  records,
}: {
  provider: ProviderSummary;
  records: RecordWithParsedSummary[];
}) {
  const providerRecords = records.filter(
    (record) => record.provider?.name === provider.providerName
  );
  const specialties = [
    ...new Set(
      providerRecords.flatMap((record) =>
        record.provider
          ? [getProviderDisciplineLabel(record.provider.discipline)]
          : []
      )
    ),
  ];
  const preview = (
    provider.providerSummary
      .split(/\n\s*\n/)
      .find(
        (paragraph) => paragraph.trim() && !paragraph.trim().startsWith("#")
      ) ?? provider.providerSummary
  ).replace(/\*\*/g, "");

  return (
    <details className="group border-t border-slate-100">
      <summary className="grid cursor-pointer list-none grid-cols-[210px_1fr] gap-3.5 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
            <b>{provider.providerName}</b>
          </div>
          <div className="text-[11px] text-slate-500">
            {[
              specialties.join(" / "),
              `${providerRecords.length} record${providerRecords.length === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
            <br />
            {provider.dateRange}
          </div>
        </div>
        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-slate-800 group-open:hidden">
          {preview}
        </p>
        <span className="hidden text-[11px] text-slate-500 group-open:block">
          Collapse summary
        </span>
      </summary>
      <div className="grid grid-cols-[210px_1fr] gap-3.5 px-3.5 pb-3">
        <span />
        <div className="space-y-2 text-[12.5px] leading-relaxed text-slate-800 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown>{provider.providerSummary}</ReactMarkdown>
        </div>
      </div>
    </details>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId/summary")({
  component: SummaryTab,
});
