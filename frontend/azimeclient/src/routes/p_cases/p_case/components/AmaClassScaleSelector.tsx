import { useId } from "react";
import ReactMarkdown from "react-markdown";
import {
  lookupAmaRatingResult,
  type AmaRatingTable,
  type AmaTableSelection,
  type Region,
} from "@azime/contracts";

// Class and modifier per rating table, saved with the Visit. One selection per
// region + table, linked to every diagnosis it was checked under (like assessments).
export function AmaClassScaleSelector({
  region,
  dx,
  tables,
  selections,
  onChange,
}: {
  region: Region;
  dx: string;
  tables: AmaRatingTable[];
  selections: AmaTableSelection[];
  onChange: (selections: AmaTableSelection[]) => void;
}) {
  if (!tables.length) return null;
  const selectionOf = (tableId: string) =>
    selections.find((s) => s.region === region && s.tableId === tableId);
  const others = (tableId: string) =>
    selections.filter((s) => s.region !== region || s.tableId !== tableId);
  const checked = (tableId: string) =>
    selectionOf(tableId)?.canonicalDxIds.includes(dx) ?? false;

  const toggle = (tableId: string, on: boolean) => {
    const current = selectionOf(tableId);
    const dxIds = (current?.canonicalDxIds ?? []).filter((id) => id !== dx);
    if (on) dxIds.push(dx);
    onChange([
      ...others(tableId),
      ...(dxIds.length
        ? [current
            ? { ...current, canonicalDxIds: dxIds }
            : { region, tableId, canonicalDxIds: dxIds, classValue: null, modOptionId: null }]
        : []),
    ]);
  };
  const answer = (selection: AmaTableSelection) =>
    onChange([...others(selection.tableId), selection]);

  return <section className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px]">
    <div className="font-semibold text-slate-700">AMA rating areas</div>
    <p className="text-slate-500">Choose applicable areas, then the class and modifier for each.</p>
    {tables.map(table => {
      const selection = selectionOf(table.table_id);
      return <div key={table.table_id}>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={checked(table.table_id)} onChange={event => toggle(table.table_id, event.target.checked)} />
          {table.description}
        </label>
        {selection && checked(table.table_id) ? <ClassScale table={table} selection={selection} onChange={answer} /> : null}
      </div>;
    })}
  </section>;
}

function ClassScale({
  table,
  selection,
  onChange,
}: {
  table: AmaRatingTable;
  selection: AmaTableSelection;
  onChange: (selection: AmaTableSelection) => void;
}) {
  const name = useId();
  const { classValue, modOptionId } = selection;
  const result = lookupAmaRatingResult(table, classValue, modOptionId);
  return <div className="mt-2 flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3">
    <p className="text-slate-500">{table.source_ref.guides_version} · Chapter {table.source_ref.chapter} · Table {table.source_ref.table}</p>
    {table.instructions ? <div className="whitespace-pre-wrap leading-relaxed text-slate-600 [&_p]:m-0">
      <ReactMarkdown>{table.instructions}</ReactMarkdown>
    </div> : null}
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">Select class</legend>
      {[...table.class_options].sort((a, b) => a.value - b.value).map(option => <label key={option.value} className="flex items-start gap-2">
        <input className="mt-1" type="radio" name={`${name}-class`} checked={classValue === option.value} onChange={() => onChange({ ...selection, classValue: option.value, modOptionId: null })} />
        <span><span className="font-semibold">Class {option.value} · {option.label}</span><span className="mt-1 block whitespace-pre-wrap leading-relaxed text-slate-600">{option.instructions}</span></span>
      </label>)}
    </fieldset>
    {classValue !== null ? <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{table.mod_options.prompt}</legend>
      {table.mod_options.options.map(option => <label key={option.id} className="flex items-start gap-2">
        <input className="mt-1" type="radio" name={`${name}-mod`} checked={modOptionId === option.id} onChange={() => onChange({ ...selection, modOptionId: option.id })} />
        <span><span className="font-semibold">{option.label}</span><span className="mt-1 block whitespace-pre-wrap leading-relaxed text-slate-600">{option.text}</span></span>
      </label>)}
    </fieldset> : null}
    <p aria-live="polite" className="font-semibold">{result !== null ? `Reference result: ${result}% WPI` : "Answer both questions to see the reference result."}</p>
    <button type="button" className="self-start text-blue-700" onClick={() => onChange({ ...selection, classValue: null, modOptionId: null })}>Clear answers</button>
  </div>;
}
