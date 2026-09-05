import { z } from "zod";

export const trajectorySchema = z.object({
  direction: z.enum([
    "Improving",
    "Stable / Plateaued",
    "Worsening",
    "Fluctuating",
    "Insufficient Data",
  ]),

  evidenceQuality: z
    .enum(["Strong", "Moderate", "Sparse", "Conflicting", "Absent"])
    .describe(
      "How well the available records support the trajectory. Consider longitudinal coverage, consistency across encounters, documentation frequency, and conflicting reports. Use Strong, Moderate, Sparse, Conflicting, or Absent.",
    ),

  rationale: z
    .string()
    .describe(
      "A concise explanation for the trajectory assessment using the longitudinal history, emphasizing the clinically meaningful longitudinal pattern rather than repeating individual symptom reports.",
    ),
});
