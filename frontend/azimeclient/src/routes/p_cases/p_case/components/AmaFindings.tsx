import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  isAmaCircumferenceTask,
  isAmaMuscleStrengthTask,
  supportedRegions,
  type AmaAssessment,
  type AmaDiagnosticRow,
  type AmaExaminationTask,
  type AmaMode,
  type AmaMotorGrade,
  type AmaQuestion,
  type RefinedAnalysisResponse,
  type Region,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { answeredCount, regionAmaCandidatesQueryOptions, setAnswers, setAtrophyCm, setMotorGrade } from "../amaAssessments";
import { sourceLabel } from "./AmaExamTasks";
import { Badge, Segmented } from "./shared";

type Answer = boolean | string | null;
type Answers = Record<string, Answer>;

const gradeOptions: { value: AmaMotorGrade; label: string }[] = [
  { value: "5", label: "5" },
  { value: "4", label: "4" },
  { value: "3", label: "3" },
  { value: "2", label: "2" },
  { value: "0_to_1", label: "0–1" },
];
// motor_4 → "4/5", motor_0_to_1 → "0–1/5"
const motorGradeLabel = (questionId: string) =>
  `${gradeOptions.find((o) => `motor_${o.value}` === questionId)?.label ?? questionId}/5`;
// "Assess great/big toe extensor strength." → "Great/big toe extensor"
const muscleLabel = (task: AmaExaminationTask) => {
  const muscle = task.prompt.match(/^Assess (.+?) (?:muscle )?strength\b/)?.[1] ?? task.prompt;
  return muscle[0].toUpperCase() + muscle.slice(1);
};

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// Tasks and questions are many-to-many (three strength tests share the same motor
// grades), so each question is shown once, under the first task that links it. A later
// task whose questions are all placed joins that section's heading.
function taskSections(row: AmaDiagnosticRow) {
  const byId = new Map(row.questions.map((q) => [q.id, q]));
  const sections: { tasks: AmaExaminationTask[]; questions: AmaQuestion[] }[] = [];
  const placed = new Map<string, (typeof sections)[number]>();
  for (const task of row.examination_tasks) {
    const own = task.question_ids.filter((id) => !placed.has(id));
    if (!own.length) {
      placed.get(task.question_ids[0])!.tasks.push(task);
      continue;
    }
    const section = { tasks: [task], questions: own.flatMap((id) => byId.get(id) ?? []) };
    sections.push(section);
    own.forEach((id) => placed.set(id, section));
  }
  return sections;
}

// Today's findings for each AMA component created in the Diagnoses card. Answers are
// optional in both modes; in guidance mode they are recorded but nothing is rated.
export function AmaFindingsCard({
  caseId,
  regions,
  assessments,
  amaMode,
  dxLabel,
  onChange,
}: {
  caseId: string;
  regions: RefinedAnalysisResponse[];
  assessments: AmaAssessment[];
  amaMode: AmaMode;
  dxLabel: (dx: string) => string;
  onChange: (assessments: AmaAssessment[]) => void;
}) {
  const shown = regions.filter((r) => assessments.some((a) => a.region === r.region));
  if (amaMode === "off" || !shown.length) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-baseline gap-2.5 border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">AMA findings</h2>
        <span className="flex-1 text-[11px] text-slate-500">
          {amaMode === "rating"
            ? "Today's findings decide each component's rating. Leave anything you didn't assess unanswered."
            : "Optional record of today's findings for the report. Nothing is rated."}
        </span>
        {amaMode === "guidance" ? <Badge className="bg-slate-100 text-slate-600">Guidance only</Badge> : null}
      </div>
      {shown.map((refined) => (
        <RegionFindings
          key={refined.region}
          caseId={caseId}
          refined={refined}
          assessments={assessments}
          dxLabel={dxLabel}
          onChange={onChange}
        />
      ))}
    </section>
  );
}

