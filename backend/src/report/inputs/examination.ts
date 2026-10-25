import type {
  ReportBaseInput,
  ReportInput,
  ReportBaseQuestionnaire,
  ReportQuestionnaire,
} from "@azime/contracts";

export function compactReportQuestionnaire(
  q: ReportBaseQuestionnaire,
  examinationDate: string,
): ReportQuestionnaire {
  const completedOn = q.completedAt.slice(0, 10);
  return {
    name: q.title,
    question_description: q.instructions,
    total_score:
      q.scores.percentage === null ? null : `${q.scores.percentage}%`,
    ...(completedOn !== examinationDate ? { completed_on: completedOn } : {}),
    answers: q.answers.map((a) => ({
      question: a.question,
      // Retain descriptive selections on nonnumeric instruments as part of the
      // compact response; a number alone would discard the patient's answer.
      score: `${a.score} / ${a.scoreRange[1]}${a.answerLabel ? ` — ${a.answerLabel}` : ""}`,
    })),
  };
}

export function compactReportExamination(
  examination: ReportBaseInput["examination"],
) {
  const { pdq, questionnaires, amaFindings, ...rest } = examination;
  const regionalFindings: Pick<
    ReportInput["examination"],
    | "lumbar_spine_findings"
    | "cervical_spine_findings"
    | "thoracic_spine_findings"
  > = {};
  for (const { region, findings } of amaFindings) {
    if (!findings.length) continue;
    const key = `${region}_findings` as const;
    regionalFindings[key] = [
      ...(regionalFindings[key] ?? []),
      ...findings.map((f) => ({
        nerveRoot: f.nerveRoot,
        side: f.side,
        ...(f.nerveRoot === null ? { finding: f.row } : {}),
        tests: f.tests,
      })),
    ];
  }
  return {
    ...rest,
    ...regionalFindings,
    questionnaires_completed: [...(pdq ? [pdq] : []), ...questionnaires].map(
      (q) => compactReportQuestionnaire(q, examination.date),
    ),
  };
}
