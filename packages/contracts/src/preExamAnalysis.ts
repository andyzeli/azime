import { z } from "zod";
import { regionSchema } from "./regions.js";

export const preExamAnalysisProviderSchema = z.enum(["gemini", "openai"]);

const assessmentItemSchema = z.object({
  canonicalDx: z.string().describe("A single diagnoses from the in-scope list"),
  aiApplicabilityRationale: z
    .string()
    .describe(
      "Reasoning as to weather the candidate treatment addresses this diagnosis, is contra-indicated or is not relavent"
    ),
  aiApplicability: z.enum([
    "applicable",
    "not_applicable",
    "contraIndicated",
    "unclear",
  ]),
  aiAdequacyRationale: z
    .string()
    .describe(
      "Brief description of your clinical inference about whether this treatment avenue appears sufficiently explored such that additional use of the same treatment strategy is unlikely to provide meaningful further improvement. Assess adequacy independently from whether treatment was merely completed. Refer to treatment response, current trajectory, and relevant clinical context."
    ),
  aiAdequacy: z
    .enum([
      "adequately_trialed",
      "inadequately_trialed",
      "not_tried",
      "patient_declined",
      "unclear",
    ])
    .describe("Your conclusion on adequacy. "),
});
export const treatmentAnalysisItemSchema = z.object({
  suggestionReasoning: z
    .string()
    .describe(
      "If you suggest a treatment that the taxonomy missed and is not in the records, breifly reason about it here - you will categorize it next. If you don't have a suggestion, return a blank string"
    ),
  suggestionReason: z
    .enum([
      "patient_factor",
      "record_finding",
      "variant_of_tried",
      "multimodal",
    ])
    .nullable()
    .describe(
      "Your reason for suggesting a treatment not included in the taxonomy or records, or null if you did not suggest one"
    ),
  treatmentId: z
    .string()
    .nullable()
    .describe(
      "The id of the treatment from the supplied treatment taxonomy. this facilitates mapping records to your analysis. it should be null if the row is your suggestion"
    ),
  treatment: z
    .string()
    .describe(
      "A concise, clinically recognizable name for the specific treatment, procedure, therapy, or diagnostic intervention"
    ),
  source: z
    .enum(["taxonomy", "ai", "record_only"])
    .describe(
      "The source of this treatment information. 'Taxonomy' means the treatment was supplied by the treatment taxonomy. 'AI' means the treatment was suggested by you, 'Record Only' means the treatment was documented in the record but not otherwise represented."
    ),

  recordDetail: z
    .string()
    .nullable()
    .describe(
      "One line description of quanity and any documented response or reason for ending, e.g. '6 visits over 4 weeks, discharged at plateau'. Null if not in records"
    ),
  recordStatus: z
    .enum([
      "To Be Started",
      "Ongoing",
      "Completed",
      "Not Documented",
      "Unclear",
    ])
    .describe(
      "most applicable categorization of this candidate treatment's presence and status in the records supplied "
    ),
  episodeIds: z
    .array(z.string())
    .describe(
      "List the ids of treatment episodes in records that map to this taxonomy entry"
    ),
  assessments: z
    .array(assessmentItemSchema)
    .describe(
      "For each diagnosis, an assessment of this treatment's applicability and adequacy"
    ),
  //later - if things are commonly marked 'unclear' for region - add excludedEpisodes: {episodeId, reason}[] here
});

export const storedTreatmentAnalysisItemSchema =
  treatmentAnalysisItemSchema.extend({
    id: z.string(),
  });

export const evidenceGapItemSchema = z.object({
  gap: z
    .string()
    .describe(
      "A concise statement of the clinically relevant information that is missing or insufficiently documented"
    ),
  significance: z
    .string()
    .describe(
      "Why this missing information matters in this specific case and what aspect of treatment exhaustion, trajectory, diagnosis, or recovery potential it leaves uncertain."
    ),
});

export const storedEvidenceGapItemSchema = evidenceGapItemSchema.extend({
  id: z.string(),
});

export const inconsistencyItemSchema = z.object({
  description: z.string(),
  type: z.enum(["Record", "Clinical"]),
});

