import { useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { physicianSignatureName, type PracticeSettings } from "@azime/contracts";
import { rootRoute } from "../rootRoutes";
import {
  practiceSettingsQueryOptions,
  savePracticeSettings,
} from "../cases/queries";

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isPending, isError } = useQuery(practiceSettingsQueryOptions);
  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50 px-4 py-8 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            <Settings2 aria-hidden="true" className="size-4" />
            Practice
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Report settings</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            The letterhead and signature on every report PDF. Reports already
            signed keep the details they were signed with.
          </p>
        </header>
        {isPending ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-red-700">Could not load the settings.</p>
        ) : (
          <SettingsForm saved={data} />
        )}
      </div>
    </main>
  );
}

function SettingsForm({ saved }: { saved: PracticeSettings }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(saved);
  const save = useMutation({
    mutationFn: savePracticeSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(practiceSettingsQueryOptions.queryKey, settings);
      setDraft(settings);
    },
  });
  const field = (key: keyof PracticeSettings) => ({
    value: draft[key],
    onChange: (e: { target: { value: string } }) => {
      save.reset();
      setDraft({ ...draft, [key]: e.target.value });
    },
  });
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(draft);
      }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <fieldset disabled={save.isPending} className="grid gap-8 p-6 sm:p-8">
        <Group title="Letterhead" hint="Top right of the first page, beside the logo.">
          <Field label="Practice name" className="sm:col-span-2">
            <input {...field("name")} className={inputClass} />
          </Field>
          <Field label="Address" hint="One line per row" className="sm:col-span-2">
            <textarea {...field("address")} rows={3} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input {...field("phone")} className={inputClass} />
          </Field>
          <Field label="Fax">
            <input {...field("fax")} className={inputClass} />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <input {...field("email")} type="email" className={inputClass} />
          </Field>
        </Group>
        <Group
          title="Signing physician"
          hint="Required before a report can be signed."
        >
          <Field label="Name" hint="e.g. Jane Doe">
            <input {...field("physicianName")} className={inputClass} />
          </Field>
          <Field label="Credentials" hint="e.g. MD">
            <input {...field("physicianCredentials")} className={inputClass} />
          </Field>
          <Field label="License" hint="Printed under the signature" className="sm:col-span-2">
            <input {...field("physicianLicense")} className={inputClass} />
          </Field>
          <p className="text-sm text-slate-500 sm:col-span-2">
            Signature line:{" "}
            <span className="font-medium text-slate-800">
              {draft.physicianName
                ? `Electronically signed by ${physicianSignatureName(draft)}`
                : "add a name"}
            </span>
          </p>
        </Group>
      </fieldset>
      <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 sm:px-8">
        <button
          type="submit"
          disabled={!changed || save.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        {save.isError ? (
          <span role="alert" className="text-sm text-red-700">
            Couldn't save. Please try again.
          </span>
        ) : save.isSuccess && !changed ? (
          <span className="text-sm text-green-700">Saved</span>
        ) : null}
      </div>
    </form>
  );
}

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm";

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint ? <span className="ml-2 text-xs text-slate-400">{hint}</span> : null}
      {children}
    </label>
  );
}
