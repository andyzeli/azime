import { z } from "zod";

export const documentTypeSchema = z.enum([
  "encounter",
  "therapy_note",
  "imaging_report",
  "procedure_report",
  "generic", //other
  "incident_report",
  "job_description",
  "workstatus",
  "legal_summary",
]);

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).optional();

export const encounterMetadataSchema = z
  .object({
    providerType: requiredText,
    providerName: requiredText,
  })
  .strict();

export const therapyNoteMetadataSchema = z
  .object({
    therapyType: z.enum(["pt", "ot", "chiro"]),
    providerOrFacility: requiredText,
  })
  .strict();

export const imagingReportMetadataSchema = z
  .object({
    modality: requiredText,
    region: requiredText,
  })
  .strict();

export const procedureReportMetadataSchema = z
  .object({
    procedureType: requiredText,
    performingProvider: requiredText,
  })
  .strict();

export const legalSummaryMetadataSchema = z
  .object({
    author: optionalText,
    lawFirm: optionalText,
  })
  .strict()
  .refine((metadata) => metadata.author || metadata.lawFirm, {
    message: "Author or law firm is required",
  });

export const emptyDocumentMetadataSchema = z.object({}).strict();

const uploadBaseShape = {
  caseId: z.number().int().positive(),
  objectKey: requiredText,
  name: requiredText,
  eventDate: z.string(),
};

export const completeRecordUploadSchema = z.discriminatedUnion("documentType", [
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("encounter"),
      metadata: encounterMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("therapy_note"),
      metadata: therapyNoteMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("imaging_report"),
      metadata: imagingReportMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("procedure_report"),
      metadata: procedureReportMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("legal_summary"),
      metadata: legalSummaryMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("workstatus"),
      metadata: emptyDocumentMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("incident_report"),
      metadata: emptyDocumentMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("generic"),
      metadata: emptyDocumentMetadataSchema,
    })
    .strict(),
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

export type RecordDocumentMetadata =
  | z.infer<typeof encounterMetadataSchema>
  | z.infer<typeof therapyNoteMetadataSchema>
  | z.infer<typeof imagingReportMetadataSchema>
  | z.infer<typeof procedureReportMetadataSchema>
  | z.infer<typeof legalSummaryMetadataSchema>
  | z.infer<typeof emptyDocumentMetadataSchema>;

export type CompleteRecordUploadInput = z.infer<
  typeof completeRecordUploadSchema
>;

export const getDocumentSourceName = (
  metadata: RecordDocumentMetadata | null,
) => {
  if (!metadata) {
    return "";
  }

  const values = metadata as Record<string, unknown>;
  const sourceNameKeys = [
    "providerName",
    "providerOrFacility",
    "performingProvider",
    "author",
    "lawFirm",
  ];

  for (const key of sourceNameKeys) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};
