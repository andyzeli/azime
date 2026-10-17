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

// Whether the referral asks for an AMA rating. "guidance" keeps the AMA exam rows
// (tasks, roots, answers for the report) without rating tables or a rating.
// Stored as null until the physician overrides the case-type default.
export const amaModeSchema = z.enum(["rating", "guidance", "off"]);
export type AmaMode = z.infer<typeof amaModeSchema>;

export const effectiveAmaMode = (
  caseType: string | null | undefined,
  amaMode: AmaMode | null | undefined,
): AmaMode => amaMode ?? (caseType === "work_injury" ? "rating" : "off");

// PUT /cases/:id/ama-mode; null restores the case-type default.
export const updateAmaModeRequestSchema = z
  .object({ amaMode: amaModeSchema.nullable() })
  .strict();
