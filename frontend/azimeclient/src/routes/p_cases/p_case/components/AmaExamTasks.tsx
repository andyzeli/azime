import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  currentDiagnoses,
  supportedRegions,
  type AmaMode,
  type AmaDiagnosticRow,
  type Region,
} from "@azime/contracts";
import {
  amaCandidatesQueryOptions,
  canonicalDiagnosesQueryOptions,
  regionDiagnosesQueryOptions,
} from "../../../cases/queries";
import { cn } from "@/lib/utils";
import { AmaRatingTablesPrep } from "./AmaRatingTablesPrep";
import { Badge } from "./shared";

type Item = {
  key: string;
  prompt: string;
  help?: string;
  sources: AmaDiagnosticRow[];
};

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// "L5", "T2–T12", or the row description without its region ("Spinal Fracture").
export const sourceLabel = (row: AmaDiagnosticRow) =>
  row.nerve_roots.length
    ? row.nerve_roots.length > 1
      ? `${row.nerve_roots[0]}–${row.nerve_roots.at(-1)}`
      : row.nerve_roots[0]
    : row.description.replace(/^(Cervical|Thoracic|Lumbar) /, "");

// v1: only myelopathy maps to rating tables.
const tablesAlert =
  "For Myelopathy, AMA ratings need to be done via CNS. Before the exam, narrow which areas are affected (e.g. gait, upper extremity, bladder) and plan to assess them; each is graded at the visit.";

// Lists each item once, keeping every row it came from (e.g. thigh circumference for L3–S1).
function collect(
  rows: AmaDiagnosticRow[],
  itemsOf: (row: AmaDiagnosticRow) => Omit<Item, "sources">[]
) {
  const items = new Map<string, Item>();
  for (const row of rows) {
    for (const item of itemsOf(row)) {
      const existing = items.get(item.key);
      if (existing) existing.sources.push(row);
      else items.set(item.key, { ...item, sources: [row] });
    }
  }
  return [...items.values()];
}

const amaModeLabel: Record<AmaMode, string> = {
  rating: "AMA rating requested",
  guidance: "AMA guidance only",
  off: "AMA off",
};

// The case's AMA setting comes from the referral and is set by staff on the case page.
// It affects Visit and the report, so Analysis and the prep sheet both show it.
export function AmaModeBadge({ mode }: { mode: AmaMode }) {
  return (
    <Badge
      className={mode === "rating" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}
    >
      <span title="Set from the referral on the staff case page">{amaModeLabel[mode]}</span>
    </Badge>
  );
}

// Deterministic AMA Guides checklist for the exam, from the region's current diagnoses.
// Roots are unknown before the visit, so every mapped root row is shown provisionally.
export function AmaExamTasks({
  caseId,
  regions,
  mode,
}: {
  caseId: string;
  regions: Region[];
  mode: AmaMode;
}) {
  return (
    <section>
      <div className="prep-section-heading mb-2.5 flex items-baseline gap-2.5">
        <h2 className="text-[15px] font-semibold">AMA examination</h2>
        <span className="text-[11px] text-slate-500">
          {mode === "off"
            ? "No AMA rating requested."
            : "Findings the AMA Guides rows need for each in-scope diagnosis. Roots are confirmed at the visit."}
        </span>
      </div>
      {mode === "off" ? null : (
        <div className="prep-ama-regions flex flex-col gap-3">
          {regions.map((region) => (
            <RegionTasks key={region} caseId={caseId} region={region} withTables={mode === "rating"} />
          ))}
        </div>
      )}
    </section>
  );
}

