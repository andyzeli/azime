import type {
  PostExamAmaFindings,
  PostExamPDQ,
  ReportAmaFindings,
  LegacyReportInput as ReportInput,
  LegacyReportQuestionnaire as ReportQuestionnaire,
} from "@azime/contracts";
import type { MedicationHistoryEntry } from "../queries/medicationHistory.js";
import type { WorkStatusHistoryEntry } from "../queries/workStatusHistory.js";


// Records repeat the same work status visit after visit; consecutive records with the
// same status and restrictions become one dated period. Expects date order.
export function collapseWorkStatus(
  entries: WorkStatusHistoryEntry[]
): ReportInput["workStatus"] {
  const key = (e: WorkStatusHistoryEntry) =>
    `${e.status}|${[...e.restrictions].sort().join("|")}`;
  const periods: (ReportInput["workStatus"][number] & { key: string })[] = [];
  for (const e of entries) {
    const last = periods.at(-1);
    if (last?.key === key(e)) last.to = e.date ?? last.to;
    else
      periods.push({
        key: key(e),
        from: e.date,
        to: e.date,
        status: e.status,
        restrictions: e.restrictions,
      });
  }
  return periods.map(({ key: _, ...period }) => period);
}

// Encounters restate the medication list each visit; one entry per medication.
// Expects date order.
export function collapseMedications(
  entries: MedicationHistoryEntry[]
): ReportInput["background"]["medications"] {
  const byName = new Map<string, ReportInput["background"]["medications"][number]>();
  for (const e of entries) {
    const name = e.medication.trim();
    if (!name) continue;
    const dose = e.dose.trim();
    const existing = byName.get(name.toLowerCase());
    if (!existing) {
      byName.set(name.toLowerCase(), {
        medication: name,
        doses: dose ? [dose] : [],
        firstDate: e.date,
        lastDate: e.date,
        lastAction: e.action,
      });
      continue;
    }
    if (dose && !existing.doses.includes(dose)) existing.doses.push(dose);
    existing.lastDate = e.date ?? existing.lastDate;
    existing.lastAction = e.action;
  }
  return [...byName.values()];
}

// The frozen questionnaire keeps every option so scores stay interpretable; the report
// needs only the chosen answer for each question.
export function compactQuestionnaire(
  title: string,
  q: PostExamPDQ
): ReportQuestionnaire {
  return {
    title,
    completedAt: q.completedAt,
    scores: q.scores,
    answers: q.responses.flatMap(({ itemId, score }) => {
      const question = q.questions.find((x) => x.id === itemId);
      if (!question) return [];
      return [
        {
          group: question.group,
          question: question.prompt,
          answer: question.options.find((o) => o.value === score)?.label ?? String(score),
          score,
        },
      ];
    }),
  };
}

// Motor and atrophy criteria are derived from the grades and measurements, which are
// reported instead.
const isDerived = (questionId: string) => /^(motor_|atrophy)/.test(questionId);

type AmaAnswer = PostExamAmaFindings["answers"][number];

const testName = (text: string) => text.trim().replace(/[.?]$/, "");

// Criteria without an examination test are named by the first line of their AMA wording
// (e.g. the fracture type), unless that line only introduces a list.
const criterionLabel = (a: AmaAnswer) => {
  const first = a.criterion?.split(/\r?\n/)[0]?.trim();
  return testName(first && !/\(one of the following\)$/.test(first) ? first : a.prompt);
};

const answerResult = (a: AmaAnswer) => {
  if (typeof a.answer === "string") return a.answerLabel ?? a.answer;
  const prompt = a.prompt.trim();
  if (/positive\?$/i.test(prompt)) return a.answer ? "positive" : "negative";
  if (/present\?$/i.test(prompt)) return a.answer ? "present" : "absent";
  return a.answer ? "yes" : "no";
};

// One { test, result } per examination test performed, then the study and history
// criteria. The drafter writes the prose.
export function compactAmaFindings(
  f: PostExamAmaFindings,
  label: (dx: string) => string
): ReportAmaFindings {
  const answers = f.answers.filter((a) => !isDerived(a.questionId));
  const linked = new Set(f.examination.flatMap((t) => t.questionIds));
  const tests = f.examination.flatMap((t) => {
    const test = testName(t.prompt);
    if (t.motorGrade !== null)
      return [{ test, result: `${t.motorGrade.replace("_to_", "–")}/5` }];
    if (t.atrophyCm !== null) return [{ test, result: `${t.atrophyCm} cm` }];
    const resolved = answers.filter((a) => t.questionIds.includes(a.questionId));
    if (!resolved.length) return [];
    // Several yes/no findings for one test (reflexes): list those present.
    if (t.questionIds.filter((id) => !isDerived(id)).length > 1) {
      const present = resolved
        .filter((a) => a.answer === true)
        .map((a) => a.prompt.replace(/^Is the (?:specified )?/i, "").replace(/ finding present\?$/i, ""));
      return [{ test, result: present.join("; ") || "none" }];
    }
    return [{ test, result: answerResult(resolved[0]!) }];
  });
  for (const a of answers.filter((a) => !linked.has(a.questionId))) {
    tests.push({
      test:
        a.questionId === "cs_confirmed" && f.nerveRoot !== null
          ? "Nerve root confirmed by imaging, electrodiagnosis or surgery"
          : criterionLabel(a),
      result: typeof a.answer === "boolean" ? (a.answer ? "yes" : "no") : answerResult(a),
    });
  }
  return {
    diagnoses: f.canonicalDxIds.map(label),
    row: f.description,
    nerveRoot: f.nerveRoot,
    side: f.side,
    tests,
  };
}
