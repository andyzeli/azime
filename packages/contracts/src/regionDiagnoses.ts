import { z } from "zod";
import { regionSchema } from "./regions.js";

// The region's diagnosis list: the one place scope and the physician's conclusions live.
// Every listed diagnosis gets a verdict, and every one is in the treatment analysis (3A),
// since the report must address treatment given for diagnoses found not supported.
// Exam prep and AMA tasks cover only the current (working | supported) ones.
export const diagnosisStateSchema = z.object({
  canonicalDx: z.string().min(1),
  // records = found by the case summary; added = by the physician, at any time.
  source: z.enum(["records", "added"]),
  // working = undecided; supported / not_supported = the physician's conclusion.
  status: z.enum(["working", "supported", "not_supported"]),
  reason: z.string().nullable(),
});
export type DiagnosisState = z.infer<typeof diagnosisStateSchema>;

// Current = still examined for: exam prep and AMA exam tasks.
export const isCurrentDiagnosis = (d: Pick<DiagnosisState, "status">) =>
  d.status === "working" || d.status === "supported";

export const currentDiagnoses = (diagnoses: DiagnosisState[]) =>
  diagnoses.filter(isCurrentDiagnosis).map((d) => d.canonicalDx);

// GET /cases/:caseId/diagnoses/:region. revision 0 = never saved; the list is then
// derived from the region's records diagnoses plus any the 3A scope added.
export const regionDiagnosesResponseSchema = z.object({
  caseId: z.number().int().positive(),
  region: regionSchema,
  diagnoses: z.array(diagnosisStateSchema),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string().nullable(),
});
export type RegionDiagnosesResponse = z.infer<
  typeof regionDiagnosesResponseSchema
>;

export const saveRegionDiagnosesRequestSchema = z.object({
  diagnoses: z.array(diagnosisStateSchema),
  expectedRevision: z.number().int().nonnegative(),
});
export type SaveRegionDiagnosesRequest = z.infer<
  typeof saveRegionDiagnosesRequestSchema
>;
