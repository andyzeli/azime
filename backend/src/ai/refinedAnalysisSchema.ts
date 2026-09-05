import { z } from "zod";

export const refinedAnalysisProviderSchema = z.enum(["gemini", "openai"]);

// TODO: Replace this placeholder with the authoritative third-pass response
// schema before enabling makeRefinedAnalysis.
export const refinedAnalysisSchema = z.object({});

export const storedRefinedAnalysisSchema = refinedAnalysisSchema.extend({
  schemaVersion: z.literal("draft-v1"),
  sourceMetadata: z.object({
    provider: refinedAnalysisProviderSchema,
    model: z.string().min(1),
    caseSummaryId: z.number().int(),
    preExamAnalysisId: z.number().int(),
    physicianSteeringId: z.number().int(),
    physicianSteeringRevision: z.number().int().positive(),
  }),
});

export type RefinedAnalysisProvider = z.infer<
  typeof refinedAnalysisProviderSchema
>;
export type RefinedAnalysis = z.infer<typeof refinedAnalysisSchema>;
export type StoredRefinedAnalysis = z.infer<typeof storedRefinedAnalysisSchema>;
