import { z } from "zod";
import { regionSchema } from "./regions.js";

export const caseInjuryDetailsSchema = z
  .object({
    injuryType: z.enum(["specific", "cumulative", "undetermined"]),
    dateOfInjury: z.iso.date().nullable(),
    regions: z.array(regionSchema),
  })
  .strict();

export type CaseInjuryDetails = z.infer<typeof caseInjuryDetailsSchema>;
