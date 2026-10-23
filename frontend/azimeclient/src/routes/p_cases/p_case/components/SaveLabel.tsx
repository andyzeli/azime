import { cn } from "@/lib/utils";

// Status of a text field that saves when it loses focus. draft is null until edited.
export function SaveLabel({
  draft,
  saved,
  focused,
  failed,
  required = false,
}: {
  draft: string | null;
  saved: string | null;
  focused: boolean;
  failed: boolean;
  required?: boolean;
}) {
  if (draft === null) return null;
  const [text, className] =
    required && !draft.trim()
      ? ["Required. Not saved until written", "text-amber-700"]
      : draft.trim() === (saved ?? "").trim()
        ? ["Saved", "text-slate-400"]
        : focused
          ? ["Saves when you click away", "text-slate-400"]
          : failed
            ? ["Not saved. Click in and out to retry", "text-red-700"]
            : ["Saving…", "text-slate-400"];
  return <div className={cn("mt-0.5 text-[11px]", className)}>{text}</div>;
}
