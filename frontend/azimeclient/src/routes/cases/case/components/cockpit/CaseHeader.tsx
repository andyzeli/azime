import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportedRegions, type CaseInjuryDetails } from "@azime/contracts";
import { caseQueryOptions, updateCaseInjuryDetails } from "../../../queries";

export default function CaseHeader({ caseId }: { caseId: string }) {
  const caseQuery = useQuery(caseQueryOptions(caseId));
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CaseInjuryDetails | null>(null);
  const mutation = useMutation({
    mutationFn: (input: CaseInjuryDetails) =>
      updateCaseInjuryDetails(caseId, input),
    mutationKey: ["cases", caseId, "update"],
    onSuccess: async (injuryDetails) => {
      queryClient.setQueryData(caseQueryOptions(caseId).queryKey, (current) =>
        current ? { ...current, ...injuryDetails } : current,
      );
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      setDraft(null);
    },
  });

  if (caseQuery.isPending) {
    return (
      <header className="rounded-lg bg-white p-6 text-sm text-slate-500 shadow-md">
        Loading case…
      </header>
    );
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <header className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-md">
        Failed to load case details.
      </header>
    );
  }

  const caseData = caseQuery.data;

  return (
    <header className="rounded-lg bg-white p-6 shadow-md">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Provider cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            {caseData.patientName} {caseData.patientLastName}
          </h1>
          <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {caseData.caseType}
          </span>
          <div className="mt-3 space-y-1 text-sm text-gray-700">
            <p>Injury type: {caseData.injuryType}</p>
            <p>Date of injury: {caseData.dateOfInjury ?? "Not specified"}</p>
            <p>
              Body regions:{" "}
              {caseData.regions.length
                ? caseData.regions
                    .map(
                      (region) =>
                        supportedRegions.find(({ value }) => value === region)
                          ?.label ?? region,
                    )
                    .join(", ")
                : "Not specified"}
            </p>
          </div>
          {!draft && (
            <button
              type="button"
              className="mt-3 text-sm text-blue-700"
              onClick={() => {
                mutation.reset();
                setDraft({
                  injuryType: caseData.injuryType,
                  dateOfInjury: caseData.dateOfInjury,
                  regions: [...caseData.regions],
                });
              }}
            >
              Edit injury details
            </button>
          )}
        </div>

        <div className="rounded-lg bg-gray-50 p-4 md:w-72">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Contact person
          </h2>
          <div className="mt-2 space-y-1 text-gray-700">
            <p>{caseData.caseContact?.name}</p>
            <p className="break-all text-sm text-gray-600">
              {caseData.caseContact?.email}
            </p>
          </div>
        </div>
      </div>
      {draft && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(draft);
          }}
        >
          <fieldset disabled={mutation.isPending} className="space-y-3">
            <label className="block">
              Injury type
              <select
                className="ml-2 rounded border p-1"
                value={draft.injuryType}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    injuryType: event.target
                      .value as CaseInjuryDetails["injuryType"],
                  })
                }
              >
                <option value="specific">Specific</option>
                <option value="cumulative">Cumulative</option>
                <option value="undetermined">Undetermined</option>
              </select>
            </label>
            <label className="block">
              Date of injury
              <input
                type="date"
                className="ml-2 rounded border p-1"
                value={draft.dateOfInjury ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    dateOfInjury: event.target.value || null,
                  })
                }
              />
            </label>
            <fieldset>
              <legend>Body regions</legend>
              {supportedRegions.map(({ value, label }) => (
                <label
                  key={value}
                  className="mr-4 inline-flex items-center gap-1"
                >
                  <input
                    type="checkbox"
                    checked={draft.regions.includes(value)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        regions: event.target.checked
                          ? [...draft.regions, value]
                          : draft.regions.filter((region) => region !== value),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <div className="flex gap-3">
              <button type="submit" className="text-blue-700">
                {mutation.isPending ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </fieldset>
          {mutation.isError && (
            <p role="alert" className="text-sm text-red-700">
              Failed to save injury details. Please try again.
            </p>
          )}
        </form>
      )}
    </header>
  );
}
