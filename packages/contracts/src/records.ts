import { z } from "zod";

export const documentTypeSchema = z.enum([
  "encounter",
  "therapy_note",
  "imaging_report",
  "surgery_report",
  "intervention_report",
  "generic", //other
  "incident_report",
  "job_description",
  "workstatus",
  "legal_summary",
]);

const requiredText = z.string().trim().min(1);
const optionalText = z.string().trim().min(1).optional();

export const encounterMetadataSchema = z.object({}).strict();

export const therapyNoteMetadataSchema = z.object({}).strict();

export const imagingReportMetadataSchema = z
  .object({
    modality: requiredText,
    region: requiredText,
  })
  .strict();

export const surgeryReportMetadataSchema = z.object({}).strict();

export const interventionReportMetadataSchema = z.object({}).strict();

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
      providerId: z.string().uuid(),
      metadata: encounterMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("therapy_note"),
      providerId: z.string().uuid(),
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
      documentType: z.literal("surgery_report"),
      providerId: z.string().uuid(),
      metadata: surgeryReportMetadataSchema,
    })
    .strict(),
  z
    .object({
      ...uploadBaseShape,
      documentType: z.literal("intervention_report"),
      providerId: z.string().uuid(),
      metadata: interventionReportMetadataSchema,
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
  | z.infer<typeof surgeryReportMetadataSchema>
  | z.infer<typeof interventionReportMetadataSchema>
  | z.infer<typeof legalSummaryMetadataSchema>
  | z.infer<typeof emptyDocumentMetadataSchema>;

export type CompleteRecordUploadInput = z.infer<
  typeof completeRecordUploadSchema
>;

// A record row as returned by GET /records.
export type CaseRecordDto = {
  id: number;
  caseId: number | null;
  url: string | null;
  summary: unknown;
  summaryStatus: string;
  name: string | null;
  providerId: string | null;
  documentType: DocumentType;
  eventDate: string | null;
  metadata: RecordDocumentMetadata | null;
};
