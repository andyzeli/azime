import { z } from "zod";
import { caseInjuryDetailsSchema } from "./cases.js";
import {
  caseClinicalSummarySchema,
  caseSummaryTimelineEntrySchema,
} from "./caseSummary.js";
import {
  storedEvidenceGapItemSchema,
  storedInconsistencyItemSchema,
  storedTreatmentAnalysisItemSchema,
  treatmentAnalysisItemSchema,
} from "./preExamAnalysis.js";
import { regionSchema } from "./regions.js";
import { physicianSteeringSchema } from "./physicianSteering.js";

const originalAssessment =
  treatmentAnalysisItemSchema.shape.assessments.element;
const reviewedAssessment = <T extends z.ZodType>(value: T) =>
  z.object({
    value,
    rationale: z.string(),
    source: z.enum(["ai", "physician"]),
    reviewStatus: z.enum(["unreviewed", "agree", "override", "provided"]),
    note: z.string().nullable(),
  });

export const reviewedPreExamAnalysisSchema = z.object({
  treatmentIssues: z.array(
    z.object({
      id: storedTreatmentAnalysisItemSchema.shape.id,
      treatmentId: z.string().nullable(),
      treatment: z.string(),
      source: z.enum(["taxonomy", "ai", "record_only", "physician"]),
      category: z
        .enum([
          "conservative",
          "medication",
          "injection",
          "surgical",
          "multimodal",
        ])
        .nullable(),
      recordStatus: treatmentAnalysisItemSchema.shape.recordStatus.nullable(),
      recordDetail: z.string().nullable(),
      episodeIds: z.array(z.string()),
      assessments: z.array(
        z.object({
          canonicalDx: z.string(),
          applicability: reviewedAssessment(
            originalAssessment.shape.aiApplicability
          ),
        })
      ),
      // One effective judgment per treatment, across its applicable diagnoses.
      exhaustion: reviewedAssessment(
        treatmentAnalysisItemSchema.shape.aiExhaustion
      ),
      dispositionReviewed: z.boolean(),
      physicianNote: z.string().nullable(),
    })
  ),
  treatmentContext: z.array(
    z.object({
      id: storedTreatmentAnalysisItemSchema.shape.id,
      treatment: z.string(),
      canonicalDx: z.string(),
      recordDetail: z.string().nullable(),
    })
  ),
  // Explicit notes on otherwise omitted assessments retain their own context.
  treatmentNotes: z.array(
    z.object({
      id: storedTreatmentAnalysisItemSchema.shape.id,
      treatment: z.string(),
      canonicalDx: z.string().nullable(),
      field: z.enum(["treatment", "applicability", "exhaustion"]),
      note: z.string(),
    })
  ),
  inconsistencies: z.array(
    storedInconsistencyItemSchema.extend({
      reviewed: z.boolean(),
      physicianNote: z.string().nullable(),
    })
  ),
  evidenceGaps: z.array(
    storedEvidenceGapItemSchema.extend({
      reviewed: z.boolean(),
      physicianNote: z.string().nullable(),
    })
  ),

  physicianNotes: z.string().nullable(),
});
export type ReviewedPreExamAnalysis = z.infer<
  typeof reviewedPreExamAnalysisSchema
>;

export const fullReviewedPreExamAnalysisSchema = reviewedPreExamAnalysisSchema
  .pick({ inconsistencies: true, evidenceGaps: true, physicianNotes: true })
  .extend({ treatments: reviewedPreExamAnalysisSchema.shape.treatmentIssues });

export const refinedAnalysisInputSchema = z.object({
  caseContext: caseInjuryDetailsSchema
    .pick({ injuryType: true, dateOfInjury: true })
    .extend({
      caseType: z.string().nullable(),
    }),
  scope: z.object({ region: regionSchema, diagnoses: z.array(z.string()) }),
  // The enriched Pass 2 timeline includes dates/providers absent from raw AI output.
  caseSummary: caseClinicalSummarySchema.extend({
    statusTimeline: z.array(caseSummaryTimelineEntrySchema),
  }),
  reviewedAnalysis: reviewedPreExamAnalysisSchema,
});
export type RefinedAnalysisInput = z.infer<typeof refinedAnalysisInputSchema>;

