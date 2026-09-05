import { z } from "zod";

export const caseSummaryProviderSchema = z.enum(["gemini", "openai"]);

// export const OrderItemSchema = z.object({
//   orderCategory: z
//     .enum([
//       "Imaging",
//       "Physical Therapy / Rehabilitation",
//       "Injections / Interventional",
//       "Specialist Referral",
//       "Medications",
//       "Surgery / Procedure",
//       "Diagnostic Testing (EMG/NCS/Labs)",
//       "Other",
//     ])
//     .describe(
//       "Category of the medical order, referral, or diagnostic request.",
//     ),

//   orderDetails: z
//     .string()
//     .describe(
//       "Specific description of the ordered item or referral (e.g., 'Lumbar Spine MRI without contrast', 'Consultation with Orthopedic Spine Surgery', 'Gabapentin 300mg TID').",
//     ),

//   orderingProvider: z
//     .string()
//     .default("")
//     .describe(
//       "Name or specialty of the provider who issued the order, if documented (e.g., 'Dr. Smith', 'PCP').",
//     ),

//   dateOrdered: z
//     .string()
//     .default("")
//     .describe(
//       "Date or approximate timeframe when the order was issued in 'YYYY-MM-DD' or 'Month YYYY' format.",
//     ),

//   status: z
//     .enum(["Completed", "Pending", "Discontinued", "Unclear"])
//     .describe(
//       "Current fulfillment status of the order. CRITICAL FOR UI BADGES & PASS 3 GAP AUDITING: " +
//         "Select 'Completed' if a corresponding report/encounter post-dating the order exists in the packet. " +
//         "Select 'Pending' if the order was recommended but no follow-up result or procedure note exists. " +
//         "Select 'Discontinued' if the order was explicitly canceled or declined. " +
//         "Select 'Unclear' if notes end abruptly after the order was placed.",
//     ),
// });
const providerSummarySchema = z.object({
  providerName: z
    .string()
    .describe("Name of the provider or facility from the document metadata."),

  specialty: z
    .string()
    .default("")
    .describe(
      "Medical specialty or provider type (e.g., 'Orthopedic Spine Surgery', 'Physical Therapy', 'Primary Care').",
    ),

  dateRange: z
    .string()
    .default("")
    .describe(
      "The span of dates this provider treated the patient (e.g., '2024-01-15 to 2024-06-01').",
    ),

  providerSummary: z
    .string()
    .describe(
      "A concise, factual clinical summary of all records associated with this specific provider. " +
        "Include key findings, diagnoses made, treatments/procedures performed, patient response to care, " +
        "and their final documented disposition or discharge opinion.",
    ),
});

export const treatmentHistoryItemSchema = z.object({
  treatmentCategory: z
    .enum([
      "Physical/Occupational Therapy",
      "Injections/Interventional Pain",
      "Surgery",
      "Medication Management",
      "Chiropractic",
      "Other",
    ])
    .describe(
      "Categorization of the treatment intervention. Used later to differentiate between conservative care, interventional procedures, and surgical care.",
    ),
  treatmentDetails: z
    .string()
    .describe(
      "Specific details of the intervention (e.g., '12 sessions of PT focused on core stabilization', 'L4-L5 left-sided Epidural Steroid Injection', 'Epidural, 80mg Depo-Medrol'). " +
        "Include frequency, specific procedures, or medication dosages where stated.",
    ),
  dateRange: z
    .string()
    .describe(
      "Chronological timeframe or single date of care in 'YYYY-MM-DD to YYYY-MM-DD' or 'YYYY-MM-DD' format (e.g., '2024-01-15 to 2024-03-30'). " +
        "If dates are approximate or month-only, state explicitly (e.g., 'Jan 2024 to Mar 2024').",
    ),
  documentedResponse: z
    .enum([
      "Significant Improvement",
      "Moderate Improvement",
      "Temporary Relief",
      "No Relief / Failed",
      "Worsened",
      "Ongoing / Active Care",
      "Unknown",
    ])
    .describe(
      "Documented patient response or therapeutic efficacy. CRITICAL FOR MMI: " +
        "Select 'Temporary Relief' if symptoms returned shortly after intervention (e.g. ESI relief lasted 2 weeks). " +
        "Select 'No Relief / Failed' if care failed to improve baseline. " +
        "Do not guess—if notes do not state an outcome, select 'Unspecified / Outcome Not Documented'.",
    ),
  careStatus: z
    .enum([
      "Completed",
      "Active",
      "Discontinued",
      "Ordered / Pending",
      "Unclear",
    ])
    .describe(
      "Current operational status of this care line. CRITICAL FOR DETERMINISTIC FILTERS & MMI BLOCKERS: " +
        "Select 'Active' if the patient is currently receiving or scheduled for this treatment. " +
        "Select 'Ordered / Pending' if a provider recommended/ordered the treatment but no post-order record exists. " +
        "Select 'Unclear' if therapy notes end abruptly without a formal discharge summary.",
    ),
  sourceDocIds: z.array(z.string()).default([]),
});

