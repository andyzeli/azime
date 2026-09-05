import { z } from "zod";
import { trajectorySchema } from "./shared.js";

export const preExamAnalysisProviderSchema = z.enum(["gemini", "openai"]);

export const treatmentAnalysisItemSchema = z.object({
  category: z
    .enum([
      "Conservative",
      "Rehabilitation",
      "Diagnostic Workup",
      "Interventional",
      "Surgical",
      "Other",
    ])
    .describe(
      "The broad care-pathway category that best describes this treatment or diagnostic intervention.",
    ),
  treatment: z
    .string()
    .describe(
      "A concise, clinically recognizable name for the specific treatment, procedure, therapy, or diagnostic intervention",
    ),
  source: z
    .enum(["Taxonomy", "AI", "Record Only"])
    .describe(
      "The source of this treatment information. 'Taxonomy' means the treatment was supplied by the treatment taxonomy. 'AI' means the treatment was suggested by you, 'Record Only' means the treatment was documented in the record but not otherwise represented.",
    ),
  recordStatus: z.enum([
    "To Be Started",
    "Ongoing",
    "Completed",
    "Not Documented",
    "Unclear",
  ]),
  aiExhaustionAssessment: z
    .string()
    .describe(
      "Your clinical inference about whether this treatment avenue appears sufficiently explored such that additional use of the same treatment strategy is unlikely to provide meaningful further improvement. Assess exhaustion independently from whether treatment was merely completed. Use Exhausted, Not Exhausted, or Unclear.",
    ),
  aiExhaustionRationale: z
    .string()
    .describe(
      "A concise explanation for the exhaustion assessment using the treatment course, amount or duration of care when available, treatment response, current trajectory, and relevant clinical context. Explain why additional treatment of this type does or does not appear to retain meaningful therapeutic potential.",
    ),
});

export const storedTreatmentAnalysisItemSchema =
  treatmentAnalysisItemSchema.extend({
    id: z.string().uuid(),
  });

export const preExamAnalysisSchema = z.object({
  diagnosis: z.string(),

  treatmentAnalysis: z
    .array(treatmentAnalysisItemSchema)
    .describe(
      "The unified treatment decision space for this diagnosis. Include: (1) treatments supplied by the treatment taxonomy, (2) additional treatments you believe are reasonable to surface for consideration (use your medical knowledge here), and (3) treatments documented in the record that are not in taxonomy or your suggestion. Semantically deduplicate equivalent treatments. For each treatment, compare the candidate treatment against the patient's actual treatment history and assess whether that treatment avenue appears exhausted.",
    ),

  trajectoryAnalysis: z
    .object({
      subjectiveTrajectory: trajectorySchema.describe(
        "The longitudinal trajectory of patient-reported symptoms relevant to the diagnosis, such as pain, numbness, tingling, perceived weakness, or other reported symptoms.",
      ),
      functionalTrajectory: trajectorySchema.describe(
        "The longitudinal trajectory of the patient's ability to perform activities and function relevant to the diagnosis, including ADLs, work capacity, activity tolerance, mobility, validated functional measures, and similar evidence.",
      ),
      objectiveTrajectory: trajectorySchema.describe(
        "The longitudinal trajectory of measurable or clinician-observed findings relevant to the diagnosis, such as range of motion, strength, reflexes, sensation, atrophy, provocative testing, imaging, electrodiagnostic findings, or other objective examination data.",
      ),
    })
    .describe(
      "A structured interpretation of how the patient's condition has changed over time in three evidence domains: subjective symptoms, functional status, and objective findings. Do not repeat the underlying longitudinal history already present in the provided data; interpret its direction and the quality of evidence supporting that interpretation.",
    ),
  // plateauIndicators: z.array(
  //   z.object({
  //     description: z.string(),
  //     direction: z.enum(["Supports Plateau", "Against Plateau", "Neutral"]),
  //     strength: z.enum(["Strong", "Moderate", "Weak"]),
  //     rationale: z.string(),
  //     sourceDocIds: z.array(z.string()),
  //   }),
  // ),
  evidenceGaps: z
    .array(
      z.object({
        gap: z
          .string()
          .describe(
            "A concise statement of the clinically relevant information that is missing or insufficiently documented",
          ),
        significance: z
          .string()
          .describe(
            "Why this missing information matters in this specific case and what aspect of treatment exhaustion, trajectory, diagnosis, or recovery potential it leaves uncertain.",
          ),
      }),
    )
    .describe(
      "Missing, absent, or materially sparse information that limits assessment of treatment exhaustion, clinical trajectory, or any future MMI analysis. Include a gap only when the missing information could reasonably matter to the analysis; do not inventory every undocumented test or measurement.",
    ),
  inconsistencies: z.array(
    z.object({ type: z.enum(["Record", "Clinical"]), description: z.string() }),
  ),
  activeCareBlockers: z
    .array(
      z.object({
        blocker: z
          .string()
          .describe(
            "A concise statement of the clinically relevant factor that is currently preventing or limiting the patient's ability to receive active care for this diagnosis.",
          ),
        blockedCare: z
          .string()
          .describe(
            "The treatment, procedure, referral, diagnostic step, or other care being delayed or prevented.",
          ),
        sourceDocIds: z
          .array(z.string())
          .describe(
            "The identifiers of the source documents that provide evidence for this active care blocker.",
          ),
      }),
    )
    .describe(
      "Current documented barriers preventing contemplated care from progressing. Include only active barriers tied to care that remains relevant to the treatment course.",
    ),
  // unresolvedTreatmentQuestions: z.array(
  //   z.object({
  //     treatment: z.string(),
  //     question: z.string(),
  //     whyItMatters: z.string(),
  //   }),
  // ),
});

export const storedPreExamAnalysisSchema = preExamAnalysisSchema.extend({
  treatmentAnalysis: z.array(storedTreatmentAnalysisItemSchema),
  schemaVersion: z.literal("draft-v2"),
  sourceMetadata: z.object({
    provider: preExamAnalysisProviderSchema,
    model: z.string().min(1),
    caseSummaryId: z.number().int(),
  }),
});

export type PreExamAnalysisProvider = z.infer<
  typeof preExamAnalysisProviderSchema
>;
export type PreExamAnalysis = z.infer<typeof preExamAnalysisSchema>;
export type StoredPreExamAnalysis = z.infer<typeof storedPreExamAnalysisSchema>;
