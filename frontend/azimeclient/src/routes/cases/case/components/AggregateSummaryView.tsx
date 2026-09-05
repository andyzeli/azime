import type { StoredCaseClinicalSummary } from "../../../../../../../backend/src/ai/clinicalSummarySchema";

type AggregateSummaryViewProps = {
  summary: StoredCaseClinicalSummary | null;
  parseError?: string | null;
};

const hasText = (value: string | null | undefined) =>
  (value?.trim().length ?? 0) > 0;

const Field = ({ label, value }: { label: string; value: string }) => {
  if (!hasText(value)) {
    return null;
  }

  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </h4>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value}</p>
    </div>
  );
};

const AggregateSummaryView = ({
  summary,
  parseError,
}: AggregateSummaryViewProps) => {
  if (parseError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Aggregate summary data exists, but it did not match the current schema.
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No aggregate summary has been generated yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Field label="Case-wide Summary" value={summary.caseWideSummary} />

      {summary.providerSummaries.map((provider) => (
        <div
          key={`${provider.providerName}-${provider.dateRange}`}
          className="rounded-md border border-slate-200 bg-white p-4"
        >
          <h4 className="font-medium text-slate-900">
            {provider.providerName}
          </h4>
          <p className="text-xs text-slate-500">
            {[provider.specialty, provider.dateRange]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
            {provider.providerSummary}
          </p>
        </div>
      ))}

      {summary.unresolvedDataConflicts.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Unresolved data conflicts
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {summary.unresolvedDataConflicts.map((conflict) => (
              <li
                key={`${conflict.fieldInConflict}-${conflict.competingValues.join("|")}`}
              >
                {conflict.fieldInConflict}:{" "}
                {conflict.competingValues.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default AggregateSummaryView;
