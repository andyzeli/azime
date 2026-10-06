import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  physicianSteeringSchema,
  resolvePreExamReview,
  type PhysicianSteering,
  type PhysicianSteeringResponse,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import {
  physicianSteeringQueryOptions,
  savePhysicianSteering,
} from "../../../queries";

export default function PhysicianSteeringPanel({
  response,
  analysis,
  disabled,
}: {
  response: PhysicianSteeringResponse;
  analysis: StoredPreExamAnalysis;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(() =>
    JSON.stringify(response.steering, null, 2),
  );
  const queryKey = physicianSteeringQueryOptions(
    String(response.caseId),
    response.region,
    response.steering.preExamAnalysisUpdatedAt,
  ).queryKey;
  const saveMutation = useMutation({
    mutationFn: (steering: PhysicianSteering) =>
      savePhysicianSteering(String(response.caseId), response.region, {
        steering,
        expectedRevision: response.revision,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
    },
  });

  let steering: PhysicianSteering | null = null;
  let validationError: string | null = null;
  try {
    const parsed = physicianSteeringSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      steering = parsed.data;
    } else {
      validationError = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
    }
  } catch {
    validationError = "Enter valid JSON before saving.";
  }

  return (
    <fieldset
      disabled={disabled || saveMutation.isPending}
      className="space-y-2"
    >
      <legend className="text-sm font-semibold text-slate-800">
        Physician Steering
      </legend>
      <p className="text-xs text-slate-500">
        {response.id === null
          ? "Unsaved draft. "
          : `Saved revision ${response.revision}. `}
        Omitted entries are unreviewed. Edit decisions using the IDs in the
        analysis above.
      </p>
      <textarea
        aria-label="Physician steering JSON"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        className="min-h-80 w-full rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100"
      />
      {validationError ? (
        <p className="text-sm text-red-600">{validationError}</p>
      ) : null}
      <button
        type="button"
        disabled={!steering}
        onClick={() => {
          if (steering) saveMutation.mutate(steering);
        }}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:text-slate-400"
      >
        {saveMutation.isPending ? "Saving..." : "Save steering"}
      </button>
      {saveMutation.isError ? (
        <div className="space-y-1 text-sm text-red-600">
          <p>
            {(saveMutation.error as { data?: { error?: string } }).data
              ?.error ?? "Failed to save steering"}
          </p>
          <button
            type="button"
            className="underline"
            onClick={() => {
              // Explicitly discard this local draft and refresh both source and steering.
              setText(JSON.stringify(response.steering, null, 2));
              saveMutation.reset();
              void queryClient.invalidateQueries({
                queryKey: [
                  "preExamAnalysis",
                  { caseId: String(response.caseId), region: response.region },
                ],
              });
              void queryClient.invalidateQueries({ queryKey });
            }}
          >
            Reload saved steering (discard edits)
          </button>
        </div>
      ) : null}
      {steering ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Merged review preview
          </summary>
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {JSON.stringify(resolvePreExamReview(analysis, steering), null, 2)}
          </pre>
        </details>
      ) : null}
    </fieldset>
  );
}
