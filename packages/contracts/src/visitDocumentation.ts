import { z } from "zod";
import { regionSchema } from "./regions.js";

// Priority IDs are positional within one exam prep run, so responses are matched
// by region + focus text and survive regeneration only if the priority does.
export const visitPriorityResponseSchema = z.object({
  region: regionSchema,
  focus: z.string(),
  status: z.enum(["couldnt_assess", "declined", "not_relevant", "response"]),
  note: z.string().nullable(),
});

// The physician confirms or rejects each in-scope diagnosis at the visit. A rejection
// (wrong or incomplete) marks the region's exam prep stale until it is regenerated
// (after Analysis is redone); the visit itself is kept as is.
export const visitDiagnosisReviewSchema = z.object({
  region: regionSchema,
  canonicalDx: z.string(),
  status: z.enum(["confirmed", "rejected"]),
  note: z.string().nullable(),
  // updatedAt of the exam prep the decision was made against.
  refinedUpdatedAt: z.string(),
});

// One visit per case. The note may contain optional [REGION] section labels;
// unlabeled text applies to every region.
export const visitDocumentationSchema = z.object({
  note: z.string(),
  // Exactly one PDQ feeds the post-exam analysis; null until chosen.
  pdqId: z.number().int().positive().nullable(),
  includedQuestionnaireIds: z.array(z.number().int().positive()),
  priorityResponses: z.array(visitPriorityResponseSchema),
  diagnosisReviews: z.array(visitDiagnosisReviewSchema),
});
export type VisitDocumentation = z.infer<typeof visitDocumentationSchema>;
export type VisitPriorityResponse = z.infer<typeof visitPriorityResponseSchema>;
export type VisitDiagnosisReview = z.infer<typeof visitDiagnosisReviewSchema>;

export function initializeVisitDocumentation(): VisitDocumentation {
  return {
    note: "",
    pdqId: null,
    includedQuestionnaireIds: [],
    priorityResponses: [],
    diagnosisReviews: [],
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
