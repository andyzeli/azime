import { z } from "zod";
import { amaMotorGradeSchema, amaNerveRootSchema } from "./amaReference.js";
import { regionSchema } from "./regions.js";
import {
  fullReviewedPreExamAnalysisSchema,
  refinedAnalysisInputSchema,
  refinedAnalysisSchema,
  storedRefinedAnalysisSchema,
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

export const postExamInputSchema = refinedAnalysisInputSchema
  .omit({ reviewedAnalysis: true })
  .extend({
    reviewedTreatmentAnalysis: fullReviewedPreExamAnalysisSchema,
    refinedAnalysis: refinedAnalysisSchema.extend({
      visitPriority: storedRefinedAnalysisSchema.shape.visitPriority,
    }),
    // The case-level note, and this region's priority responses and linked AMA findings
    // only (none when AMA is off). Diagnosis reviews stay on the visit as a record for
    // the report; the corrected scope is already in the input.
    visit: visitDocumentationSchema
      .pick({ note: true, priorityResponses: true })
      .extend({
        pdq: postExamPDQSchema.nullable(),
        questionnaires: z.array(postExamQuestionnaireSchema),
        amaFindings: z.array(postExamAmaFindingsSchema).default([]),
      }),
  });
export const postExamInputSnapshotSchema = z.object({
  input: postExamInputSchema,
  basedOn: z.object({
    refinedAnalysisId: z.number().int().positive(),
    // The refined row is overwritten on regeneration, so its id alone is not a version.
    refinedAnalysisUpdatedAt: z.string(),
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
// Provisional output; finalize descriptions and the prompt before enabling generation.
export const postExamAnalysisSchema = z.object({
  plateauEvidence: z.object({
    supporting: z.array(z.string()),
    opposing: z.array(z.string()),
  }),
  mmiPosture: z.object({
    direction: z.enum([
      "Leans Toward MMI",
      "Leans Against MMI",
      "Indeterminate",
    ]),
    rationale: z.string(),
  }),
});
export const postExamAnalysisProviderSchema = z.enum(["gemini", "openai"]);
export const storedPostExamAnalysisSchema = postExamAnalysisSchema.extend({
  schemaVersion: z.literal("draft-v1"),
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
