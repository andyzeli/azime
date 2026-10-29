import { z } from "zod";

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
