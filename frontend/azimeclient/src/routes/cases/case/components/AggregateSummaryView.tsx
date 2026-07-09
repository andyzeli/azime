import type { StoredAggregateSummary } from "../../../../../../../backend/src/gemini/aggregateSummarySchema";

type AggregateSummaryViewProps = {
  summary: StoredAggregateSummary | null;
  parseError?: string | null;
};

const hasText = (value: string | null | undefined) =>
  (value?.trim().length ?? 0) > 0;

const Field = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
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
      <Field label="Main Summary" value={summary.mainSummary} />
      <Field label="Patient Info" value={summary.patientInfo} />
      <Field label="Current Status" value={summary.currentStatus} />

      <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <Field
          label="Incident Date"
          value={summary.backgroundSummary.incidentDate}
        />
        <Field
          label="Incident Description"
          value={summary.backgroundSummary.incidentDescriptionSummary}
        />
        <Field
          label="Past Medical History"
          value={summary.backgroundSummary.pastMedicalHistorySummary}
        />
        <Field
          label="Allergies"
          value={summary.backgroundSummary.allergiesSummary}
        />
        <Field
          label="Background Conflicts"
          value={summary.backgroundSummary.backgroundConflicts}
        />
      </div>
    </div>
  );
};

export default AggregateSummaryView;
