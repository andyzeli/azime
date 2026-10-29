import { z } from "zod";
import { strfield, evidence } from "./shared.js";

export const genericSummarySchema = z.object({
  evidence: z
    .array(evidence)
    .describe(
      "A list of evidence items supporting the writing of a summary. Each item includes a page number and a direct quote from the record.",
    ),
  summary: strfield.describe(
    "A concise, plain-language summary of the record's key points, including the patient's condition, treatment, and prognosis. Avoid medical jargon and focus on clarity for non-medical readers.",
  ),
});
