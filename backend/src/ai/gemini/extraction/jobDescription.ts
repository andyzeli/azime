import { z } from "zod";

export const jobDescriptionSchema = z.object({
  jobTitle: z
    .string()
    .describe("The official job title (e.g., 'Warehouse Material Handler')."),

  requiredPhysicalDemands: z
    .array(z.string())
    .describe(
      "Key physical requirements of the pre-injury job (e.g., 'Must lift up to 50 lbs regularly', 'Overhead reaching required 4 hrs/day', 'Constant standing on concrete'). Description should make it easy to classify into exertion categories",
    ),
  exertionClassification: z
    .enum([
      "Sedentary",
      "Light",
      "Medium",
      "Heavy",
      "Very Heavy",
      "Unspecified",
    ])
    .describe(
      "U.S. Dept of Labor physical exertion category if stated or inferable.",
    ),
});

export const jobDescriptionSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw standalone job description and extract data into a strictly structured JSON format.

CONCEPTUAL MAPPING AUTONOMY:
The source documents may vary in format and may include headers, tables, or simple prose. Our output schema is designed to capture the essential job functions, physical demands, and environmental conditions of the job, to later compare with the patient's functional limitations and restrictions.
Operational guardrails:
- Report only facts explicitly stated in the source documents.
- If data is missing for a field, do not write "Not Found", "N/A", or "None".
  - For missing arrays, return [].
  - For missing strings, return "".

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;