function RegionFindings({
  caseId,
  refined,
  assessments,
  dxLabel,
  onChange,
}: {
  caseId: string;
  refined: RefinedAnalysisResponse;
  assessments: AmaAssessment[];
  dxLabel: (dx: string) => string;
  onChange: (assessments: AmaAssessment[]) => void;
}) {
  const candidates = useQuery(regionAmaCandidatesQueryOptions(caseId, refined));
  const rowsById = new Map((candidates.data?.rows ?? []).map((row) => [row.row_id, row]));
  return (
    <div className="border-b border-slate-100 px-4 py-2.5 last:border-b-0">
      <div className="mb-1 text-[10.5px] font-bold tracking-[.05em] text-slate-500">{regionLabel(refined.region).toUpperCase()}</div>
      <div className="divide-y divide-slate-100">
        {assessments
          .filter((a) => a.region === refined.region)
          .map((a) => (
            <ComponentFindings
              key={a.id}
              assessment={a}
              row={rowsById.get(a.rowId)}
              loading={candidates.isPending}
              dxLabel={dxLabel}
              onAnswers={(updates) => onChange(setAnswers(assessments, a.id, updates))}
              onMotorGrade={(row, taskId, grade) => onChange(setMotorGrade(assessments, a.id, row, taskId, grade))}
              onAtrophyCm={(row, taskId, cm) => onChange(setAtrophyCm(assessments, a.id, row, taskId, cm))}
              onDiscard={() => onChange(assessments.filter((x) => x.id !== a.id))}
            />
          ))}
      </div>
    </div>
  );
}

