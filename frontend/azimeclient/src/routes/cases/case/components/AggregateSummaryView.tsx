import type { CaseSummaryResponse } from "@azime/contracts";

type AggregateSummaryViewProps = {
  summary: CaseSummaryResponse["summary"] | null;
  parseError?: string | null;
};

const hasText = (value: string | null | undefined) =>
  (value?.trim().length ?? 0) > 0;

const Field = ({ label, value }: { label: string; value: string | null }) => {
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
      <Field label="Incident Narrative" value={summary.incidentNarrative} />
      <Field label="Psychosocial Factors" value={summary.psychosocialFactors} />

      {summary.statusTimeline.length > 0 ? (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status Timeline
          </h4>
          <div className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Visit</th>
                  <th className="px-3 py-2 font-medium">Subjective</th>
                  <th className="px-3 py-2 font-medium">Objective</th>
                  <th className="px-3 py-2 font-medium">Functional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top text-slate-800">
                {summary.statusTimeline.map((entry) => (
                  <tr key={entry.recordId}>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="font-medium">
                        {entry.date ?? "Undated"}
                      </div>
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
        </div>
      ) : null}
    </div>
  );
};

export default AggregateSummaryView;