export const refinedAnalysisInputSnapshotSchema = z.object({
  input: refinedAnalysisInputSchema,
  // Retained for post-exam analysis, never sent to the 3B model.
  fullReviewedAnalysis: fullReviewedPreExamAnalysisSchema,
  // The saved steering this run used, so "out of date" can compare contents, not revisions.
  // Missing on older runs.
  physicianSteering: physicianSteeringSchema.optional(),
  // Application provenance is persisted, but never included in the model prompt.
  basedOn: z.object({
    caseSummaryId: z.number().int().positive(),
    preExamAnalysisId: z.number().int().positive(),
    preExamAnalysisUpdatedAt: z.iso.datetime(),
    physicianSteeringId: z.number().int().positive(),
    physicianSteeringRevision: z.number().int().positive(),
    // Revision of the region's diagnosis list (0 = never saved). Missing on older runs.
    diagnosesRevision: z.number().int().nonnegative().optional(),
  }),
});
export type RefinedAnalysisInputSnapshot = z.infer<
  typeof refinedAnalysisInputSnapshotSchema
>;


export const trajectorySchema = z.object({
  direction: z.enum([
    "Improving",
    "Stable",
    "Worsening",
    "Fluctuating",
    "Insufficient Data",
  ]).describe(`
    Direction of change over the documented course, emphasizing the latest supported
    trend. Improving and Worsening require change over time; Stable requires comparable
    observations showing little meaningful change. Fluctuating means changes in both
    directions, not disagreement between sources. Use Insufficient Data when a direction
    cannot be established. A single observation or missing follow-up cannot establish stability.
  `),
  evidenceQuality: z.enum([
    "Strong",
    "Moderate",
    "Sparse",
    "Conflicting",
    "Absent",
  ]).describe(`
    Strength of evidence for this trajectory, not the amount of documentation.
    Strong: clear, consistent, comparable longitudinal observations.
    Moderate: useful support with material limitations. Sparse: few observations
    or limited comparability. Conflicting: discordant evidence prevents a coherent
    interpretation. Absent: no relevant evidence supplied. Repeated wording alone
    does not provide independent support.
  `),
  interpretation: z.string().describe(`
    Concisely explain the direction using specific documented findings, dates, or
    activities. Include important turning points and limitations or contrary evidence.
    Distinguish observations from inference; do not extrapolate the last recorded
    status to today.

    Example: "Sitting tolerance increased from 20 to 45 minutes during therapy.
    Later notes describe sitting difficulty without quantifying it, so persistence
    of the earlier gain is uncertain."
  `),
});

const visitPrioritySchema = z.object({
  focus: z.string().describe(`
    A concise, case-specific issue the physician should clarify during
    preparation for or conduct of today's examination. State the unresolved
    question directly, using natural clinical language. It may involve the
    patient's history, current function, examination findings, treatment
    response, or reconciliation of conflicting information. Combine closely
    related uncertainties into one priority. Avoid generic instructions such
    as "assess pain" or "perform a thorough examination."

    Example: "Clarify whether the improvement reported during physical
    therapy persisted after treatment ended."
  `),

  whyItMatters: z.string().describe(`
    Explain why this particular uncertainty matters, grounded in the supplied
    case summary and physician-reviewed analysis. Identify what remains
    unclear and how different plausible answers could change interpretation
    of the patient's trajectory, treatment response, or remaining uncertainty
    before the post-exam assessment. Make the connection explicit; do not
    merely say that clarification would "inform management" or "help determine
    MMI." Do not assume the answer or treat missing documentation as evidence
    that something did not occur.

    Example: "Therapy notes describe improved activity tolerance, while the
    later physician note reports persistent limitations without explaining
    whether the earlier gains were retained. Persistent benefit versus
    temporary relief would lead to different interpretations of the
    functional trajectory."
  `),

  suggestedApproach: z.string().nullable().describe(`
    An optional, practical suggestion for how the physician might explore
    this issue through history, an appropriate focused examination, or review
    of specific existing information. Describe what to clarify or document,
    rather than prescribing a rigid examination protocol. Use ordinary clinical
    language and keep the suggestion proportionate to the uncertainty.
    Do not invent required tests, numerical thresholds, questionnaires, or
    measurements merely to make the issue appear objectively resolvable.
    Recognize that today's encounter may only partly clarify the issue;
    mention additional records when relevant. Return null when no useful,
    sufficiently grounded approach can be suggested.

    Example: "Ask which activities became easier during therapy and whether
    those gains lasted after discharge. Clarify any subsequent change in
    symptoms or activity. If the treatment course remains unclear, the
    discharge note may help establish why therapy ended."
  `),
});

