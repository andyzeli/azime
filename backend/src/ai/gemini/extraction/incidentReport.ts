import { z } from "zod";

export const incidentReportSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw standalone incident report and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, or simple prose. Our output schema is designed to capture the essential details of the incident, including date, time, location, parties involved, and description of the incident.
Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;

export const incidentReportSchema = z.object({
  dateOfIncident: z
    .string()
    .describe("Date the alleged injury or accident occurred, as YYYY-MM-DD."),

  mechanismOfInjury: z
    .string()
    .describe(
      "The narrative explanation of how the accident happened as reported during the interview or investigation " +
        "(e.g., 'Worker states a box fell on left shoulder').",
    ),

  initialReportedInjuries: z
    .array(z.string())
    .describe(
      "Body parts or symptoms ALLEGED or reported by the worker at the time of the incident (e.g., 'Claimed left shoulder pain and lower back soreness'). " +
        "Do NOT frame these as confirmed medical diagnoses—record strictly what was claimed or reported initially.",
    ),
});
