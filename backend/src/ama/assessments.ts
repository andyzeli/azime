import {
  amaAtrophyAnswers,
  amaMotorAnswers,
  isAmaCircumferenceTask,
  isAmaMuscleStrengthTask,
  type AmaAssessment,
  type AmaDiagnosticRow,
} from "@azime/contracts";

// Checks saved assessments against their reference rows. Returns readable problems;
// empty means valid. Diagnosis links are not checked here: an unlinked assessment
// keeps its answers until the physician links or discards it.
export function amaAssessmentProblems(
  assessments: AmaAssessment[],
  rows: Map<string, AmaDiagnosticRow>,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const a of assessments) {
    const label = `${a.rowId} ${a.nerveRoot ?? ""} ${a.side ?? ""}`.trim();
    const key = `${a.region}|${a.rowId}|${a.nerveRoot}|${a.side}`;
    if (seen.has(key)) problems.push(`Duplicate assessment: ${label}`);
    seen.add(key);

    const row = rows.get(a.rowId);
    if (!row || row.region_id !== a.region) {
      problems.push(`Unknown AMA row for region: ${label}`);
      continue;
    }
    if (row.nerve_roots.length) {
      if (!a.nerveRoot || !row.nerve_roots.includes(a.nerveRoot))
        problems.push(`Root does not belong to row: ${label}`);
      if (!a.side) problems.push(`Side required: ${label}`);
    } else if (a.nerveRoot || a.side) {
      problems.push(`Row has no nerve roots: ${label}`);
    }

    const questions = new Map(row.questions.map((q) => [q.id, q]));
    for (const [id, value] of Object.entries(a.answers)) {
      const question = questions.get(id);
      if (!question) problems.push(`Unknown question ${id}: ${label}`);
      else if (value === null) continue;
      else if (
        question.type === "boolean"
          ? typeof value !== "boolean"
          : !question.options.some((o) => o.value === value)
      )
        problems.push(`Invalid answer for ${id}: ${label}`);
    }

    const strengthTasks = new Set(row.examination_tasks.filter(isAmaMuscleStrengthTask).map((t) => t.id));
    for (const taskId of Object.keys(a.motorGrades))
      if (!strengthTasks.has(taskId)) problems.push(`Unknown muscle ${taskId}: ${label}`);
    // Motor criteria are derived from the muscle grades, never answered directly.
    for (const [id, expected] of Object.entries(amaMotorAnswers(row, a.motorGrades)))
      if ((a.answers[id] ?? null) !== expected) problems.push(`Motor answer ${id} does not match muscle grades: ${label}`);

    const sites = new Set(row.examination_tasks.filter(isAmaCircumferenceTask).map((t) => t.id));
    for (const taskId of Object.keys(a.atrophyCm))
      if (!sites.has(taskId)) problems.push(`Unknown measurement site ${taskId}: ${label}`);
    // Atrophy criteria are derived from the measurements, never answered directly.
    for (const [id, expected] of Object.entries(amaAtrophyAnswers(row, a.atrophyCm)))
      if ((a.answers[id] ?? null) !== expected) problems.push(`Atrophy answer ${id} does not match measurements: ${label}`);
  }
  return problems;
}