export const refinedAnalysisSchema = z.object({
  trajectoryAnalysis: z.object({
    subjectiveTrajectory: trajectorySchema.describe(
      "Change in patient-reported symptoms. Persistent symptoms do not by themselves establish worsening function or objective findings."
    ),
    functionalTrajectory: trajectorySchema.describe(
      "Change in activities, work capacity, and limitations. Preserve whether function was reported, observed, or restricted by a clinician; a work restriction alone does not establish actual capacity."
    ),
    objectiveTrajectory: trajectorySchema.describe(
      "Change in documented examination findings or measurements, accounting for comparability between observations."
    ),
  }).describe(`
    An assessment of patient trajectories. Assess each component independently - They may
    differ without being contradictory. Use dates rather than assuming array order
    establishes chronology; acknowledge when missing dates limit interpretation.
  `),
  visitPriority: z.array(visitPrioritySchema).describe(`
  Open questions for the physician's upcoming examination that are
  important to understanding current condition, recovery, or treatment
  response. Identify uncertainties in the supplied case
  summary and treatment analysis whose clarification could materially
  change interpretation of the patient's condition or recovery trajectory.

  Each priority should explain the unresolved issue, why it matters,
  and, when useful, a practical way to explore it. Avoid generic examination
  checklists, speculative concerns, and questions already answered by the
  supplied information. Combine overlapping issues. Synthesize the timeline,
  treatment issues, gaps, inconsistencies, and physician comments; do not turn
  every input item into a question. An untried treatment does not automatically
  need to be performed; identify what needs clarification rather than prescribing care.

  Return at most three. Each must rest on something specific in the supplied
  case: a named conflict between records, an evidence gap or inconsistency
  the physician kept, or a particular finding whose meaning is unclear. Name
  that basis in whyItMatters. Elements of every independent medical exam,
  such as current pain, functional limitations, range of motion, or progress
  in a treatment in general, are not priorities unless a specific conflict
  makes them one. Fewer, sharper priorities are better than complete coverage.

  Be realistic about what an encounter can establish. Some issues may
  be partly clarified through history or examination and still require
  additional records. Return an empty array when no meaningful priorities
  are supported; this is a common, correct result.

  Examples illustrate specificity and style; their clinical details
  should not be copied unless supported by the supplied case.
`),
});

export const refinedAnalysisProviderSchema = z.enum(["gemini", "openai"]);
export const storedRefinedAnalysisSchema = refinedAnalysisSchema.extend({
  visitPriority: z.array(visitPrioritySchema.extend({ id: z.string() })),
  schemaVersion: z.literal("draft-v2"),
  sourceMetadata: z.object({
    provider: refinedAnalysisProviderSchema,
    model: z.string().min(1),
  }),
});
export type RefinedAnalysisOutput = z.infer<typeof refinedAnalysisSchema>;

/**
 * A concise representation of the refined analysis result for documentation,
 * examples, and UI descriptions.
 */

export type RefinedAnalysisProvider = z.infer<
  typeof refinedAnalysisProviderSchema
>;
export type StoredRefinedAnalysis = z.infer<typeof storedRefinedAnalysisSchema>;

export const refinedAnalysisResponseSchema = z.object({
  id: z.number().int().positive(),
  caseId: z.number().int().positive(),
  region: regionSchema,
  inputSnapshot: refinedAnalysisInputSnapshotSchema,
  analysis: storedRefinedAnalysisSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RefinedAnalysisResponse = z.infer<
  typeof refinedAnalysisResponseSchema
>;
