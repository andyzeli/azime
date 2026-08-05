// import { z } from "zod";
// import { storedRecordSummarySchema } from "./recordSummarySchema.js";

// const simpleStringField = z.string();

// const aggregateCaseMetadataSchema = z.object({
//   caseId: z.number().int(),
//   patientName: simpleStringField,
//   patientLastName: simpleStringField,
//   caseType: simpleStringField,
//   caseStatus: simpleStringField,
// });

// const aggregateProviderSummaryInputSchema = z.object({
//   recordId: z.number().int(),
//   fileName: simpleStringField,
//   providerName: simpleStringField,
//   documentType: simpleStringField,
//   summary: storedRecordSummarySchema,
// });

// export const aggregateSummaryInputSchema = z.object({
//   case: aggregateCaseMetadataSchema,
//   providerSummaries: z.array(aggregateProviderSummaryInputSchema).min(1),
// });

// const backgroundSummarySchema = z.object({
//   incidentDate: simpleStringField,
//   incidentDescriptionSummary: simpleStringField,
//   pastMedicalHistorySummary: simpleStringField,
//   allergiesSummary: simpleStringField,
//   backgroundConflicts: simpleStringField,
// });

// export const geminiAggregateSummaryPayloadSchema = z.object({
//   mainSummary: simpleStringField,
//   patientInfo: simpleStringField,
//   backgroundSummary: backgroundSummarySchema,
//   currentStatus: simpleStringField,
// });

// export const storedAggregateSummarySchema =
//   geminiAggregateSummaryPayloadSchema.extend({
//     schemaVersion: z.literal("draft-v1"),
//     sourceMetadata: z.object({
//       caseId: z.number().int(),
//       providerCount: z.number().int(),
//       providerRecordIds: z.array(z.number().int()),
//     }),
//   });

// export type AggregateSummaryInput = z.infer<typeof aggregateSummaryInputSchema>;

// export type GeminiAggregateSummaryPayload = z.infer<
//   typeof geminiAggregateSummaryPayloadSchema
// >;

// export type StoredAggregateSummary = z.infer<
//   typeof storedAggregateSummarySchema
// >;
