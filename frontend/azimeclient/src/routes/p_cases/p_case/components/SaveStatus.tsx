import type { AutosaveStatus } from "../autosave";

const apiErrorMessage = (error: unknown) =>
  (error as { data?: { error?: string } } | null)?.data?.error ?? "Request failed";

export function SaveStatus({
  status,
  onRetry,
}: {
  status: AutosaveStatus;
  onRetry: () => void;
}) {
  if (status.kind === "error")
    return (
      <span className="text-[11px] font-semibold text-red-700">
        Couldn't save: {apiErrorMessage(status.error)} ·{" "}
        <button type="button" onClick={onRetry} className="underline hover:text-red-900">
          Retry
        </button>
      </span>
    );
  return (
    <span className="text-[11px] text-slate-500">
      {status.kind === "saving" ? "Saving…" : status.kind === "saved" ? "Saved" : "Not saved yet"}
    </span>
  );
}