function ComponentFindings({
  assessment: a,
  row,
  loading,
  dxLabel,
  onAnswers,
  onMotorGrade,
  onAtrophyCm,
  onDiscard,
}: {
  assessment: AmaAssessment;
  row: AmaDiagnosticRow | undefined;
  loading: boolean;
  dxLabel: (dx: string) => string;
  onAnswers: (updates: Answers) => void;
  onMotorGrade: (row: AmaDiagnosticRow, taskId: string, grade: AmaMotorGrade | null) => void;
  onAtrophyCm: (row: AmaDiagnosticRow, taskId: string, cm: number | null) => void;
  onDiscard: () => void;
}) {
  if (!row)
    return (
      <p className="py-2 text-[12px] text-slate-400">
        {loading ? "Loading…" : `AMA row ${a.rowId} is not in this region's current candidates.`}
      </p>
    );
  const answered = answeredCount(a, row);
  const total = row.questions.length;
  const unlinked = !a.canonicalDxIds.length;
  return (
    // Incomplete components open by default, so newly added ones are ready to fill in.
    <Collapsible defaultOpen={answered < total} className="group/component">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
          <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-data-[state=open]/component:rotate-90" />
          <Badge className="bg-blue-50 text-blue-800">
            <span title={`${row.row_id} ${row.description}`}>
              {a.nerveRoot ? `${a.nerveRoot} · ${a.side === "left" ? "Left" : "Right"}` : sourceLabel(row)}
            </span>
          </Badge>
          <span className={cn("min-w-0 flex-1 truncate text-[12px]", unlinked ? "text-amber-700" : "text-slate-600")}>
            {unlinked ? "No linked diagnosis. Answers kept, not rated." : a.canonicalDxIds.map(dxLabel).join(", ")}
          </span>
          <Progress answered={answered} total={total} />
        </CollapsibleTrigger>
        {unlinked ? (
          <button type="button" onClick={onDiscard} className="text-[11px] font-semibold text-slate-500 hover:text-red-700">
            Discard
          </button>
        ) : null}
      </div>
      <CollapsibleContent>
        <FindingsForm
          row={row}
          assessment={a}
          onAnswers={onAnswers}
          onMotorGrade={(taskId, grade) => onMotorGrade(row, taskId, grade)}
          onAtrophyCm={(taskId, cm) => onAtrophyCm(row, taskId, cm)}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function Progress({ answered, total }: { answered: number; total: number }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-slate-500">
      <span className="h-1 w-12 overflow-hidden rounded-full bg-slate-100">
        <span
          className={cn("block h-full rounded-full", answered === total ? "bg-green-500" : "bg-blue-500")}
          style={{ width: `${total ? (answered / total) * 100 : 0}%` }}
        />
      </span>
      {answered}/{total}
    </span>
  );
}

function FindingsForm({
  row,
  assessment: { answers, motorGrades, atrophyCm },
  onAnswers,
  onMotorGrade,
  onAtrophyCm,
}: {
  row: AmaDiagnosticRow;
  assessment: AmaAssessment;
  onAnswers: (updates: Answers) => void;
  onMotorGrade: (taskId: string, grade: AmaMotorGrade | null) => void;
  onAtrophyCm: (taskId: string, cm: number | null) => void;
}) {
  const sections = taskSections(row);
  const studies = row.questions.filter((q) => q.group === "CS");
  const history = row.questions.filter((q) => q.group === "diagnosis");
  // Fracture criteria share one generic prompt; the criterion itself is the help.
  const sharedStudyPrompt =
    studies.length > 1 && studies.every((q) => q.prompt === studies[0].prompt) ? studies[0].prompt : null;
  const question = (q: AmaQuestion, label?: string) => (
    <Question key={q.id} question={q} label={label} value={answers[q.id] ?? null} onChange={(v) => onAnswers({ [q.id]: v })} />
  );

  return (
    <div className="mb-3 ml-6 flex flex-col gap-3.5">
      {sections.length ? (
        <Group title="Examination">
          {sections.map(({ tasks, questions }) =>
            tasks.some(isAmaMuscleStrengthTask) ? (
              <Strength key={tasks[0].id} tasks={tasks} questions={questions} answers={answers} grades={motorGrades} onGrade={onMotorGrade} />
            ) : tasks.some(isAmaCircumferenceTask) ? (
              <Atrophy key={tasks[0].id} tasks={tasks} questions={questions} answers={answers} atrophyCm={atrophyCm} onMeasure={onAtrophyCm} />
            ) : questions.length > 1 && questions.every((q) => q.type === "boolean") ? (
              <Checklist key={tasks[0].id} tasks={tasks} questions={questions} answers={answers} onAnswers={onAnswers} />
            ) : (
              <div key={tasks[0].id}>
                <TaskHeading tasks={tasks} />
                <div className="mt-1 divide-y divide-slate-100 border-l-2 border-slate-100 pl-3">{questions.map((q) => question(q))}</div>
              </div>
            ),
          )}
        </Group>
      ) : null}
      {studies.length ? (
        <Group title="Clinical studies" hint="Imaging, EMG or operative findings">
          {sharedStudyPrompt ? <div className="text-[12.5px] font-semibold text-slate-900">{sharedStudyPrompt}</div> : null}
          <div className="divide-y divide-slate-100 border-l-2 border-slate-100 pl-3">
            {studies.map((q) => (sharedStudyPrompt ? question({ ...q, help: undefined }, q.help) : question(q)))}
          </div>
        </Group>
      ) : null}
      {history.length ? (
        <Group title="History">
          <div className="divide-y divide-slate-100 border-l-2 border-slate-100 pl-3">{history.map((q) => question(q))}</div>
        </Group>
      ) : null}
    </div>
  );
}

function TaskHeading({ tasks }: { tasks: AmaExaminationTask[] }) {
  return (
    <>
      {tasks.map((t) => (
        <div key={t.id} className="text-[12.5px] font-semibold leading-snug text-slate-900">{t.prompt}</div>
      ))}
      <HowTo helps={[...new Set(tasks.flatMap((t) => t.help ?? []))]} />
    </>
  );
}

// One grade per muscle, so the report can say which muscle was weak. The motor_*
// criteria are derived from the grades; other linked tasks (heel raises) inform grading.
function Strength({
  tasks,
  questions,
  answers,
  grades,
  onGrade,
}: {
  tasks: AmaExaminationTask[];
  questions: AmaQuestion[];
  answers: Answers;
  grades: AmaAssessment["motorGrades"];
  onGrade: (taskId: string, grade: AmaMotorGrade | null) => void;
}) {
  const met = questions.filter((q) => answers[q.id] === true);
  const graded = Object.keys(grades).length > 0;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] font-semibold text-slate-900">Strength</span>
        <span className="text-[11px] text-slate-500">Assess all; grade at least the weakest muscle.</span>
      </div>
      <div className="mt-1 divide-y divide-slate-100 border-l-2 border-slate-100 pl-3">
        {tasks.map((t) =>
          isAmaMuscleStrengthTask(t) ? (
            <div key={t.id} className="flex items-center gap-3 py-1.5">
              <span className="flex-1 text-[12.5px] text-slate-800">{muscleLabel(t)}</span>
              <Segmented
                value={grades[t.id]}
                onChange={(grade) => onGrade(t.id, grades[t.id] === grade ? null : grade)}
                options={gradeOptions}
              />
              <span className="w-5 text-[11px] text-slate-400">/5</span>
            </div>
          ) : (
            <div key={t.id} className="py-1.5 text-[12px] text-slate-600">
              <span className="font-semibold text-slate-500">Informs grading: </span>
              {t.prompt}
              <HowTo helps={t.help ? [t.help] : []} />
            </div>
          ),
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-3 pl-3.5 text-[11px] text-slate-500">
        {graded ? (
          <span>
            Criteria met:{" "}
            <b className="text-slate-700">{met.length ? met.map((q) => motorGradeLabel(q.id)).join(", ") : "none (full strength)"}</b>
          </span>
        ) : null}
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer font-semibold hover:text-slate-700">Grade criteria</summary>
          {questions.map((q) => (
            <p key={q.id} className="mt-1 leading-relaxed">{q.help}</p>
          ))}
        </details>
      </div>
    </div>
  );
}

// One side-to-side difference per measurement site, so the report can cite the site and
// size. The atrophy* bands are derived from the measurements.
function Atrophy({
  tasks,
  questions,
  answers,
  atrophyCm,
  onMeasure,
}: {
  tasks: AmaExaminationTask[];
  questions: AmaQuestion[];
  answers: Answers;
  atrophyCm: AmaAssessment["atrophyCm"];
  onMeasure: (taskId: string, cm: number | null) => void;
}) {
  const met = questions.filter((q) => answers[q.id] === true);
  const measured = Object.keys(atrophyCm).length > 0;
  // "Is the specified >1 cm to ≤1.5 cm muscle atrophy/asymmetry present?" → ">1 cm to ≤1.5 cm"
  const band = (q: AmaQuestion) => q.prompt.match(/specified (.+?) muscle/)?.[1] ?? q.id;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] font-semibold text-slate-900">Atrophy</span>
        <span className="text-[11px] text-slate-500">Circumference difference between sides, in cm. Enter 0 for none.</span>
      </div>
      <div className="mt-1 divide-y divide-slate-100 border-l-2 border-slate-100 pl-3">
        {tasks.map((t) => (
          <div key={t.id} className="py-1.5">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-[12.5px] text-slate-800">{t.prompt}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={atrophyCm[t.id] ?? ""}
                onChange={(e) => {
                  const cm = e.target.valueAsNumber;
                  if (e.target.value === "") onMeasure(t.id, null);
                  else if (!Number.isNaN(cm)) onMeasure(t.id, Math.max(0, cm));
                }}
                className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-[12px] tabular-nums outline-none focus:border-blue-400"
              />
              <span className="w-5 text-[11px] text-slate-400">cm</span>
            </div>
            <HowTo helps={t.help ? [t.help] : []} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-baseline gap-3 pl-3.5 text-[11px] text-slate-500">
        {measured ? (
          <span>
            Criteria met: <b className="text-slate-700">{met.length ? met.map(band).join(", ") : "none"}</b>
          </span>
        ) : null}
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer font-semibold hover:text-slate-700">Band criteria</summary>
          {questions.map((q) => (
            <p key={q.id} className="mt-1 leading-relaxed">{q.help}</p>
          ))}
        </details>
      </div>
    </div>
  );
}

// Several criteria of one measurement (reflex) can be true at once.
// Untouched = unresolved; once anything is checked, unchecked criteria are not met.
function Checklist({
  tasks,
  questions,
  answers,
  onAnswers,
}: {
  tasks: AmaExaminationTask[];
  questions: AmaQuestion[];
  answers: Answers;
  onAnswers: (updates: Answers) => void;
}) {
  const checked = (q: AmaQuestion) => answers[q.id] === true;
  const none = questions.some((q) => answers[q.id] != null) && !questions.some(checked);
  const all = (value: boolean | null) => Object.fromEntries(questions.map((q) => [q.id, value]));
  const toggle = (q: AmaQuestion) => {
    const next = Object.fromEntries(questions.map((o) => [o.id, o === q ? !checked(q) : checked(o)]));
    // Unchecking the last finding returns the measurement to unresolved.
    onAnswers(Object.values(next).some(Boolean) ? next : all(null));
  };
  return (
    <div>
      <TaskHeading tasks={tasks} />
      <div className="mt-1 flex flex-col gap-1 border-l-2 border-slate-100 py-1 pl-3">
        <span className="text-[11px] text-slate-500">Check all that are present.</span>
        {questions.map((q) => (
          <CheckRow key={q.id} checked={checked(q)} label={q.help ?? q.prompt} onClick={() => toggle(q)} />
        ))}
        <CheckRow checked={none} label="None of these" onClick={() => onAnswers(all(none ? null : false))} />
      </div>
    </div>
  );
}

function CheckRow({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12px] leading-snug",
        checked ? "border-slate-900 bg-slate-50 text-slate-900" : "border-slate-200 text-slate-700 hover:border-slate-300",
      )}
    >
      <span
        className={cn(
          "mt-px grid size-3.5 shrink-0 place-items-center rounded-[3px] border text-[10px] font-bold leading-none text-white",
          checked ? "border-slate-900 bg-slate-900" : "border-slate-400",
        )}
      >
        {checked ? "✓" : null}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[.05em] text-slate-500">{title}</h3>
        {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function HowTo({ helps }: { helps: string[] }) {
  if (!helps.length) return null;
  return (
    <details className="mt-0.5">
      <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-700">How</summary>
      {helps.map((help) => (
        <p key={help} className="mt-1 text-[12px] leading-relaxed text-slate-600">{help}</p>
      ))}
    </details>
  );
}

// The prompt is often generic ("the specified 4/5 motor findings"), so the criterion in
// help is always shown. Long guidance (EMG requirements) expands after its first paragraph.
function Help({ text }: { text: string }) {
  const [first, ...rest] = text.split(/\n\s*\n/);
  const more = rest.join("\n\n");
  const heading = more.split("\n")[0];
  return (
    <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
      <p className="whitespace-pre-line">{first}</p>
      {more ? (
        <details className="mt-1">
          <summary className="cursor-pointer font-semibold hover:text-slate-700">
            {heading.endsWith(":") ? heading.slice(0, -1) : "More"}
          </summary>
          <p className="mt-1 whitespace-pre-line">{heading.endsWith(":") ? more.slice(heading.length + 1) : more}</p>
        </details>
      ) : null}
    </div>
  );
}

// Clicking the active answer clears it back to unanswered.
function Question({
  question: q,
  label,
  value,
  onChange,
}: {
  question: AmaQuestion;
  label?: string;
  value: Answer;
  onChange: (value: Answer) => void;
}) {
  if (q.type === "boolean")
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] leading-snug text-slate-800">{label ?? q.prompt}</div>
          {q.help ? <Help text={q.help} /> : null}
        </div>
        <Segmented
          value={value === null ? undefined : value ? "yes" : "no"}
          onChange={(v) => onChange(value === (v === "yes") ? null : v === "yes")}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </div>
    );
  return (
    <div className="py-2">
      <div className="text-[12.5px] leading-snug text-slate-800">{label ?? q.prompt}</div>
      {q.help ? <Help text={q.help} /> : null}
      <div className="mt-1.5 flex flex-col gap-1">
        {q.options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              title={o.help}
              onClick={() => onChange(selected ? null : o.value)}
              className={cn(
                "flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12px]",
                selected ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300",
              )}
            >
              <span
                className={cn(
                  "mt-[3px] size-3 shrink-0 rounded-full border",
                  selected ? "border-[3.5px] border-slate-900" : "border-slate-400",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className={selected ? "font-semibold text-slate-900" : "text-slate-700"}>{o.label}</span>
                {selected && o.help ? (
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-slate-500">{o.help}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
