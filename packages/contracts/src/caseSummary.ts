import { z } from "zod";

export const caseSummaryProviderSchema = z.enum(["gemini", "openai"]);

export const caseClinicalSummarySchema = z.object({
  incidentNarrative: z
    .string()
    .describe(
      "The mechanism and circumstances of the claimed injury as documented — what the patient was doing, how the injury occurred, and what happened immediately afterward. This is usually stated in the earliest records and repeated in later notes. If accounts differ across documents, present the variations rather than choosing one. If the mechanism is not documented, return an empty string."
    ),
  statusTimeline: z
    .array(
      z.object({
        recordId: z
          .string()
          .describe(
            "Id of the input document this line is drawn from. Copy exactly."
          ),
        subjective: z
          .string()
          .describe(
            "In one or two sentences (eliminate all filler words): what the patient reported at this visit. The input documents separate 'Subjective' into its components - History of Present Illness, Review of Systems, and Chief Complaing . Keep severities and scales as written (e.g. '6/10'). No interpretation. "
          ),
        objective: z
          .string()
          .nullable()
          .describe(
            "In one or two sentences (eliminate all filler words): examiner findings at this visit, from objective  / objectiveMetrics. Keep measurements as written (ROM, strength grades, positive/negative tests, tenderness). No interpretation. Null if the document records no exam findings."
          ),
        functional: z
          .string()
          .nullable()
          .describe(
            "In one or two sentences (eliminate all filler words): what the patient could and could not do, from functionalLimitations and workStatus. Null if the document does not address function."
          ),
      })
    )
    .describe(
      "One entry per document that documents patient's status - record type encounters, therapy notes, surgery and intervention reports usually do; Skip documents that don't — imaging reports, work status forms, job descriptions, etc. Use only the extracted fields of that document; do not carry information between documents."
    ),
  caseWideSummary: z
    .string()
    .describe(
      "A brief orienting summary of the case for a physician who has not read the record, in 1-2 paragraphs. Cover: What the claimed injury is, which providers have been involved and in what roles, the broad arc of care, and where things currently stand. Write in plain clinical prose without headings or bullet points. Describe what is documented. Do not offer clinical conclusions, prognosis, or assessments of whether the patient has improved, stabilized, or has remaining treatment options."
    ),
  psychosocialFactors: z
    .string()
    .nullable()
    .describe(
      "Documented non-physical factors that could affect recovery or treatment response: mood or sleep problems, fear of movement or reinjury, substance or opiod concerns. Quote or closely paraphrase what a provider actually wrote, with the provider type. Do not infer. Null if no document addresses any of this."
    ),
});

export const storedCaseClinicalSummarySchema = caseClinicalSummarySchema.extend(
  {
    schemaVersion: z.literal("v2"),
    sourceMetadata: z.object({
      provider: caseSummaryProviderSchema,
      model: z.string().min(1),
      sourceRecordCount: z.number().int().nonnegative(),
    }),
  }
);

export type CaseSummaryProvider = z.infer<typeof caseSummaryProviderSchema>;
export type CaseClinicalSummary = z.infer<typeof caseClinicalSummarySchema>;
export type StoredCaseClinicalSummary = z.infer<
  typeof storedCaseClinicalSummarySchema
>;

// GET /cases/:caseId/case-summary enriches each timeline entry with the
// source record's date and provider.
export const caseSummaryTimelineEntrySchema =
  storedCaseClinicalSummarySchema.shape.statusTimeline.element.extend({
    date: z.string().nullable(),
    providerName: z.string().nullable(),
    providerType: z.string().nullable(),
  });

export const caseSummaryResponseSchema = z.object({
  id: z.number().int(),
  caseId: z.number().int(),
  summary: storedCaseClinicalSummarySchema.extend({
    statusTimeline: z.array(caseSummaryTimelineEntrySchema),
  }),
});

export type CaseSummaryTimelineEntry = z.infer<
  typeof caseSummaryTimelineEntrySchema
>;
export type CaseSummaryResponse = z.infer<typeof caseSummaryResponseSchema>;

export const caseSummaryCardResponseSchema = z.object({
  caseId: z.number().int().positive(),
  currentWorkStatus: z.object({
    recordId: z.number().int().positive(),
    documentType: z.enum(["encounter", "workstatus"]),
    date: z.string().nullable(),
    status: z.enum(["full_duty", "modified_duty", "off_work", "unknown"]),
    restrictions: z.array(z.string()),
  }).nullable(),
  diagnoses: z.array(
    z.object({
      canonicalDx: z.string().min(1),
      label: z.string().min(1),
      icdPrefixes: z.array(z.string()),
    })
  ),
});

export type CaseSummaryCardResponse = z.infer<
  typeof caseSummaryCardResponseSchema
>;

// GET /cases/:caseId/past-medical-history: what the records document, one entry per
// distinct statement, oldest first.
export const pastMedicalHistorySchema = z.array(
  z.object({
    recordId: z.number().int().positive(),
    date: z.string().nullable(),
    providerName: z.string().nullable(),
    history: z.string(),
  })
);
export type PastMedicalHistory = z.infer<typeof pastMedicalHistorySchema>;
