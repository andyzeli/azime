import { z } from "zod";
import { amaMotorGradeSchema, amaNerveRootSchema } from "./amaReference.js";
import { regionSchema } from "./regions.js";
import {
  fullReviewedPreExamAnalysisSchema,
  refinedAnalysisInputSchema,
  trajectorySchema,
} from "./refinedAnalysis.js";
import { visitDocumentationSchema } from "./visitDocumentation.js";

// Freeze question wording/options with responses so scores are interpretable later.
export const postExamPDQSchema = z.object({
  instrumentVersion: z.string(),
  completedAt: z.string(),
  questions: z.array(
    z.object({
      id: z.string(),
      group: z.string(),
      prompt: z.string(),
      options: z.array(z.object({ value: z.number(), label: z.string() })),
    }),
  ),
  responses: z.array(z.object({ itemId: z.string(), score: z.number() })),
  scores: z.object({
    totalScore: z.number(),
    denominator: z.number(),
    maxScore: z.number(),
    percentage: z.number().nullable(),
  }),
});

// Other included questionnaires (e.g. regional) are frozen the same way.
export const postExamQuestionnaireSchema = postExamPDQSchema.extend({
  type: z.string(),
  title: z.string(),
});

// One AMA component's findings, frozen with the reference wording so each answer
// traces to the test that produced it without the live reference data.
export const postExamAmaFindingsSchema = z.object({
  rowId: z.string(),
  description: z.string(),
  nerveRoot: amaNerveRootSchema.nullable(),
  side: z.enum(["left", "right"]).nullable(),
  canonicalDxIds: z.array(z.string()),
  // Tests performed: a graded muscle, a measured site, or a task with an answered question.
  examination: z.array(
    z.object({
      taskId: z.string(),
      prompt: z.string(),
      questionIds: z.array(z.string()),
      motorGrade: amaMotorGradeSchema.nullable(),
      atrophyCm: z.number().nullable(),
    }),
  ),
  // Resolved answers only; a missing question was not assessed. criterion = the AMA wording.
  answers: z.array(
    z.object({
      questionId: z.string(),
      group: z.string(),
      prompt: z.string(),
      criterion: z.string().nullable(),
      answer: z.union([z.boolean(), z.string()]),
      answerLabel: z.string().nullable(),
    }),
  ),
});

// Pass 4 input: built from 3A + saved steering + the diagnosis list + the visit; no
// dependency on exam prep (3B). Scope is the region's current diagnoses only: pass 4 never
// sees not-supported diagnoses (necessity questions are a query, shown in Opinions).
export const postExamInputSchema = z.object({
  caseContext: refinedAnalysisInputSchema.shape.caseContext,
  region: regionSchema,
  diagnoses: z.array(z.object({ canonicalDx: z.string(), label: z.string() })),
  caseSummary: refinedAnalysisInputSchema.shape.caseSummary,
  reviewedTreatmentAnalysis: fullReviewedPreExamAnalysisSchema,
  visit: z.object({
    // TODO: take from the office visit / appointment once those tables are used.
    examinationDate: z.string(),
    note: visitDocumentationSchema.shape.note,
    pdq: postExamPDQSchema.nullable(),
    questionnaires: z.array(postExamQuestionnaireSchema),
    // Includes findings whose diagnosis links are gone; none when AMA is off.
    amaFindings: z.array(postExamAmaFindingsSchema),
  }),
});
export const postExamInputSnapshotSchema = z.object({
  input: postExamInputSchema,
  basedOn: z.object({
    caseSummaryId: z.number().int().positive(),
    preExamAnalysisId: z.number().int().positive(),
    preExamAnalysisUpdatedAt: z.iso.datetime(),
    physicianSteeringId: z.number().int().positive(),
    physicianSteeringRevision: z.number().int().positive(),
    diagnosesRevision: z.number().int().nonnegative(),
    visitDocumentationId: z.number().int().positive(),
    visitDocumentationRevision: z.number().int().positive(),
    pdqId: z.number().int().positive().nullable(),
    pdqUpdatedAt: z.string().nullable(),
  }),
});
export type PostExamInputSnapshot = z.infer<typeof postExamInputSnapshotSchema>;
export type PostExamInput = z.infer<typeof postExamInputSchema>;
export type PostExamPDQ = z.infer<typeof postExamPDQSchema>;
export type PostExamAmaFindings = z.infer<typeof postExamAmaFindingsSchema>;
export type PostExamQuestionnaire = z.infer<typeof postExamQuestionnaireSchema>;

