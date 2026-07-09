import { Type } from "@google/genai";
import { z } from "zod";
import {
  aggregateSummaryInputSchema,
  geminiAggregateSummaryPayloadSchema,
  storedAggregateSummarySchema,
} from "./aggregateSummarySchema.js";
import {
  geminiRecordSummaryPayloadSchema,
  storedRecordSummarySchema,
} from "./recordSummarySchema.js";

const simpleStringField = z.string();

export { geminiRecordSummaryPayloadSchema, storedRecordSummarySchema };
export {
  aggregateSummaryInputSchema,
  geminiAggregateSummaryPayloadSchema,
  storedAggregateSummarySchema,
};

// for gemini instruction
export const geminiRecordSummaryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    datesOfService: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    background: {
      type: Type.OBJECT,
      properties: {
        incidentDate: { type: Type.STRING },
        incidentDescription: { type: Type.STRING },
        pastMedicalHistory: { type: Type.STRING },
        allergies: { type: Type.STRING },
      },
      required: [
        "incidentDate",
        "incidentDescription",
        "pastMedicalHistory",
        "allergies",
      ],
    },
    findings: {
      type: Type.OBJECT,
      properties: {
        subjective: { type: Type.STRING },
        objective: { type: Type.STRING },
        plan: { type: Type.STRING },
        outcome: { type: Type.STRING },
      },
      required: ["subjective", "objective", "plan", "outcome"],
    },
    diagnoses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          icd: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["name", "icd", "description"],
      },
    },
    treatmentsTried: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          treatment: { type: Type.STRING },
          status: { type: Type.STRING },
          outcome: { type: Type.STRING },
        },
        required: ["treatment", "status", "outcome"],
      },
    },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dose: { type: Type.STRING },
          frequency: { type: Type.STRING },
        },
        required: ["name", "dose", "frequency"],
      },
    },
    imagingFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          modality: { type: Type.STRING },
          date: { type: Type.STRING },
          finding: { type: Type.STRING },
        },
        required: ["modality", "date", "finding"],
      },
    },
    functionalLimitations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          limitation: { type: Type.STRING },
          status: { type: Type.STRING },
        },
        required: ["limitation", "status"],
      },
    },
    workStatus: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          asOfdate: { type: Type.STRING },
          status: { type: Type.STRING },
        },
        required: ["asOfdate", "status"],
      },
    },
  },
  required: [
    "datesOfService",
    "background",
    "findings",
    "diagnoses",
    "treatmentsTried",
    "medications",
    "imagingFindings",
    "functionalLimitations",
    "workStatus",
  ],
};

export const geminiAggregateSummaryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    mainSummary: { type: Type.STRING }, //short paragraph summarizing the most important details of the case and current status
    patientInfo: { type: Type.STRING },
    backgroundSummary: {
      type: Type.OBJECT,
      properties: {
        incidentDate: { type: Type.STRING },
        incidentDescriptionSummary: { type: Type.STRING },
        pastMedicalHistorySummary: { type: Type.STRING },
        allergiesSummary: { type: Type.STRING },
        backgroundConflicts: { type: Type.STRING },
      },
      required: [
        "incidentDate",
        "incidentDescriptionSummary",
        "pastMedicalHistorySummary",
        "allergiesSummary",
      ],
    },
  },
  required: ["mainSummary", "patientInfo", "backgroundSummary"],
};
