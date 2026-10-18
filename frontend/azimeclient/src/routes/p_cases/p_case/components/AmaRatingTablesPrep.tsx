import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { AmaRatingTable } from "@azime/contracts";
import { cn } from "@/lib/utils";

// Placeholder for diagnoses rated with rating tables instead of spine rows (v1: myelopathy).
// Narrowing works like affected roots: nothing selected shows every table. The selection is
// local for now; the Visit will need it once it is saved.
export function AmaRatingTablesPrep({ tables }: { tables: AmaRatingTable[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const visible = selected.length ? tables.filter((t) => selected.includes(t.table_id)) : tables;
  const toggle = (id: string) =>
    setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="mb-1.5 flex items-baseline gap-2">
        <h3 className="text-[10.5px] font-bold tracking-[.05em] text-slate-500 uppercase">Rating tables</h3>
        <span className="text-[11px] text-slate-400 print:hidden">
          {selected.length ? (
            <button type="button" onClick={() => setSelected([])} className="font-semibold text-blue-600 hover:text-blue-800">
              Show all
            </button>
          ) : (
            "Showing all. Select the affected areas to narrow."
          )}
        </span>
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1.5 print:hidden">
        {tables.map((t) => (
          <button
            key={t.table_id}
            type="button"
            onClick={() => toggle(t.table_id)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11.5px] font-semibold",
              selected.includes(t.table_id)
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
            )}
          >
            {t.description}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {visible.map((t) => (
          <li key={t.table_id} className="text-[12.5px]">
            <div className="font-semibold text-slate-900">{t.description}</div>
            <div className="text-[12px] text-slate-600">
              {[...t.class_options].sort((a, b) => a.value - b.value).map((o) => `${o.value} ${o.label}`).join(" · ")}
            </div>
            <details className="mt-0.5">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-700">Class criteria</summary>
              <div className="mt-1 flex flex-col gap-1.5 text-[12px] leading-relaxed text-slate-600">
                {t.instructions ? (
                  <div className="[&_p]:m-0 whitespace-pre-wrap">
                    <ReactMarkdown>{t.instructions}</ReactMarkdown>
                  </div>
                ) : null}
                {[...t.class_options].sort((a, b) => a.value - b.value).map((o) => (
                  <p key={o.value} className="whitespace-pre-line">
                    <b>Class {o.value} · {o.label}:</b> {o.instructions.replace(/\n\s*\n/g, "\n")}
                  </p>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