export const postExamAnalysisSchema = z.object({
  trajectory: z
    .object({
      subjective: trajectorySchema.describe(
        "Change in patient-reported symptoms, ending with what the patient reports today (note, PDQ, questionnaires). Persistent symptoms do not by themselves establish worsening function or objective findings.",
      ),
      functional: trajectorySchema.describe(
        "Change in activities, work capacity, and limitations, ending with today's reported and observed function. Preserve whether function was reported, observed, or restricted by a clinician; a work restriction alone does not establish actual capacity.",
      ),
      objective: trajectorySchema.describe(
        "Change in examination findings or measurements, ending with today's examination (AMA findings, note). Account for comparability between observations.",
      ),
    })
    .describe(`
    The patient's trajectory through today's examination. Assess each component
    independently; they may differ without being contradictory. Use dates rather than
    array order; today's findings are dated examinationDate. Distinguish change over
    time from disagreement between sources.
  `),
  plateauEvidence: z
    .object({
      supporting: z
        .array(z.string())
        .describe(
          "Specific findings indicating the condition has stabilized and further meaningful improvement is unlikely, e.g. comparable findings across dates, exhausted treatment without further gains. One finding per item, naming where it comes from and when.",
        ),
      opposing: z
        .array(z.string())
        .describe(
          "Specific findings indicating the condition is still changing or could still meaningfully improve, e.g. recent improvement, applicable treatment that is not exhausted, unresolved conflicts between sources. One finding per item, naming where it comes from and when.",
        ),
    })
    .describe(
      "Evidence for and against a clinical plateau. Report what the evidence shows; do not weigh it here.",
    ),
  mmiPosture: z.object({
    direction: z
      .enum(["Leans Toward MMI", "Leans Against MMI", "Indeterminate"])
      .describe(
        "Where the evidence leans. This informs, but is not, the physician's MMI determination. Use Indeterminate when the evidence is balanced or insufficient.",
      ),
    rationale: z
      .string()
      .describe(
        "Concisely weigh the plateau evidence and trajectory, naming the findings that decide the lean and what would change it.",
      ),
  }),
});
export const postExamAnalysisProviderSchema = z.enum(["gemini", "openai"]);
export const storedPostExamAnalysisSchema = postExamAnalysisSchema.extend({
  schemaVersion: z.literal("draft-v2"),
  sourceMetadata: z.object({
    provider: postExamAnalysisProviderSchema,
    model: z.string().min(1),
  }),
});
export type PostExamAnalysisOutput = z.infer<typeof postExamAnalysisSchema>;
export type PostExamAnalysisProvider = z.infer<
  typeof postExamAnalysisProviderSchema
>;
export type StoredPostExamAnalysis = z.infer<
  typeof storedPostExamAnalysisSchema
>;

export const generatePostExamAnalysisRequestSchema = z.object({
  snapshotId: z.number().int().positive(),
});
export const postExamAnalysisResponseSchema = z.object({
  id: z.number().int().positive(),
  caseId: z.number().int().positive(),
  region: regionSchema,
  inputSnapshot: postExamInputSnapshotSchema,
  analysis: storedPostExamAnalysisSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PostExamAnalysisResponse = z.infer<
  typeof postExamAnalysisResponseSchema
>;
