import { z } from "zod";
import { regionSchema } from "./regions.js";
import { treatmentAnalysisItemSchema } from "./preExamAnalysis.js";

const aiAssessmentSchema =
  treatmentAnalysisItemSchema.shape.assessments.element;
const applicabilitySchema = aiAssessmentSchema.shape.aiApplicability;
const adequacySchema = aiAssessmentSchema.shape.aiAdequacy;

const categorySchema = z.enum([
  "conservative",
  "medication",
  "injection",
  "surgical",
  "multimodal",
]);

const assessmentReviewSchema = <T extends z.ZodType>(valueSchema: T) =>
  z.discriminatedUnion("action", [
    z.object({ action: z.literal("agree"), note: z.string().optional() }),
    z.object({
      action: z.literal("override"),
      value: valueSchema,
      rationale: z.string().trim().min(1),
    }),
  ]);

const findingDispositionSchema = z.object({
  disposition: z.enum(["keep", "dismiss"]),
  reason: z.string().optional(),
});

const treatmentAssessmentSteeringSchema = z.object({
  applicability: assessmentReviewSchema(applicabilitySchema).optional(),
  adequacy: assessmentReviewSchema(adequacySchema).optional(),
});

const treatmentRowSteeringSchema = z.object({
  disposition: z.enum(["keep", "prune"]).optional(),

  // A treatment can be applicable/adequate for one diagnosis
  // and inapplicable/inadequate for another.
  assessments: z
    .record(z.string(), treatmentAssessmentSteeringSchema)
    .optional(),

  note: z.string().optional(),
});

const physicianAddedTreatmentSchema = z.object({
  id: z.string().uuid(), // UUID created once when adding the item
  treatmentId: z.string().nullable(), // Taxonomy ID if applicable
  treatment: z.string().trim().min(1),
  category: categorySchema,
  // Optional association with existing documented treatment.
  // Empty for a newly proposed treatment without record evidence.
  episodeIds: z.array(z.string()),
  assessments: z.record(
    z.string(),
    z.object({
      applicability: applicabilitySchema,
      adequacy: adequacySchema,
      rationale: z.string().trim().min(1),
    }),
  ),
  note: z.string().optional(),
});

export const physicianSteeringSchema = z.object({
  preExamAnalysisId: z.number().int().positive(),
  // 3A currently updates in place, so its ID alone cannot identify a run.
  preExamAnalysisUpdatedAt: z.iso.datetime(),
  treatments: z.record(z.string(), treatmentRowSteeringSchema),
  addedTreatments: z.array(physicianAddedTreatmentSchema),
  inconsistencies: z.record(z.string(), findingDispositionSchema),
  evidenceGaps: z.record(z.string(), findingDispositionSchema),
  notes: z.string().nullable(),
});

export type PhysicianSteering = z.infer<typeof physicianSteeringSchema>;
export type TreatmentRowSteering = z.infer<typeof treatmentRowSteeringSchema>;
export type TreatmentAssessmentSteering = z.infer<
  typeof treatmentAssessmentSteeringSchema
>;
export type FindingDisposition = z.infer<typeof findingDispositionSchema>;
export type PhysicianAddedTreatment = z.infer<
  typeof physicianAddedTreatmentSchema
>;

export const savePhysicianSteeringRequestSchema = z.object({
  steering: physicianSteeringSchema,
  expectedRevision: z.number().int().nonnegative(),
});
export type SavePhysicianSteeringRequest = z.infer<
  typeof savePhysicianSteeringRequestSchema
>;

// GET /cases/:caseId/physician-steering/:region
const responseFields = {
  caseId: z.number().int(),
  region: regionSchema,
  steering: physicianSteeringSchema,
};

// An initialized draft is returned by GET without inserting a database row.
export const physicianSteeringResponseSchema = z.union([
  z.object({
    ...responseFields,
    id: z.null(),
    revision: z.literal(0),
    createdAt: z.null(),
    updatedAt: z.null(),
  }),
  z.object({
    ...responseFields,
    id: z.number().int().positive(),
    revision: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
]);

export type PhysicianSteeringResponse = z.infer<
  typeof physicianSteeringResponseSchema
>;