export const storedTreatmentHistoryItemSchema =
  treatmentHistoryItemSchema.extend({
    id: z.string().uuid(),
  });

export const caseClinicalSummarySchema = z.object({
  // Executive Overview for Instant Doctor Scan
  // caseWideSummary: z
  //   .string()
  //   .describe(
  //     "A concise 2-3 paragraph executive overview of the case from date of injury to present, highlighting primary trauma, major interventions, and current clinical status.",
  //   ),
  caseWideSummary: z
    .string()
    .describe(
      "A concise 2-3 paragraph executive overview of the case from date of injury to present. " +
        "Must explicitly summarize the mechanism of injury, initial and evolving chief complaints, " +
        "the progression of patient-reported subjective symptoms over time, major conservative and surgical interventions, " +
        "and current overall clinical status.",
    ),
  // 1. Chronological Master Event Log happens via SQL query, not LLM. This is a structured timeline of all events in the case.

  // 2. Deduplicated & Consolidated Diagnoses

  diagnoses: z
    .array(
      z.object({
        diagnosisName: z.string(),
        icdCode: z.string().default(""),
        contributingProviders: z.array(z.string()).default([]),
        sourceDocIds: z.array(z.string()).default([]),
      }),
    )
    .describe(
      "Deduplicated master list of all unique diagnoses mentioned across records.",
    ),

  // 3. Treatment History Matrix (Conservative & Interventional Care)
  treatmentHistory: z
    .array(treatmentHistoryItemSchema)
    .describe(
      "This array contains a list of all conservative and interventional care tried or recommended. ",
    ),

  // 4. Objective Physical Exam Findings Trend (Feeds GMPE)
  objectiveFindings: z.array(
    z.object({
      bodyRegion: z.string(),
      findingCategory: z.enum([
        "Range of Motion",
        "Reflexes",
        "Sensory Deficit",
        "Atrophy/Wasting",
        "Strength",
        "Spinal Alignment",
        "Other",
      ]),
      summary: z.string(),
      mostRecentFinding: z.string().default(""),
      sourceDocIds: z.array(z.string()).default([]),
    }),
  ),

  // 5. Structural Imaging & Diagnostic Timeline (Feeds GMCS)
  imagingFindings: z.array(
    z.object({
      dateOfStudy: z.string(),
      modality: z.enum([
        "MRI",
        "CT",
        "X-Ray",
        "Ultrasound",
        "EMG/NCV",
        "Other",
        "",
      ]),
      bodyRegion: z.string(),
      keyPathologySummary: z.string(),
      sourceDocIds: z.array(z.string()).default([]),
    }),
  ),

  // 6. ADL & Functional Impairments (Feeds GMFH)
  functionalLimitations: z
    .array(
      z.object({
        adlCategory: z
          .string()
          .describe("The type of activity of daily living being assessed."), // e.g., "Sitting", "Lifting", "Driving"
        limitationDescription: z.string(),
        standardizedScores: z.string().default(""), // e.g., "Oswestry Disability Index: 44%"
        sourceDocIds: z.array(z.string()).default([]),
      }),
    )
    .describe("Functional history baseline."),

  // 7. Historical Work Status & Disability Restrictions
  workStatusHistory: z
    .array(
      z.object({
        date: z.string(),
        workStatus: z.string(), // Full duty, modified duty, off work, TTD, etc.
        restrictionsSummary: z.string().default(""),
        sourceDocIds: z.array(z.string()).default([]),
      }),
    )
    .describe(
      "Chronological history of documented work status and work restrictions.",
    ),

  // 8. Provider Breakdown
  providerSummaries: z
    .array(providerSummarySchema)
    .describe("Create one concise factual summary per provider. "),

  // 9. Preserved Data Conflicts (Crucial Input for Pass 3)
  unresolvedDataConflicts: z
    .array(
      z.object({
        fieldInConflict: z
          .string()
          .describe("e.g., 'Anatomical Side' or 'Date of Injury'"),
        competingValues: z
          .array(z.string())
          .describe(
            "e.g., ['Lumbar spine (Dr. Smith, 2024-03-01)', 'Cervical spine (Dr. Jones, 2024-03-05)']",
          ),
        sourceDocIds: z.array(z.string()).default([]),
      }),
    )
    .describe(
      "Factual conflicts encountered during synthesis that cannot be safely reconciled. Preserve competing values rather than choosing one.",
    ),
});

export const storedCaseClinicalSummarySchema = caseClinicalSummarySchema.extend(
  {
    treatmentHistory: z.array(storedTreatmentHistoryItemSchema),
    schemaVersion: z.literal("v2"),
    sourceMetadata: z.object({
      provider: caseSummaryProviderSchema,
      model: z.string().min(1),
      sourceRecordCount: z.number().int().nonnegative(),
    }),
  },
);

export type CaseSummaryProvider = z.infer<typeof caseSummaryProviderSchema>;
export type CaseClinicalSummary = z.infer<typeof caseClinicalSummarySchema>;
export type StoredCaseClinicalSummary = z.infer<
  typeof storedCaseClinicalSummarySchema
>;
