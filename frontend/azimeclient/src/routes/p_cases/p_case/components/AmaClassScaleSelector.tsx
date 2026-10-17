import { useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import { lookupAmaRatingResult, type AmaRatingTable } from "@azime/contracts";

// Deliberately local: this preview does not enter the Visit draft or save payload.
export function AmaClassScaleSelector({ tables }: { tables: AmaRatingTable[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  if (!tables.length) return null;
  return <section className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px]">
    <div className="font-semibold text-slate-700">AMA rating areas</div>
    <p className="text-slate-500">Choose applicable areas. Selections and answers are a local preview and are not saved.</p>
    {tables.map(table => <div key={table.table_id}>
      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" checked={selected.includes(table.table_id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, table.table_id] : ids.filter(id => id !== table.table_id))} />
        {table.description}
      </label>
      {selected.includes(table.table_id) ? <ClassScale table={table} key={JSON.stringify(table)} /> : null}
    </div>)}
  </section>;
}

function ClassScale({ table }: { table: AmaRatingTable }) {
  const name = useId();
  const [classValue, setClassValue] = useState<number | null>(null);
  const [modOptionId, setModOptionId] = useState<string | null>(null);
  const result = lookupAmaRatingResult(table, classValue, modOptionId);
  return <div className="mt-2 flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3">
    <p className="text-slate-500">{table.source_ref.guides_version} · Chapter {table.source_ref.chapter} · Table {table.source_ref.table}</p>
    {table.instructions ? <div className="whitespace-pre-wrap leading-relaxed text-slate-600 [&_p]:m-0">
      <ReactMarkdown>{table.instructions}</ReactMarkdown>
    </div> : null}
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">Select class</legend>
      {[...table.class_options].sort((a, b) => a.value - b.value).map(option => <label key={option.value} className="flex items-start gap-2">
        <input className="mt-1" type="radio" name={`${name}-class`} checked={classValue === option.value} onChange={() => { setClassValue(option.value); setModOptionId(null); }} />
        <span><span className="font-semibold">Class {option.value} · {option.label}</span><span className="mt-1 block whitespace-pre-wrap leading-relaxed text-slate-600">{option.instructions}</span></span>
      </label>)}
    </fieldset>
    {classValue !== null ? <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{table.mod_options.prompt}</legend>
      {table.mod_options.options.map(option => <label key={option.id} className="flex items-start gap-2">
        <input className="mt-1" type="radio" name={`${name}-mod`} checked={modOptionId === option.id} onChange={() => setModOptionId(option.id)} />
        <span><span className="font-semibold">{option.label}</span><span className="mt-1 block whitespace-pre-wrap leading-relaxed text-slate-600">{option.text}</span></span>
      </label>)}
    </fieldset> : null}
    <p aria-live="polite" className="font-semibold">{result !== null ? `Reference result: ${result}% WPI` : "Answer both questions to see the reference result."}</p>
    <button type="button" className="self-start text-blue-700" onClick={() => { setClassValue(null); setModOptionId(null); }}>Clear answers</button>
  </div>;
}
