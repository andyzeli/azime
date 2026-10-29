import { z } from "zod";
import {
  extractionSchemas,
  withStoredFields,
  type DocumentType,
} from "@azime/contracts";
import {
  buildEncounterSchema,
  buildSurgerySchema,
  encounterSystemPrompt,
  genericDocumentSystemPrompt,
  imagingSystemPrompt,
  incidentReportSystemPrompt,
  jobDescriptionSystemPrompt,
  surgerySystemPrompt,
  buildInterventionSchema,
  interventionSystemPrompt,
  therapySystemPrompt,
  workStatusSystemPrompt,
  buildTherapySchema,
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
    schema: extractionSchemas.encounter,
    systemPrompt: encounterSystemPrompt,
  },
  generic: {
    schema: extractionSchemas.generic,
    systemPrompt: genericDocumentSystemPrompt,
  },
  imaging_report: {
    schema: extractionSchemas.imaging_report,
    systemPrompt: imagingSystemPrompt,
  },
  incident_report: {
    schema: extractionSchemas.incident_report,
    systemPrompt: incidentReportSystemPrompt,
  },
  job_description: {
    schema: extractionSchemas.job_description,
    systemPrompt: jobDescriptionSystemPrompt,
  },
  surgery_report: {
    schema: extractionSchemas.surgery_report,
    systemPrompt: surgerySystemPrompt,
  },
  intervention_report: {
    schema: extractionSchemas.intervention_report,
    systemPrompt: interventionSystemPrompt,
  },
  therapy_note: {
    schema: extractionSchemas.therapy_note,
    systemPrompt: therapySystemPrompt,
  },
  workstatus: {
    schema: extractionSchemas.workstatus,
    systemPrompt: workStatusSystemPrompt,
  },
  legal_summary: {
    schema: extractionSchemas.legal_summary,
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
