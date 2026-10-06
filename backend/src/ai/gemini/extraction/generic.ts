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

export const genericDocumentSystemPrompt = `
You are a specialized medical records summarizer and data extractor.

Your task is to analyze a raw generic document (doesnt fit our other document types) and summarize it. you will write some supporting evidence items according to the provided JSON structure to assist with your summary. 

- Use Markdown (headings, lists, etc) inside string fields when it improves readability for the reviewing physician.

`;
