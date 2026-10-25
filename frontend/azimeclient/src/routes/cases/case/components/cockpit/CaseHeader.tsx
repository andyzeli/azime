import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Mail, MapPin, Pencil, Zap } from "lucide-react";
import { supportedRegions, type CaseInjuryDetails } from "@azime/contracts";
import { cn } from "@/lib/utils";
import { caseQueryOptions, updateCaseInjuryDetails } from "../../../queries";
import { caseTypes } from "../NewCaseForm";
import { PatientAvatar } from "../PatientAvatar";

const injuryTypes: { value: CaseInjuryDetails["injuryType"]; label: string }[] = [
  { value: "specific", label: "Specific incident" },
  { value: "cumulative", label: "Cumulative trauma" },
  { value: "undetermined", label: "Undetermined" },
];

const regionLabel = (region: string) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
        current ? { ...current, ...injuryDetails } : current
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
  const name = [caseData.patientName, caseData.patientLastName].filter(Boolean).join(" ");
  const caseType = caseTypes.find(({ value }) => value === caseData.caseType)?.label ?? caseData.caseType;
  const contact = caseData.caseContact;

  return (
    <header className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <PatientAvatar
            firstName={caseData.patientName}
            lastName={caseData.patientLastName}
            className="size-14 text-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{name || "Unnamed patient"}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              {caseType ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                  {caseType}
                </span>
              ) : null}
              <span className="text-slate-400">Case #{caseData.id}</span>
            </div>
          </div>
        </div>

        {contact?.name ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 md:w-72">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {contact.type ? `Contact · ${contact.type}` : "Contact"}
            </div>
            <div className="mt-1 font-medium text-slate-900">{contact.name}</div>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="mt-0.5 flex items-center gap-1.5 break-all text-sm text-blue-700 hover:underline"
              >
                <Mail className="size-3.5 shrink-0" />
                {contact.email}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Injury details
          </h2>
          {!draft ? (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
              onClick={() => {
                mutation.reset();
                setDraft({
                  injuryType: caseData.injuryType,
                  dateOfInjury: caseData.dateOfInjury,
                  regions: [...caseData.regions],
                });
              }}
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          ) : null}
        </div>

        {!draft ? (
          <dl className="grid gap-5 sm:grid-cols-3">
            <Detail icon={<Zap className="size-4" />} label="Injury type">
              {injuryTypes.find(({ value }) => value === caseData.injuryType)?.label}
            </Detail>
            <Detail icon={<CalendarDays className="size-4" />} label="Date of injury">
              {caseData.dateOfInjury ? (
                formatDate(caseData.dateOfInjury)
              ) : (
                <span className="text-slate-400">Not specified</span>
              )}
            </Detail>
            <Detail icon={<MapPin className="size-4" />} label="Body regions">
              {caseData.regions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {caseData.regions.map((region) => (
                    <span
                      key={region}
                      className="rounded-md bg-white px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
                    >
                      {regionLabel(region)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">Not specified</span>
              )}
            </Detail>
          </dl>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(draft);
            }}
          >
            <fieldset disabled={mutation.isPending} className="grid gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Injury type</span>
                <select
                  className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={draft.injuryType}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      injuryType: event.target.value as CaseInjuryDetails["injuryType"],
                    })
                  }
                >
                  {injuryTypes.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Date of injury</span>
                <input
                  type="date"
                  className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={draft.dateOfInjury ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, dateOfInjury: event.target.value || null })
                  }
                />
              </label>
              <div>
                <span className="text-sm font-medium text-slate-600">Body regions</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {supportedRegions.map(({ value, label }) => {
                    const selected = draft.regions.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            regions: selected
                              ? draft.regions.filter((region) => region !== value)
                              : [...draft.regions, value],
                          })
                        }
                        className={cn(
                          "rounded-md px-2 py-1 text-sm font-medium ring-1 ring-inset transition-colors",
                          selected
                            ? "bg-blue-600 text-white ring-blue-600"
                            : "bg-white text-slate-600 ring-slate-300 hover:ring-blue-300"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </fieldset>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {mutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              {mutation.isError ? (
                <p role="alert" className="text-sm text-red-700">
                  Failed to save injury details. Please try again.
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </header>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
      </div>
    </div>
  );
}
