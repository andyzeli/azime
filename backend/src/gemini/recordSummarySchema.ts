import { z } from "zod";

const simpleStringField = z.string();

const diagnosisSchema = z.object({
  name: simpleStringField,
  icd: simpleStringField.nullable(),
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

const sourceMetadataSchema = z.object({
  recordId: z.number().int(),
  fileName: simpleStringField,
  providerName: simpleStringField,
  //providerType: simpleStringField,
  documentType: simpleStringField,
});

const findingsSchema = z.object({
  subjective: simpleStringField,
  objective: simpleStringField,
  plan: simpleStringField,
});

const backgroundSchema = z.object({
  incidentDate: simpleStringField.nullable(),
  incidentDescription: simpleStringField.nullable(),
  pastMedicalHistory: simpleStringField.nullable(),
  allergies: simpleStringField.nullable(),
});

//export const gemini

export const geminiEncounterSummaryPayloadSchema = z.object({
  dateOfService: simpleStringField,
  // background: backgroundSchema.nullable(),
  findings: findingsSchema,
  diagnoses: z.array(diagnosisSchema).nullable(),
  functionalLimitations: z.array(functionalLimitationSchema),
  medications: z.array(medicationSchema),
  workStatus: simpleStringField.nullable(),
});
export const geminiProviderSummaryPayloadSchema = z.object({
  encounters: z.array(geminiEncounterSummaryPayloadSchema),
  background: backgroundSchema,
  treatmentsTried: z.array(treatmentSchema),
  imagingFindings: z.array(imagingFindingSchema),
});
export const storedRecordSummarySchema =
  geminiProviderSummaryPayloadSchema.extend({
    schemaVersion: z.literal("v1"),
    sourceMetadata: sourceMetadataSchema,
  });

export type GeminiProviderSummaryPayload = z.infer<
  typeof geminiProviderSummaryPayloadSchema
>;

export type StoredRecordSummary = z.infer<typeof storedRecordSummarySchema>;
