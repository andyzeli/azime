import { z } from "zod";

const simpleStringField = z.string();

const diagnosisSchema = z.object({
  name: simpleStringField,
  icd: simpleStringField,
  description: simpleStringField,
});

const treatmentSchema = z.object({
  treatment: simpleStringField,
  status: simpleStringField,
  outcome: simpleStringField,
});

const medicationSchema = z.object({
  name: simpleStringField,
  dose: simpleStringField,
  frequency: simpleStringField,
});

const imagingFindingSchema = z.object({
  modality: simpleStringField,
  date: simpleStringField,
  finding: simpleStringField,
});

const functionalLimitationSchema = z.object({
  limitation: simpleStringField,
  status: simpleStringField,
});

const workStatusSchema = z.object({
  asOfdate: simpleStringField,
  status: simpleStringField,
});

const sourceMetadataSchema = z.object({
  recordId: z.number().int(),
  fileName: simpleStringField,
  providerName: simpleStringField,
  documentType: simpleStringField,
});

const findingsSchema = z.object({
  subjective: simpleStringField,
  objective: simpleStringField,
  plan: simpleStringField,
  outcome: simpleStringField,
});

const backgroundSchema = z.object({
  incidentDate: simpleStringField,
  incidentDescription: simpleStringField,
  pastMedicalHistory: simpleStringField,
  allergies: simpleStringField,
});

export const geminiRecordSummaryPayloadSchema = z.object({
  datesOfService: z.array(simpleStringField),
  background: backgroundSchema,
  findings: findingsSchema,
  diagnoses: z.array(diagnosisSchema),
  treatmentsTried: z.array(treatmentSchema),
  imagingFindings: z.array(imagingFindingSchema),
  functionalLimitations: z.array(functionalLimitationSchema),
  medications: z.array(medicationSchema),
  workStatus: z.array(workStatusSchema),
});

export const storedRecordSummarySchema =
  geminiRecordSummaryPayloadSchema.extend({
    schemaVersion: z.literal("v1"),
    sourceMetadata: sourceMetadataSchema,
  });

export type GeminiRecordSummaryPayload = z.infer<
  typeof geminiRecordSummaryPayloadSchema
>;

export type StoredRecordSummary = z.infer<typeof storedRecordSummarySchema>;
