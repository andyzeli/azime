import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  initializeVisitDocumentation,
  saveVisitDocumentationRequestSchema,
  type Region,
} from "@azime/contracts";
import {
  caseQueryOptions,
  postExamAnalysisQueryOptions,
  saveVisit,
  takePostExamSnapshot,
  visitQueryOptions,
} from "../../../queries";

const errorMessage = (error: unknown) =>
  (error as { data?: { error?: string } })?.data?.error ??
  (error instanceof Error ? error.message : "Request failed");

// Debug view: raw JSON for the case's single visit and each region's post-exam snapshot.
export default function VisitDocumentationPanel({
  caseId,
}: {
  caseId: string;
}) {
  const client = useQueryClient();
  const caseQuery = useQuery(caseQueryOptions(caseId));
  const options = visitQueryOptions(caseId);
  const visit = useQuery(options);
  const [draft, setDraft] = useState<string | null>(null);
  const saved = visit.data;
  const text =
    draft ??
    JSON.stringify(
      saved?.documentation ?? initializeVisitDocumentation(),
      null,
      2,
    );
  const save = useMutation({
    mutationFn: () =>
      saveVisit(
        caseId,
        saveVisitDocumentationRequestSchema.parse({
          documentation: JSON.parse(text),
          expectedRevision: saved?.revision ?? 0,
        }),
      ),
    onSuccess: (result) => {
      client.setQueryData(options.queryKey, result);
      setDraft(null);
    },
  });

  if (visit.isPending || caseQuery.isPending) return <p>Loading visit…</p>;
  if (visit.isError) return <p className="text-red-600">Failed to load visit.</p>;

  return (
    <div className="mt-6 space-y-3 text-sm">
      <h3 className="font-semibold">Visit documentation</h3>
      <p>
        One visit per case. Priority responses are matched by region + focus;
        status is couldnt_assess, declined, not_relevant or response.
      </p>
      <textarea
        aria-label="Visit documentation JSON"
        className="min-h-72 w-full rounded border p-3 font-mono text-xs"
        value={text}
        disabled={save.isPending}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="rounded border px-3 py-1.5"
      >
        Save visit documentation
      </button>
      {save.isError && <p className="text-red-600">{errorMessage(save.error)}</p>}
      {saved && <p>Saved revision {saved.revision}</p>}
      {caseQuery.data?.regions.map((region) => (
        <RegionalPostExam
          key={region}
          caseId={caseId}
          region={region}
          disabled={!saved || draft !== null}
        />
      ))}
    </div>
  );
}

function RegionalPostExam({
  caseId,
  region,
  disabled,
}: {
  caseId: string;
  region: Region;
  disabled: boolean;
}) {
  const client = useQueryClient();
  const options = postExamAnalysisQueryOptions(caseId, region);
  const snapshot = useQuery(options);
  const takeSnapshot = useMutation({
    mutationFn: () => takePostExamSnapshot(caseId, region),
    onSuccess: (result) => client.setQueryData(options.queryKey, result),
  });

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center gap-3">
        <b>{region.replace(/_/g, " ")}</b>
        <button
          type="button"
          disabled={disabled || takeSnapshot.isPending}
          onClick={() => takeSnapshot.mutate()}
          className="rounded border px-3 py-1.5"
        >
          Take post-exam snapshot
        </button>
      </div>
      {takeSnapshot.isError && (
        <p className="text-red-600">{errorMessage(takeSnapshot.error)}</p>
      )}
      {snapshot.isError && (
        <p className="text-red-600">Failed to load post-exam snapshot.</p>
      )}
      {snapshot.data && (
        <details>
          <summary>Post-exam snapshot #{snapshot.data.id}</summary>
          <pre className="max-h-96 overflow-auto">
            {JSON.stringify(snapshot.data.inputSnapshot, null, 2)}
          </pre>
        </details>
      )}
      {snapshot.data?.analysis && (
        <details>
          <summary>Post-exam analysis output</summary>
          <pre className="max-h-96 overflow-auto">
            {JSON.stringify(snapshot.data.analysis, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
