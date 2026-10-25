import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AmaMode } from "@azime/contracts";
import { caseQueryOptions, updateAmaMode } from "../../../queries";

export const amaModeOptions: { value: AmaMode; label: string }[] = [
  { value: "rating", label: "Rating requested" },
  { value: "guidance", label: "Guidance only (AMA exam checklist, no rating)" },
  { value: "off", label: "Not requested" },
];

// Whether the referral asks for an AMA rating. Drives Visit, the prep sheet and the report.
export default function AmaModeSelect({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const caseQuery = useQuery(caseQueryOptions(caseId));
  const mutation = useMutation({
    mutationFn: (amaMode: AmaMode) => updateAmaMode(caseId, amaMode),
    onSuccess: (saved) =>
      queryClient.setQueryData(caseQueryOptions(caseId).queryKey, (current) =>
        current ? { ...current, amaMode: saved.amaMode } : current
      ),
  });
  if (!caseQuery.data) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <label htmlFor="amaMode" className="text-sm font-medium text-gray-700">
        AMA rating
      </label>
      <select
        id="amaMode"
        className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        value={caseQuery.data.amaMode}
        disabled={mutation.isPending}
        onChange={(event) => mutation.mutate(event.target.value as AmaMode)}
      >
        {amaModeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {mutation.isError ? (
        <span className="text-sm text-red-600">Failed to save AMA rating.</span>
      ) : null}
    </div>
  );
}
