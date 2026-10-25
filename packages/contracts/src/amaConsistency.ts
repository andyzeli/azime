import type { AmaDiagnosticRow, AmaQuestion } from "./amaReference.js";
import type { Region } from "./regions.js";
import type { AmaAssessment } from "./visitDocumentation.js";

export const radiculopathyDiagnosis: Record<Region, string> = {
  lumbar_spine: "lumbar_radiculopathy",
  thoracic_spine: "thoracic_radiculopathy",
  cervical_spine: "cervical_radiculopathy",
};

// Residual symptoms without objective loss are radicular only once a study confirms the
// root (the Guides rate that as radiculopathy); on their own they are not a finding.
const isPositive = (q: AmaQuestion, answers: AmaAssessment["answers"]) => {
  const answer = answers[q.id];
  if (q.type === "boolean") return answer === true;
  if (answer === "symptoms_without_objective_loss") return answers.cs_confirmed === true;
  return typeof answer === "string" && answer !== "none";
};

export type RadiculopathyMismatch = {
  kind: "findings_without_diagnosis" | "diagnosis_without_findings";
  components: Pick<AmaAssessment, "nerveRoot" | "side">[];
};

// Radiculopathy should agree with the nerve-root exam findings, both ways:
// - a positive physical exam finding on any root (symptoms count with study confirmation),
//   but radiculopathy is not a current diagnosis;
// - radiculopathy is a current diagnosis, but every root's physical exam is answered and negative.
// Findings still being recorded raise nothing.
export function radiculopathyCheck(
  region: Region,
  currentDiagnoses: string[],
  assessments: AmaAssessment[],
  rows: AmaDiagnosticRow[]
): RadiculopathyMismatch | null {
  const rowsById = new Map(rows.map((row) => [row.row_id, row]));
  const roots = assessments.flatMap((a) => {
    const row = rowsById.get(a.rowId);
    if (a.region !== region || !row?.nerve_roots.length) return [];
    return [{ a, exam: row.questions.filter((q) => q.group === "PE") }];
  });
  const positive = roots.filter(({ a, exam }) => exam.some((q) => isPositive(q, a.answers)));
  const component = ({ a }: (typeof roots)[number]) => ({ nerveRoot: a.nerveRoot, side: a.side });

  if (!currentDiagnoses.includes(radiculopathyDiagnosis[region]))
    return positive.length
      ? { kind: "findings_without_diagnosis", components: positive.map(component) }
      : null;
  const allNegative =
    roots.length > 0 &&
    !positive.length &&
    roots.every(({ a, exam }) => exam.every((q) => a.answers[q.id] != null));
  return allNegative
    ? { kind: "diagnosis_without_findings", components: roots.map(component) }
    : null;
}
