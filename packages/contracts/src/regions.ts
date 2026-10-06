import { z } from "zod";

export const supportedRegions = [
  { value: "lumbar_spine", label: "Lumbar Spine" },
  { value: "thoracic_spine", label: "Thoracic Spine" },
  { value: "cervical_spine", label: "Cervical Spine" },
] as const;

export const regionSchema = z.enum(supportedRegions.map(({ value }) => value));

export type Region = z.infer<typeof regionSchema>;

// GET /regions/:region/canonical-diagnoses: everything a physician may add to a region's scope.
export const canonicalDiagnosisSchema = z.object({
  canonicalDx: z.string().min(1),
  label: z.string().min(1),
  icdPrefixes: z.array(z.string()),
});
export const canonicalDiagnosisListSchema = z.array(canonicalDiagnosisSchema);
export type CanonicalDiagnosis = z.infer<typeof canonicalDiagnosisSchema>;
