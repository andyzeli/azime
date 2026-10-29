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

// A patientcase row as returned by GET /cases.
export type PatientCaseDto = {
  id: number;
  patientName: string | null;
  patientLastName: string | null;
  providerAssigned: string | null;
  caseContact: number | null;
  caseType: string | null;
  caseStatus: string | null;
  amaMode: AmaMode;
  referralQuestions: string[];
} & CaseInjuryDetails;

// Whether the referral asks for an AMA rating. "guidance" keeps the AMA exam rows
// (tasks, roots, answers for the report) without rating tables or a rating.
// Set by staff from the referral when the case is created.
export const amaModeSchema = z.enum(["rating", "guidance", "off"]);
export type AmaMode = z.infer<typeof amaModeSchema>;

// PUT /cases/:id/ama-mode
export const updateAmaModeRequestSchema = z
  .object({ amaMode: amaModeSchema })
  .strict();

// PUT /cases/:id/referral-questions; replaces the whole list.
export const updateReferralQuestionsRequestSchema = z
  .object({ referralQuestions: z.array(z.string().trim().min(1)) })
  .strict();
