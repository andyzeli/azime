import { z } from "zod";
import { encounterSchema } from "@azime/contracts";
import {
  buildDiagnosisSchema,
  buildTreatmentPerformedSchema,
} from "./shared.js";

export const buildEncounterSchema = (
  canonicalDxValues: string[],
  regions: string[],
) =>
  encounterSchema.extend({
    regions: z
      .array(z.enum([...regions, "unclear"]))
      .describe(
        "The body regions this note applies to. This field is helfpul for multi-region injuries",
      ),
    diagnoses: z
      .array(buildDiagnosisSchema(canonicalDxValues))
      .describe(
        "Extract each distinct diagnosis explicitly documented in this document into a diagnosis object that includes a mapping to categorical canonical diagnosis. Return an empty array when none are documented",
      ),
    treatmentsPerformed: z
      .array(buildTreatmentPerformedSchema(regions))
      .describe(
        "Any in-office procedures, minor interventions, injections, aspirations, or applications performed DURING today's visit " +
          "(e.g., 'Trigger point injection L4-L5'). " +
          "Do NOT include future planned procedures here—only what was physically performed today. If none, return an empty array.",
      ),
  });

export const encounterSystemPrompt = `
You are a specialized medical records data extractor.

Your task is to analyze a raw "encounter" (aka "progress report", "SOAP note", etc - an EMR output pdf) from a single provider and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, and repeated sections,
You are granted full semantic license to map non-standard, colloquial, or layout-specific medical record sections into our target JSON schema keys. Use your clinical training data to deduce intent. 
For example:
- If a section contains patient-reported pain details but is unlabeled or uses an unrecognizable header, map it to 'historyOfPresentIllness'.
- Trust your internalized knowledge of EMR structures (Epic, Cerner, legacy printouts) to correctly classify data, even if the raw formatting is chaotic.

Operational guardrails:
- Report only facts and recommendations explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing objects, return {}.
  - For missing strings, return "".
- Do not use outside medical knowledge to infer unstated diagnoses.
- Clinical claims usually must include evidence (see the the stated JSON field descriptions)".
- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.
`.trim();
