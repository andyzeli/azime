type RecordSummaryViewProps = {
  summary: unknown | null;
  parseError?: string | null;
};

export const JsonSummaryPreview = ({ value }: { value: unknown }) => {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-800">
          Extracted JSON
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Temporary preview of the stored AI extraction.
        </p>
      </div>

      <pre className="max-h-[32rem] overflow-auto bg-slate-950 p-4 text-xs leading-5 text-slate-100">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </section>
  );
};

const RecordSummaryView = ({ summary, parseError }: RecordSummaryViewProps) => {
  if (parseError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Structured summary could not be displayed because it did not match the
        current schema.
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        No structured summary is available for this record yet.
      </p>
    );
  }

  return <JsonSummaryPreview value={summary} />;
};

export default RecordSummaryView;
