import {
  isAmaCircumferenceTask,
  isAmaMuscleStrengthTask,
  type AmaAssessment,
  type AmaDiagnosticRow,
  type AmaExaminationTask,
  type PostExamAmaFindings,
} from "@azime/contracts";

// Freezes one assessment with its row's wording. Strength and circumference tasks count
// as performed only when graded/measured; tasks that only inform motor grading (S1 heel
// raises) are left out; any other task counts once a linked question is answered.
export function freezeAmaFindings(
  a: AmaAssessment,
  row: AmaDiagnosticRow,
): PostExamAmaFindings {
  const performed = (t: AmaExaminationTask) =>
    isAmaMuscleStrengthTask(t)
      ? t.id in a.motorGrades
      : isAmaCircumferenceTask(t)
        ? t.id in a.atrophyCm
        : !t.question_ids.every((id) => id.startsWith("motor_")) &&
          t.question_ids.some((id) => a.answers[id] != null);
  return {
    rowId: a.rowId,
    description: row.description,
    nerveRoot: a.nerveRoot,
    side: a.side,
    canonicalDxIds: a.canonicalDxIds,
    examination: row.examination_tasks.filter(performed).map((t) => ({
      taskId: t.id,
      prompt: t.prompt,
      questionIds: t.question_ids,
      motorGrade: a.motorGrades[t.id] ?? null,
      atrophyCm: a.atrophyCm[t.id] ?? null,
    })),
    answers: row.questions.flatMap((q) => {
      const answer = a.answers[q.id];
      if (answer == null) return [];
      return [
        {
          questionId: q.id,
          group: q.group,
          prompt: q.prompt,
          criterion: q.help ?? null,
          answer,
          answerLabel:
            q.type === "choice"
              ? (q.options.find((o) => o.value === answer)?.label ?? null)
              : null,
        },
      ];
    }),
  };
}
