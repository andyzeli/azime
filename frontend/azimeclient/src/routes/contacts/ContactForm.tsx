import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContact, type NewContact } from "./queries";

const contactTypes = ["Attorney office", "Insurance carrier", "Employer", "Case manager"];

const inputClass =
  "mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const empty = { name: "", type: "", email: "", website: "" };

// Not a <form>: it is also rendered inside the new-case form, and forms cannot nest.
export function ContactForm({
  onCreated,
  onCancel,
}: {
  onCreated?: (id: number) => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(empty);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useMutation({
    mutationFn: (contact: NewContact) => createContact(contact),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setDraft(empty);
      setShowErrors(false);
      onCreated?.(id);
    },
  });
  const errors = {
    name: draft.name.trim() ? null : "Name is required",
    type: draft.type.trim() ? null : "Type is required",
  };

  const save = () => {
    setShowErrors(true);
    if (errors.name || errors.type) return;
    mutation.mutate({
      name: draft.name.trim(),
      type: draft.type.trim(),
      email: draft.email.trim() || null,
      website: draft.website.trim() || null,
    });
  };

  const field = (key: keyof typeof empty, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className={inputClass}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
      />
      {showErrors && key in errors && errors[key as keyof typeof errors] ? (
        <span className="mt-1 block text-xs text-red-600">{errors[key as keyof typeof errors]}</span>
      ) : null}
    </label>
  );

  return (
    <div>
      <fieldset disabled={mutation.isPending} className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {field("name", "Name", { placeholder: "e.g. Smith & Lee LLP" })}
        {field("type", "Type", { list: "contact-types", placeholder: "Attorney office" })}
        {field("email", "Email", { type: "email" })}
        {field("website", "Website", { type: "url", placeholder: "https://" })}
        <datalist id="contact-types">
          {contactTypes.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
      </fieldset>
      <div className="mt-4 flex items-center justify-end gap-2">
        {mutation.isError ? <p className="text-sm text-red-600">Failed to save the contact.</p> : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={mutation.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {mutation.isPending ? "Saving…" : "Save contact"}
        </button>
      </div>
    </div>
  );
}
