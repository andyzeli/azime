import { z } from "zod";
import { treatmentPerformedSchema } from "./shared.js";

export const interventionSchema = treatmentPerformedSchema.extend({
  indication: z
    .string()
    .describe(
      "The documented clinical indication or condition for which the procedure was performed.",
    ),
  followUpPlan: z
    .string()
    .describe(
      "The documented follow-up plan after the procedure, including timing or next steps when provided.",
    ),
});
