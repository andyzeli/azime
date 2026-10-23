import {
  amaAtrophyAnswers,
  amaMotorAnswers,
  type AmaAssessment,
  type AmaDiagnosticRow,
  type AmaMotorGrade,
  type Region,
} from "@azime/contracts";
import { amaCandidatesQueryOptions } from "../../cases/queries";

// One AMA component: row + actual root + side. Root and side are null for rows without roots.
export type AmaComponentKey = Pick<
  AmaAssessment,
  "region" | "rowId" | "nerveRoot" | "side"
>;

// Candidate rows for a region's current diagnoses. Roots are chosen per assessment, so all mapped rows load.
export const regionAmaCandidatesQueryOptions = (
  caseId: string,
  region: Region,
  diagnoses: string[]
) =>
  amaCandidatesQueryOptions(
    caseId,
    region,
    diagnoses.map((canonicalDx) => ({ canonicalDx, affectedRoots: null }))
  );

export const isComponent = (a: AmaAssessment, key: AmaComponentKey) =>
  a.region === key.region &&
  a.rowId === key.rowId &&
  a.nerveRoot === key.nerveRoot &&
  a.side === key.side;

const hasAnswers = (a: AmaAssessment) =>
  Object.values(a.answers).some((v) => v !== null);


// Unlinked assessments without answers are dropped; ones with answers are kept for review.
const prune = (assessments: AmaAssessment[]) =>
  assessments.filter((a) => a.canonicalDxIds.length || hasAnswers(a));

// Link or unlink a diagnosis to a component. Diagnoses that share a component share
// one assessment, so the same findings are never collected twice.
export function toggleComponent(
  assessments: AmaAssessment[],
  key: AmaComponentKey,
  dx: string
) {
  const existing = assessments.find((a) => isComponent(a, key));
  if (!existing)
    return [
      ...assessments,
      {
        id: crypto.randomUUID(),
        ...key,
        canonicalDxIds: [dx],
        answers: {},
        motorGrades: {},
        atrophyCm: {},
      },
    ];
  const canonicalDxIds = existing.canonicalDxIds.includes(dx)
    ? existing.canonicalDxIds.filter((d) => d !== dx)
    : [...existing.canonicalDxIds, dx];
  return prune(
    assessments.map((a) =>
      a === existing ? { ...existing, canonicalDxIds } : a
    )
  );
}

type Answer = AmaAssessment["answers"][string];

// A null answer is removed: a missing answer is unresolved, never false.
const applyAnswers = (
  answers: AmaAssessment["answers"],
  updates: Record<string, Answer>
) => ({
  ...Object.fromEntries(
    Object.entries(answers).filter(([q]) => !(q in updates))
  ),
  ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== null)),
});

export const setAnswers = (
  assessments: AmaAssessment[],
  id: string,
  updates: Record<string, Answer>
) =>
  assessments.map((a) =>
    a.id === id ? { ...a, answers: applyAnswers(a.answers, updates) } : a
  );

// Grading a muscle (null clears it) re-derives the row's motor_* answers.
export function setMotorGrade(
  assessments: AmaAssessment[],
  id: string,
  row: AmaDiagnosticRow,
  taskId: string,
  grade: AmaMotorGrade | null
) {
  return assessments.map((a) => {
    if (a.id !== id) return a;
    const motorGrades = Object.fromEntries(
      Object.entries(a.motorGrades).filter(([t]) => t !== taskId)
    );
    if (grade) motorGrades[taskId] = grade;
    return {
      ...a,
      motorGrades,
      answers: applyAnswers(a.answers, amaMotorAnswers(row, motorGrades)),
    };
  });
}

// Measuring a site (null clears it) re-derives the row's atrophy* answers.
export function setAtrophyCm(
  assessments: AmaAssessment[],
  id: string,
  row: AmaDiagnosticRow,
  taskId: string,
  cm: number | null
) {
  return assessments.map((a) => {
    if (a.id !== id) return a;
    const atrophyCm = Object.fromEntries(
      Object.entries(a.atrophyCm).filter(([t]) => t !== taskId)
    );
    if (cm !== null) atrophyCm[taskId] = cm;
    return {
      ...a,
      atrophyCm,
      answers: applyAnswers(a.answers, amaAtrophyAnswers(row, atrophyCm)),
    };
  });
}