export const storedInconsistencyItemSchema = inconsistencyItemSchema.extend({
  id: z.string(),
});

export const preExamAnalysisSchema = z.object({
  treatmentAnalysis: z
    .array(treatmentAnalysisItemSchema)
    .describe(
      "The unified treatment decision space for this diagnosis, where you create an entry for every: (1) treatment supplied by the treatment taxonomy, (2) additional treatments not in the taxonomy you believe are reasonable to surface for consideration based on diagnoses (use your medical knowledge here, but the taxonomy should be close to complete do don't force it), and (3) treatments documented in the record that are not in taxonomy or your suggestion. Semantically deduplicate equivalent treatments. Then for each treatment entry, compare the candidate treatment against the patient's actual treatment history and assess whether that treatment avenue appears exhausted."
    ),

  evidenceGaps: z
    .array(evidenceGapItemSchema)
    .describe(
      "Missing, absent, or materially sparse information that limits assessment of treatment exhaustion, clinical trajectory, or any future MMI analysis. Include a gap only when the missing information could reasonably matter to the analysis; do not inventory every undocumented test or measurement."
    ),
  inconsistencies: z.array(inconsistencyItemSchema),
});

export const storedPreExamAnalysisSchema = preExamAnalysisSchema.extend({
  treatmentAnalysis: z.array(storedTreatmentAnalysisItemSchema),
  evidenceGaps: z.array(storedEvidenceGapItemSchema),
  inconsistencies: z.array(storedInconsistencyItemSchema),

  schemaVersion: z.literal("draft-v2"),
  sourceMetadata: z.object({
    provider: preExamAnalysisProviderSchema,
    model: z.string().min(1),
    // caseSummaryId: z.number().int(),
  }),
});

export const preExamSnapshotRequestSchema = z.object({
  selectedDiagnoses: z.array(z.string()).optional(),
});

export type PreExamSnapshotRequest = z.infer<
  typeof preExamSnapshotRequestSchema
>;

export type PreExamAnalysisProvider = z.infer<
  typeof preExamAnalysisProviderSchema
>;
export type PreExamAnalysis = z.infer<typeof preExamAnalysisSchema>;
export type StoredPreExamAnalysis = z.infer<typeof storedPreExamAnalysisSchema>;

// GET /cases/:caseId/pre-exam-analysis/:region. The input snapshot itself stays
// server-side; the client only needs to know whether one has been taken.
export const preExamAnalysisResponseSchema = z.object({
  id: z.number().int(),
  caseId: z.number().int(),
  region: regionSchema,
  hasInputSnapshot: z.boolean(),
  analysis: storedPreExamAnalysisSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PreExamAnalysisResponse = z.infer<
  typeof preExamAnalysisResponseSchema
>;

// Pass 3A output
//
// Inputs: chronological Pass 1 extractions + metadata, Pass 2 output, query-built treatment episode skeletons, deduped diagnosis mentions, taxonomy for the selected diagnosis.
//
// diagnosis — the working diagnosis 3A reasoned under, plus how it reconciled similar/variant diagnosis mentions in the record (the one place semantic grouping happens).
// treatmentAnalysis[] — union of taxonomy, AI-suggested, and record-only treatments, deduped. Per row:
// category, treatment, source (Taxonomy / AI Suggested / Record Only)
// recordStatus — widened to cover what moved here: Planned / Ongoing / Completed / Recommended / AwaitingAuthorization / Declined / Unclear / Not Documented
// recordDetail — quantity, documented response, end reason, one line (absorbed from Pass 2's old episode judgments)
// episodeIds[] — join back to the query skeletons
// aiAdequacyAssessment — Adequately Trialed / Not Adequately Trialed / Unclear (renamed from "exhaustion"; runway judgment is post-visit)
// aiAdequacyRationale
// physicianAdequacyAssessment, physicianAdequacyRationale (null until steered)
// inconsistencies[] — clinically meaningful conflicts, found directly from the documents (Pass 2 no longer supplies factual conflicts).
// evidenceGaps[] — { gap, whyItMatters }, only where it limits interpretation.
//
// Removed from 3A: trajectoryAnalysis (→ 3B), activeCareBlockers (→ recordStatus values on treatment rows), any direction or posture language.