// Guidance mode keeps the exam rows (tasks, roots, answers for the report) but no rating tables.
function RegionTasks({ caseId, region, withTables }: { caseId: string; region: Region; withTables: boolean }) {
  const list = useQuery(regionDiagnosesQueryOptions(caseId, region));
  const scope = currentDiagnoses(list.data?.diagnoses ?? []);
  const candidates = useQuery({
    ...amaCandidatesQueryOptions(
      caseId,
      region,
      scope.map((canonicalDx) => ({ canonicalDx, affectedRoots: null }))
    ),
    enabled: scope.length > 0,
  });
  const labels = useQuery(canonicalDiagnosesQueryOptions(region));
  // Spine only: narrows the checklist before the visit. Not saved; roots are confirmed at the visit.
  const [roots, setRoots] = useState<string[]>([]);
  const label = (dx: string) =>
    labels.data?.find((d) => d.canonicalDx === dx)?.label ?? dx;

  let body;
  if (list.isPending || (scope.length && candidates.isPending))
    body = <Empty>Loading…</Empty>;
  else if (!scope.length)
    body = <Empty>No diagnoses in scope. Choose them in Analysis.</Empty>;
  else if (!candidates.data)
    body = <Empty>Could not load AMA references.</Empty>;
  else {
    const allRootRows = candidates.data.rows.filter(
      (r) => r.nerve_roots.length
    );
    const rootOptions = [...new Set(allRootRows.flatMap((r) => r.nerve_roots))];
    // Non-root rows always stay; with no roots selected, every root row stays.
    const rows = candidates.data.rows.filter(
      (r) =>
        !r.nerve_roots.length ||
        !roots.length ||
        r.nerve_roots.some((root) => roots.includes(root))
    );
    const rootRows = rows.filter((r) => r.nerve_roots.length);
    const otherRows = rows.filter((r) => !r.nerve_roots.length);
    const toggleRoot = (root: string) =>
      setRoots(
        roots.includes(root)
          ? roots.filter((r) => r !== root)
          : [...roots, root]
      );
    const ratingTables = withTables ? candidates.data.ratingTables : [];
    const tableIdsOf = (d: { candidateTableIds: string[] }) => (withTables ? d.candidateTableIds : []);
    const tasksOf = (row: AmaDiagnosticRow) =>
      row.examination_tasks.map((t) => ({
        key: t.id,
        prompt: t.prompt,
        help: t.help,
      }));
    body = (
      <>
        <div className="prep-diagnoses flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2.5">
          {/* Diagnoses often share rows (every root row), so the count is for the region, not per diagnosis. */}
          {candidates.data.diagnoses.map((d) => (
            <Badge
              key={d.canonicalDx}
              className={
                d.candidateRowIds.length || tableIdsOf(d).length
                  ? "bg-slate-100 text-slate-700"
                  : "bg-slate-50 text-slate-400"
              }
            >
              {label(d.canonicalDx)}
              {d.candidateRowIds.length || tableIdsOf(d).length
                ? ""
                : d.candidateTableIds.length
                  ? " · rating tables only"
                  : " · no mapped AMA reference"}
              {tableIdsOf(d).length ? (
                <span
                  title={tablesAlert}
                  className="ml-1.5 inline-grid size-3.5 cursor-help place-items-center rounded-full bg-amber-500 text-[9.5px] font-bold text-white print:hidden"
                >
                  !
                </span>
              ) : null}
            </Badge>
          ))}
          <span className="ml-1 text-[11px] text-slate-400 print:hidden">
            {candidates.data.rows.length} AMA row
            {candidates.data.rows.length === 1 ? "" : "s"}
            {withTables
              ? ` · ${ratingTables.length} rating table${ratingTables.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>
        {ratingTables.length ? (
          <p className="prep-rating-note hidden print:block">{tablesAlert}</p>
        ) : null}
        {ratingTables.length ? (
          <AmaRatingTablesPrep tables={ratingTables} />
        ) : null}
        {rootOptions.length ? (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2 print:hidden">
            <span className="mr-1 text-[11px] font-semibold text-slate-500">
              Affected roots
            </span>
            {rootOptions.map((root) => (
              <button
                key={root}
                type="button"
                onClick={() => toggleRoot(root)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11.5px] font-semibold",
                  roots.includes(root)
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                )}
              >
                {root}
              </button>
            ))}
            <span className="ml-1 text-[11px] text-slate-400">
              {roots.length ? (
                <button
                  type="button"
                  onClick={() => setRoots([])}
                  className="font-semibold text-blue-600 hover:text-blue-800"
                >
                  Show all
                </button>
              ) : (
                "Showing all. Select to narrow."
              )}
            </span>
          </div>
        ) : null}
        {rows.length ? (
          <div className="prep-task-groups flex flex-col gap-3.5 px-4 py-3">
            <ItemList title="Examination" items={collect(otherRows, tasksOf)} />
            <ItemList
              title="Root-specific examination"
              hint={
                roots.length
                  ? `Selected roots: ${rootOptions.filter((r) => roots.includes(r)).join(", ")}.`
                  : "Every mapped root until the affected roots are selected."
              }
              items={collect(rootRows, tasksOf)}
            />
            <RecordsList rows={rows} />
            <ItemList
              title="Guide notes"
              items={collect(rows, (row) =>
                row.help ? [{ key: row.help, prompt: row.help }] : []
              )}
              muted
            />
          </div>
        ) : ratingTables.length ? null : (
          <Empty>No AMA references mapped for these diagnoses.</Empty>
        )}
      </>
    );
  }

  return (
    <div className="prep-ama-region rounded-xl border border-slate-200 bg-white">
      <div className="prep-region-heading border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold">
        {regionLabel(region)}
      </div>
      {body}
    </div>
  );
}

function ItemList({
  title,
  hint,
  items,
  muted,
}: {
  title: string;
  hint?: string;
  items: Item[];
  muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="prep-task-heading mb-1.5 flex items-baseline gap-2">
        <h3 className="text-[10.5px] font-bold tracking-[.05em] text-slate-500 uppercase">
          {title}
        </h3>
        {hint ? (
          <span className="text-[11px] text-slate-400">{hint}</span>
        ) : null}
      </div>
      <ul className="prep-exam-items flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.key} className="prep-task flex gap-2.5">
            {muted ? null : (
              <span className="prep-checkbox mt-[3px] size-3.5 shrink-0 rounded-[3px] border border-slate-400" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <span
                  className={
                    muted
                      ? "flex-1 text-[12px] leading-relaxed text-slate-600"
                      : "flex-1 text-[12.5px] leading-snug text-slate-900"
                  }
                >
                  {item.prompt}
                </span>
                <span className="prep-sources flex shrink-0 flex-wrap justify-end gap-1">
                  {item.sources.map((row) => (
                    <Badge
                      key={row.row_id}
                      className="prep-source bg-blue-50 text-blue-800"
                    >
                      <span title={`${row.row_id} ${row.description}`}>
                        {sourceLabel(row)}
                      </span>
                    </Badge>
                  ))}
                </span>
              </div>
              {item.help ? (
                <details className="mt-0.5">
                  <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-700">
                    How
                  </summary>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                    {item.help}
                  </p>
                </details>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// CS questions are not merged across rows: their prompts are generic ("confirm this
// fracture criterion?") and the criterion itself lives in help or the options.
function RecordsList({ rows }: { rows: AmaDiagnosticRow[] }) {
  const groups = rows
    .map((row) => ({
      row,
      questions: row.questions.filter((q) => q.group === "CS"),
    }))
    .filter((g) => g.questions.length);
  if (!groups.length) return null;
  return (
    <div className="prep-records">
      <div className="prep-task-heading mb-1.5 flex items-baseline gap-2">
        <h3 className="text-[10.5px] font-bold tracking-[.05em] text-slate-500 uppercase">
          Confirm from records
        </h3>
        <span className="text-[11px] text-slate-400">
          Imaging, EMG or operative findings.
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {groups.map(({ row, questions }) => {
          // Several questions sharing one prompt (fracture criteria): show the prompt once.
          const shared =
            questions.length > 1 &&
            questions.every((q) => q.prompt === questions[0].prompt);
          return (
            <li key={row.row_id} className="prep-task flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {shared ? (
                  <span className="text-[12.5px] leading-snug text-slate-900">
                    {questions[0].prompt}
                  </span>
                ) : null}
                {questions.map((q) => (
                  <div key={q.id} className="flex gap-2.5">
                    <span className="prep-checkbox mt-[3px] size-3.5 shrink-0 rounded-[3px] border border-slate-400" />
                    <div className="min-w-0 flex-1 text-[12.5px] leading-snug">
                      {shared ? (
                        <span className="text-slate-700">{q.help}</span>
                      ) : (
                        <>
                          <span className="text-slate-900">{q.prompt}</span>
                          {q.type === "choice" ? (
                            <span className="text-slate-500">
                              {" "}
                              {q.options.map((o) => o.label).join(" · ")}
                            </span>
                          ) : null}
                          {q.help && q.help.length <= 400 ? (
                            <p className="mt-0.5 text-[12px] text-slate-600">
                              {q.help}
                            </p>
                          ) : q.help ? (
                            <details className="mt-0.5">
                              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-700">
                                Qualifying studies
                              </summary>
                              <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-slate-600">
                                {q.help}
                              </p>
                            </details>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Badge className="prep-source shrink-0 bg-blue-50 text-blue-800">
                <span title={`${row.row_id} ${row.description}`}>
                  {sourceLabel(row)}
                </span>
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-3 text-[12.5px] text-slate-500">{children}</p>;
}
