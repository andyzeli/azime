import { z } from "zod";

export const providerSummaryProviderSchema = z.enum(["gemini", "openai"]);

export const providerSummaryResponseSchema = z.object({
  // specialty: z
  //   .string()
  //   .describe(
  //     "Medical specialty or provider type, such as Orthopedic Spine Surgery, Physical Therapy, or Primary Care.",
  //   ),
  dateRange: z
    .string()
    .describe(
      "The span of dates represented in this provider's records, using the most precise dates supported by the input.",
    ),
  providerSummary: z
    .string()
    .describe(
      "A concise, factual clinical summary of this provider's records, including key findings, diagnoses, treatment, response, and final documented disposition.",
    ),
});

export const storedProviderSummaryItemSchema =
  providerSummaryResponseSchema.extend({
    providerName: z.string().min(1),
  });

export const storedProviderSummariesSchema = z.object({
  schemaVersion: z.literal("v1"),
  providerSummaries: z.array(storedProviderSummaryItemSchema),
});

export type ProviderSummaryProvider = z.infer<
  typeof providerSummaryProviderSchema
>;
export type ProviderSummary = z.infer<typeof storedProviderSummaryItemSchema>;
export type StoredProviderSummaries = z.infer<
  typeof storedProviderSummariesSchema
>;

export const providerSummariesResponseSchema = z.object({
  caseId: z.number().int(),
  summary: storedProviderSummariesSchema,
});

export type ProviderSummariesResponse = z.infer<
  typeof providerSummariesResponseSchema
>;
