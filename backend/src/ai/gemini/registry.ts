import { z } from "zod";
import type { DocumentType } from "../../records/documentMetadata.js";
import {
  buildEncounterSchema,
  buildSurgerySchema,
  encounterSchema,
  encounterSystemPrompt,
  genericSummarySchema,
  genericDocumentSystemPrompt,
  imagingSchema,
  imagingSystemPrompt,
  incidentReportSchema,
  incidentReportSystemPrompt,
  jobDescriptionSchema,
  jobDescriptionSystemPrompt,
  surgerySchema,
  surgerySystemPrompt,
  buildInterventionSchema,
  interventionSystemPrompt,
  therapySchema,
  therapySystemPrompt,
  workStatusReportSchema,
  workStatusSystemPrompt,
  buildTherapySchema,
  interventionSchema,
} from "./extraction/index.js";

type ExtractionConfig = {
  schema: z.ZodObject<any>;
  systemPrompt: string;
};

export type CaseRegions = Array<string>;

export type DiagnosisExtractionContext = {
  canonicalDiagnoses: Array<{
    id: string;
    regionId: string;
    label: string;
    definition: string | null;
    icdPrefixes: string[];
  }>;
};

const withStoredFields = <T extends z.ZodRawShape>(
  extractionSchema: z.ZodObject<T>,
) =>
  extractionSchema.extend({
    schemaVersion: z.literal("v1"),
  });

type PrefixedDiagnosis = z.output<
  ReturnType<typeof buildEncounterSchema>
>["diagnoses"][number];

function toStoredDiagnosis(diagnosis: PrefixedDiagnosis) {
  if (diagnosis.canonicalDx === "unresolved") {
    return {
      ...diagnosis,
      region: "unclear",
      canonicalDx: "unresolved",
    };
  }

  const separatorIndex = diagnosis.canonicalDx.indexOf(".");
  if (
    separatorIndex < 1 ||
    separatorIndex === diagnosis.canonicalDx.length - 1
  ) {
    throw new Error(
      `Canonical diagnosis must have the form region.canonicalDx: ${diagnosis.canonicalDx}`,
    );
  }

  return {
    ...diagnosis,
    region: diagnosis.canonicalDx.slice(0, separatorIndex),
    canonicalDx: diagnosis.canonicalDx.slice(separatorIndex + 1),
  };
}

export function createStoredSchema<T extends z.ZodRawShape>(
  extractionSchema: z.ZodObject<T>,
  documentType: DocumentType,
) {
  const storedSchema = withStoredFields(extractionSchema);

  if (documentType === "encounter") {
    return storedSchema.transform((extraction) => {
      const diagnosisExtraction = extraction as typeof extraction & {
        diagnoses: PrefixedDiagnosis[];
      };

      return {
        ...diagnosisExtraction,
        diagnoses: diagnosisExtraction.diagnoses.map(toStoredDiagnosis),
      };
    });
  }

  if (documentType === "surgery_report") {
    return storedSchema.transform((extraction) => {
      const diagnosisExtraction = extraction as typeof extraction & {
        preOpDiagnoses: PrefixedDiagnosis[];
        postOpDiagnoses: PrefixedDiagnosis[];
      };

      return {
        ...diagnosisExtraction,
        preOpDiagnoses:
          diagnosisExtraction.preOpDiagnoses.map(toStoredDiagnosis),
        postOpDiagnoses:
          diagnosisExtraction.postOpDiagnoses.map(toStoredDiagnosis),
      };
    });
  }

  return storedSchema;
}

//export type StoredRecordSummary = z.infer<typeof extendedSchema>;

// const semanticLicensePromptExample = `
// You are an expert clinical data extraction engine.

// CONCEPTUAL MAPPING AUTONOMY:
// You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent.
// For example:
// - If a section contains patient-reported pain details but is unlabeled or uses an unrecognizable header, map it to 'historyOfPresentIllness'.
// - Trust your internalized knowledge of EMR structures (Epic, Cerner, legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

// Strict Guardrails:
// 1. Grounding: Extract facts exactly as written...`;

export const extractionRegistry = {
  encounter: {
    schema: encounterSchema,
    systemPrompt: encounterSystemPrompt,
  },
  generic: {
    schema: genericSummarySchema,
    systemPrompt: genericDocumentSystemPrompt,
  },
  imaging_report: {
    schema: imagingSchema,
    systemPrompt: imagingSystemPrompt,
  },
  incident_report: {
    schema: incidentReportSchema,
    systemPrompt: incidentReportSystemPrompt,
  },
  job_description: {
    schema: jobDescriptionSchema,
    systemPrompt: jobDescriptionSystemPrompt,
  },
  surgery_report: {
    schema: surgerySchema,
    systemPrompt: surgerySystemPrompt,
  },
  intervention_report: {
    schema: interventionSchema,
    systemPrompt: interventionSystemPrompt,
  },
  therapy_note: {
    schema: therapySchema,
    systemPrompt: therapySystemPrompt,
  },
  workstatus: {
    schema: workStatusReportSchema,
    systemPrompt: workStatusSystemPrompt,
  },
  legal_summary: {
    schema: genericSummarySchema,
    systemPrompt: genericDocumentSystemPrompt,
  },
} satisfies Record<DocumentType, ExtractionConfig>;

export const getExtractionConfig = (
  documentType: DocumentType,
  caseRegions: CaseRegions,
  context?: DiagnosisExtractionContext,
): ExtractionConfig => {
  const usesRegions =
    documentType === "encounter" ||
    documentType === "surgery_report" ||
    documentType === "intervention_report" ||
    documentType === "therapy_note";

  if (usesRegions && caseRegions.length === 0) {
    throw new Error(`Case regions are required for ${documentType} extraction`);
  }

  if (documentType === "encounter" || documentType === "surgery_report") {
    if (!context || context.canonicalDiagnoses.length === 0) {
      throw new Error(
        `Canonical diagnoses are required for ${documentType} extraction`,
      );
    }

    const canonicalDxValues = context.canonicalDiagnoses.map(
      ({ regionId, label }) => `${regionId}.${label}`,
    );

    return {
      ...extractionRegistry[documentType],
      schema:
        documentType === "encounter"
          ? buildEncounterSchema(canonicalDxValues, caseRegions)
          : buildSurgerySchema(canonicalDxValues, caseRegions),
    };
  }
  if (documentType === "intervention_report") {
    return {
      ...extractionRegistry.intervention_report,
      schema: buildInterventionSchema(caseRegions),
    };
  }
  if (documentType === "therapy_note") {
    return {
      ...extractionRegistry.therapy_note,
      schema: buildTherapySchema(caseRegions),
    };
  }

  return extractionRegistry[documentType];
};
type ExtractionRegistry = typeof extractionRegistry;

type StoredFields = {
  schemaVersion: "v1";
};

export type StoredExtraction<T extends DocumentType> = z.output<
  ExtractionRegistry[T]["schema"]
> &
  StoredFields;

export type AnyStoredExtraction = {
  [T in DocumentType]: StoredExtraction<T>;
}[DocumentType];

export function safeParseStoredExtraction<T extends DocumentType>(
  documentType: T,
  data: unknown,
): z.ZodSafeParseResult<StoredExtraction<T>> {
  // Stored artifacts are parsed without today's mutable case-region context.
  const config: ExtractionConfig = extractionRegistry[documentType];
  const storedSchema = withStoredFields(config.schema);

  return storedSchema.safeParse(data) as z.ZodSafeParseResult<
    StoredExtraction<T>
  >;
}
