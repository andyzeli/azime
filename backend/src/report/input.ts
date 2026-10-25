import {
  remainingCareCandidates,
  type LegacyReportInput,
  type PostExamAmaFindings,
  type PostExamInput,
  type PostExamPDQ,
  type ReportBaseInput,
  type ReportBaseQuestionnaire,
  type ReportTreatment,
} from "@azime/contracts";
import { questionnaireDefinitions } from "../questionnaires/definitions.js";
import type { WorkStatusHistoryEntry } from "../queries/workStatusHistory.js";
import { compactAmaFindings } from "./history.js";

// Group only exact matches. Similar prose or different assessments stay separate.
export function groupTreatmentAssessments(
  assessments: LegacyReportInput["discussion"]["regions"][number]["treatmentAnalysis"][number]["assessments"],
): ReportTreatment["reviewedAssessments"] {
  const grouped = new Map<
    string,
    ReportTreatment["reviewedAssessments"][number]
  >();
  for (const { diagnosis, ...assessment } of assessments) {
    const key = JSON.stringify([
      assessment.applicability,
      assessment.rationale,
    ]);
    const existing = grouped.get(key);
    if (existing) existing.diagnoses.push(diagnosis);
    else grouped.set(key, { diagnoses: [diagnosis], ...assessment });
  }
  return [...grouped.values()];
}

export function reportQuestionnaire(
  title: string,
  q: PostExamPDQ,
): ReportBaseQuestionnaire {
  const definition = Object.values(questionnaireDefinitions).find(
    (d) => d.version === q.instrumentVersion,
  );
  return {
    title,
    completedAt: q.completedAt,
    scores: q.scores,
    instructions: definition?.instructions ?? null,
    answers: q.responses.flatMap(({ itemId, score }) => {
      const question = q.questions.find((item) => item.id === itemId);
      if (!question) return [];
      const values = question.options.map((option) => option.value);
      const label = question.options.find(
        (option) => option.value === score,
      )?.label;
      return [
        {
          group: question.group,
          question: question.prompt,
          score,
          scoreRange: [Math.min(...values), Math.max(...values)] as [
            number,
            number,
          ],
          ...(label && label !== String(score) ? { answerLabel: label } : {}),
        },
      ];
    }),
  };
}

export function reportAmaFindings(
  f: PostExamAmaFindings,
  label: (dx: string) => string,
) {
  // The frozen answer retains the selected option, not all options. Do not infer
  // normal sensation or invent which unselected sensory findings were assessed.
  const compact = compactAmaFindings(
    {
      ...f,
      answers: f.answers.map((a) =>
        a.questionId === "sensory_status" && a.answer === "none"
          ? { ...a, answerLabel: "No listed sensory finding selected" }
          : a,
      ),
    },
    label,
  );
  return {
    ...compact,
    tests: compact.tests.map((test) => {
      if (test.result !== "none") return test;
      const task = f.examination.find(
        (t) => t.prompt.trim().replace(/[.?]$/, "") === test.test,
      );
      const negatives = f.answers.filter(
        (a) => task?.questionIds.includes(a.questionId) && a.answer === false,
      );
      return {
        ...test,
        result:
          negatives
            .map(
              (a) =>
                `No ${a.prompt.replace(/^Is the (?:specified )?/i, "").replace(/ finding present\?$/i, "")} finding`,
            )
            .join("; ") || test.result,
      };
    }),
  };
}

type RegionSource = {
  postExamInput: PostExamInput;
  label: (dx: string) => string;
};

// Source rows and legacy treatment rows share order because the comparison builder
// maps every frozen treatment once. Recommendations join by frozen ID, never name.
export function reshapeReportInput(
  legacy: LegacyReportInput,
  sources: RegionSource[],
  workStatus: WorkStatusHistoryEntry[],
  categories: ReadonlyMap<string, string>,
): ReportBaseInput {
  const visit = sources[0]!.postExamInput.visit;
  return {
    ...legacy,
    schemaVersion: "report-v2",
    referralQuestions: [],
    background: {
      recordedMedications: legacy.background.medications,
      psychosocialFactors: legacy.background.psychosocialFactors,
    },
    workStatus: workStatus.map(({ date, status, restrictions }) => ({
      documentedOn: date,
      status,
      restrictions,
    })),
    examination: {
      ...legacy.examination,
      pdq: visit.pdq
        ? reportQuestionnaire("Pain and disability questionnaire", visit.pdq)
        : null,
      questionnaires: visit.questionnaires.map((q) =>
        reportQuestionnaire(q.title, q),
      ),
      amaFindings: sources.map(({ postExamInput, label }) => ({
        region: postExamInput.region,
        findings: postExamInput.visit.amaFindings.map((f) =>
          reportAmaFindings(f, label),
        ),
      })),
    },
    discussion: {
      ...legacy.discussion,
      regions: legacy.discussion.regions.map((r, i) => {
        return buildReportRegion(r, sources[i]!, categories);
      }),
    },
  };
}

export function buildReportRegion(
  r: LegacyReportInput["discussion"]["regions"][number],
  sourceRegion: RegionSource,
  categories: ReadonlyMap<string, string>,
): ReportBaseInput["discussion"]["regions"][number] {
  const reviewed = sourceRegion.postExamInput.reviewedTreatmentAnalysis;
  const recommendations = new Map(
    remainingCareCandidates(reviewed).map(({ treatment }, index) => {
      const { disposition, note } = r.remainingCare[index]!;
      return [treatment.id, { disposition, note }];
    }),
  );
  return {
    region: r.region,
    treatments: r.treatmentAnalysis.map((t, index) => {
      const source = reviewed.treatments[index]!;
      return {
        treatment: t.treatment,
        category:
          source.category ??
          (source.treatmentId
            ? (categories.get(source.treatmentId) ?? null)
            : null),
        documentedHistory: {
          status: t.recordStatus,
          detail: t.recordDetail,
        },
        reviewedAssessments: groupTreatmentAssessments(t.assessments),
        exhaustion: {
          value: t.exhaustion,
          rationale: t.exhaustionRationale,
        },
        physicianRecommendation: recommendations.get(source.id) ?? null,
      };
    }),
    priorAnalysis: {
      trajectory: r.trajectory,
      plateauEvidence: r.plateauEvidence,
    },
    physicianDecisions: {
      causation: r.causation,
      mmi: r.mmi,
      impairment: r.impairment,
    },
  };
}
