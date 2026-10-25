import { z } from "zod";
import { amaMotorGradeSchema, amaNerveRootSchema } from "./amaReference.js";
import { regionSchema } from "./regions.js";

// AMA history prerequisite, asked at the visit: residual symptoms and a mechanism
// consistent with the diagnosis. Missing = not asked; false stops rating the diagnosis
// but keeps its findings. Diagnosis conclusions live in the region's diagnosis list.
export const visitAmaHistorySchema = z.object({
  region: regionSchema,
  canonicalDx: z.string(),
  confirmed: z.boolean(),
});

// One AMA component: a reference row + actual root + side, linked to every diagnosis
// it supports, so diagnoses sharing a component share one set of answers.
// Root and side are null for rows without nerve roots. Missing/null answers are
// unresolved, never false. Findings are kept whatever happens to the diagnoses;
// rating eligibility comes from the diagnosis list and the history answer.
export const amaAssessmentSchema = z.object({
  id: z.string().min(1),
  region: regionSchema,
  canonicalDxIds: z.array(z.string()),
  rowId: z.string(),
  nerveRoot: amaNerveRootSchema.nullable(),
  side: z.enum(["left", "right"]).nullable(),
  answers: z.record(z.string(), z.union([z.boolean(), z.string(), z.null()])),
  // Strength grade per muscle-strength task id, so reports can cite the muscle.
  // The motor_* answers are derived from these (amaMotorAnswers).
  motorGrades: z.record(z.string(), amaMotorGradeSchema).default({}),
  // Side-to-side circumference difference in cm per measurement-site task.
  // The atrophy* answers are derived from these (amaAtrophyAnswers).
  atrophyCm: z.record(z.string(), z.number().nonnegative()).default({}),
});

// One class/modifier rating table answered at the visit (v1: myelopathy), linked to
// diagnoses like assessments. Present = the area applies; null answers are unresolved.
export const amaTableSelectionSchema = z.object({
  region: regionSchema,
  tableId: z.string(),
  canonicalDxIds: z.array(z.string()),
  classValue: z.number().int().nullable(),
  modOptionId: z.string().nullable(),
});

// One visit per case. The note may contain optional [REGION] section labels;
// unlabeled text applies to every region. Exam prep priorities are read-only
// suggestions; anything they prompt goes in the note.
export const visitDocumentationSchema = z.object({
  note: z.string(),
  // Exactly one PDQ feeds the post-exam analysis; null until chosen.
  pdqId: z.number().int().positive().nullable(),
  includedQuestionnaireIds: z.array(z.number().int().positive()),
  amaHistory: z.array(visitAmaHistorySchema).default([]),
  amaAssessments: z.array(amaAssessmentSchema).default([]),
  amaTableSelections: z.array(amaTableSelectionSchema).default([]),
});
export type VisitDocumentation = z.infer<typeof visitDocumentationSchema>;
export type VisitAmaHistory = z.infer<typeof visitAmaHistorySchema>;
export type AmaAssessment = z.infer<typeof amaAssessmentSchema>;
export type AmaTableSelection = z.infer<typeof amaTableSelectionSchema>;

export function initializeVisitDocumentation(): VisitDocumentation {
  return {
    note: "",
    pdqId: null,
    includedQuestionnaireIds: [],
    amaHistory: [],
    amaAssessments: [],
    amaTableSelections: [],
  };
}

export const saveVisitDocumentationRequestSchema = z.object({
  documentation: visitDocumentationSchema,
  expectedRevision: z.number().int().nonnegative(),
});
export type SaveVisitDocumentationRequest = z.infer<
  typeof saveVisitDocumentationRequestSchema
>;

// GET /cases/:caseId/visit returns null until the first save.
export const visitDocumentationResponseSchema = z.object({
  id: z.number().int().positive(),
  caseId: z.number().int().positive(),
  documentation: visitDocumentationSchema,
  revision: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VisitDocumentationResponse = z.infer<
  typeof visitDocumentationResponseSchema
>;
