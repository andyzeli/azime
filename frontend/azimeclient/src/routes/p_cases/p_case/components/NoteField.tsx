import { useState } from "react";
import { SaveLabel } from "./SaveLabel";

export const fieldClassName =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-[12px] outline-none focus:border-blue-400";

// Saves on blur. The draft stays shown so the field doesn't flicker while saving.
export function NoteField({
  value,
  onSave,
  placeholder,
  failed,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder: string;
  failed: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <textarea
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (draft !== null && draft !== value) onSave(draft);
        }}
        placeholder={placeholder}
        className={`h-14 w-full resize-none ${fieldClassName}`}
      />
      <SaveLabel draft={draft} saved={value} focused={focused} failed={failed} />
    </div>
  );
}

