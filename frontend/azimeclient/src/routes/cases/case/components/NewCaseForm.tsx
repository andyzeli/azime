import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Plus } from "lucide-react";
import type { AmaMode } from "@azime/contracts";
import { DbContact } from "../../../contacts/queries";
import { ContactForm } from "../../../contacts/ContactForm";
import { amaModeOptions } from "./cockpit/AmaModeSelect";

export type NewPatientCase = {
  providerAssigned?: string | null;
  patientName: string;
  patientLastName?: string;
  caseContact?: number;
  caseType?: string;
  amaMode: AmaMode | "";
};
interface NewCaseFormProps {
  onSubmit: (data: NewPatientCase) => void;
  contacts: DbContact[];
  submitting: boolean;
  error: string | null;
}
export const caseTypes = [
  { value: "work_injury", label: "Work Injury" },
  { value: "personal_injury", label: "Personal Injury" },
  { value: "other", label: "Other" },
];

const required = (message: string) => {
  const check = ({ value }: { value: unknown }) => (value ? undefined : message);
  return { onChange: check, onSubmit: check };
};

const inputClass =
  "mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function FieldShell({
  id,
  label,
  hint,
  action,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  action?: React.ReactNode;
  errors: unknown[];
  children: React.ReactNode;
}) {
  const error = errors.find(Boolean);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{String(error)}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const NewCaseForm = ({ onSubmit, contacts, submitting, error }: NewCaseFormProps) => {
  const [addingContact, setAddingContact] = useState(false);
  const form = useForm({
    defaultValues: {
      patientName: "",
      patientLastName: "",
      caseContact: 0,
      caseType: "",
      amaMode: "" as AmaMode | "",
    },
    onSubmit: async (values) => onSubmit(values.value),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <form.Field name="patientName" validators={required("First name is required")}>
          {(field) => (
            <FieldShell id="firstName" label="First name" errors={field.state.meta.errors}>
              <input
                id="firstName"
                type="text"
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FieldShell>
          )}
        </form.Field>

        <form.Field name="patientLastName" validators={required("Last name is required")}>
          {(field) => (
            <FieldShell id="lastName" label="Last name" errors={field.state.meta.errors}>
              <input
                id="lastName"
                type="text"
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FieldShell>
          )}
        </form.Field>

        <form.Field name="caseType" validators={required("Case type is required")}>
          {(field) => (
            <FieldShell id="caseType" label="Case type" errors={field.state.meta.errors}>
              <select
                id="caseType"
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              >
                <option value="">Select case type…</option>
                {caseTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </FieldShell>
          )}
        </form.Field>

        <form.Field name="caseContact" validators={required("Contact is required")}>
          {(field) => (
            <FieldShell
              id="contactId"
              label="Contact"
              errors={field.state.meta.errors}
              action={
                addingContact ? null : (
                  <button
                    type="button"
                    onClick={() => setAddingContact(true)}
                    className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                  >
                    <Plus className="size-3.5" /> New contact
                  </button>
                )
              }
            >
              <select
                id="contactId"
                className={inputClass}
                value={field.state.value || ""}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              >
                <option value="">Select a contact…</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </FieldShell>
          )}
        </form.Field>

        {addingContact ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 sm:col-span-2">
            <div className="mb-3 text-sm font-semibold text-slate-800">New contact</div>
            <ContactForm
              onCancel={() => setAddingContact(false)}
              onCreated={(id) => {
                form.setFieldValue("caseContact", id);
                setAddingContact(false);
              }}
            />
          </div>
        ) : null}

        <form.Field name="amaMode" validators={required("Choose what the referral asks for")}>
          {(field) => (
            <FieldShell
              id="amaMode"
              label="AMA rating"
              hint="From the referral. Can be changed later on the case page."
              errors={field.state.meta.errors}
            >
              <select
                id="amaMode"
                className={inputClass}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as AmaMode)}
              >
                <option value="">Per the referral…</option>
                {amaModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldShell>
          )}
        </form.Field>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          <Plus className="size-4" />
          {submitting ? "Creating…" : "Create case"}
        </button>
      </div>
    </form>
  );
};

export default NewCaseForm;
