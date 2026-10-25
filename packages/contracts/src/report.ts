import { z } from "zod";
import { caseClinicalSummarySchema } from "./caseSummary.js";
import {
  careDispositionSchema,
  causationOpinionSchema,
  mmiDecisionSchema,
  workOpinionSchema,
} from "./opinions.js";
import { amaZeroReasonSchema } from "./amaRating.js";
import {
  postExamAnalysisSchema,
  postExamInputSchema,
} from "./postExamAnalysis.js";
import { regionSchema } from "./regions.js";

// The report drafter's input, assembled from the case's saved work and grouped by the
// report's sections (docs/ime-report.md). The Report tab's builder renders exactly this,
// and Generate freezes it as the model input. Redundancy is pruned while assembling:
// material every region shares appears once, record histories collapse repeated
// entries, and the Discussion keeps only what matches the physician's decisions.

const postExamInput = postExamInputSchema.shape;
const caseSummary = caseClinicalSummarySchema.shape;

const legacyReportDiscussionRegionSchema = z.object({
  region: regionSchema,
  supportedDiagnoses: z.array(z.string()),
  treatmentAnalysis: z.array(
    z.object({
      treatment: z.string(),
      recordStatus: z.string().nullable(),
      recordDetail: z.string().nullable(),
      assessments: z.array(
        z.object({
          diagnosis: z.string(),
          applicability: z.string(),
          rationale: z.string(),
        }),
      ),
      exhaustion: z.string(),
      exhaustionRationale: z.string(),
    }),
  ),
  trajectory: postExamAnalysisSchema.shape.trajectory,
  // The physician's causation opinion per supported diagnosis.
  causation: z.array(causationOpinionSchema.extend({ diagnosis: z.string() })),
  mmi: mmiDecisionSchema,
  // The plateau evidence on the side of the physician's decision: supporting when at
  // MMI, opposing when not.
  plateauEvidence: z.array(z.string()),
  // Also answers whether surgery is indicated (q5): surgical rows are applicable
  // surgery not yet tried, with the physician's disposition.
  remainingCare: z.array(
    z.object({
      treatment: z.string(),
      category: z.string().nullable(),
      disposition: careDispositionSchema,
      note: z.string().nullable(),
    }),
  ),
  // Only when a rating is requested and the region is at MMI. Components without a
  // supported diagnosis are left out.
  impairment: z
    .object({
      components: z.array(
        z.object({
          diagnoses: z.array(z.string()),
          basis: z.string(),
          nerveRoot: z.string().nullable(),
          side: z.enum(["left", "right"]).nullable(),
          entryId: z.string().nullable(),
          zeroReason: amaZeroReasonSchema.nullable(),
          wpi: z.number(),
        }),
      ),
      wpi: z.number(),
      rationale: z.array(z.string()),
    })
    .nullable(),
});
export type LegacyReportDiscussionRegion = z.infer<
  typeof legacyReportDiscussionRegionSchema
>;

// A completed questionnaire as the report cites it: each question with the chosen answer.
const legacyReportQuestionnaireSchema = z.object({
  title: z.string(),
  completedAt: z.string(),
  scores: postExamInput.visit.shape.pdq.unwrap().shape.scores,
  answers: z.array(
    z.object({
      group: z.string(),
      question: z.string(),
      answer: z.string(),
      score: z.number(),
    }),
  ),
});
export type LegacyReportQuestionnaire = z.infer<
  typeof legacyReportQuestionnaireSchema
>;

// Compact report findings derived only from the frozen examination and answers.
export const reportAmaFindingsSchema = z.object({
  diagnoses: z.array(z.string()),
  row: z.string(),
  nerveRoot: z.string().nullable(),
  side: z.enum(["left", "right"]).nullable(),
  tests: z.array(z.object({ test: z.string(), result: z.string() })),
});
export type ReportAmaFindings = z.infer<typeof reportAmaFindingsSchema>;

export const legacyReportInputSchema = z.object({
  // 1. Intro: templated from the case facts.
  intro: postExamInput.caseContext.extend({
    examinationDate: z.string(),
    impairmentRequested: z.boolean(),
  }),
  // 2. Background: past medical history comes from the note; medications from the
  // records, one entry per medication.
  background: z.object({
    medications: z.array(
      z.object({
        medication: z.string(),
        doses: z.array(z.string()),
        firstDate: z.string().nullable(),
        lastDate: z.string().nullable(),
        lastAction: z.string(),
      }),
    ),
    psychosocialFactors: caseSummary.psychosocialFactors,
  }),
  // 3. Chief complaint (from the note) and history of present illness.
  historyOfPresentIllness: z.object({
    incidentNarrative: caseSummary.incidentNarrative,
    caseWideSummary: caseSummary.caseWideSummary,
  }),
  // 4. Imaging reviews in the records.
  imaging: z.array(
    z.object({
      date: z.string().nullable(),
      modality: z.string(),
      bodySite: z.string(),
      impression: z.array(z.string()),
    }),
  ),
  // 5. Work status history: consecutive records with the same status and restrictions
  // form one period.
  workStatus: z.array(
    z.object({
      from: z.string().nullable(),
      to: z.string().nullable(),
      status: z.enum(["full_duty", "modified_duty", "off_work", "unknown"]),
      restrictions: z.array(z.string()),
    }),
  ),
  // 6. Diagnoses: every listed diagnosis with the physician's conclusion.
  diagnoses: z.array(
    z.object({
      region: regionSchema,
      diagnoses: z.array(
        z.object({
          label: z.string(),
          status: z.enum(["supported", "not_supported"]),
          reason: z.string().nullable(),
        }),
      ),
    }),
  ),
  // 7. Today's examination: subjective and functional from the note, PDQ and
  // questionnaires; objective from the note and the AMA findings.
  examination: z.object({
    date: z.string(),
    note: postExamInput.visit.shape.note,
    pdq: legacyReportQuestionnaireSchema.nullable(),
    questionnaires: z.array(legacyReportQuestionnaireSchema),
    amaFindings: z.array(
      z.object({
        region: regionSchema,
        findings: z.array(reportAmaFindingsSchema),
      }),
    ),
  }),
  // 8. Discussion: per region, then the whole person and the work status recommendation.
  discussion: z.object({
    regions: z.array(legacyReportDiscussionRegionSchema),
    work: workOpinionSchema,
    wholePerson: z.object({
      allAtMmi: z.boolean(),
      // Only when a rating is requested.
      impairment: z
        .object({ wpi: z.number().nullable(), rationale: z.array(z.string()) })
        .nullable(),
    }),
  }),
});
export type LegacyReportInput = z.infer<typeof legacyReportInputSchema>;

// The comparison builder retains the original schema above. New snapshots separate
// earlier analysis from final decisions and join care recommendations by treatment ID.
const reportTreatmentSchema = z.object({
  treatment: z.string(),
  category: z.string().nullable(),
  documentedHistory: z.object({
    status: z.string().nullable(),
    detail: z.string().nullable(),
  }),
  // Applicability per diagnosis; exactly matching assessments are grouped.
  reviewedAssessments: z.array(
    z.object({
      diagnoses: z.array(z.string()),
      applicability: z.string(),
      rationale: z.string(),
    }),
  ),
  // One exhaustion judgment for the treatment, across its applicable diagnoses.
  exhaustion: z.object({ value: z.string(), rationale: z.string() }),
  physicianRecommendation: z
    .object({
      disposition: careDispositionSchema,
      note: z.string().nullable(),
    })
    .nullable(),
});
export type ReportTreatment = z.infer<typeof reportTreatmentSchema>;

const reportInappropriateCareSchema = z.object({
  treatment: z.string(),
  category: z.string().nullable(),
  documentedHistory: reportTreatmentSchema.shape.documentedHistory,
  diagnoses_considered: z.array(z.string()),
  decision_basis: z.enum([
    "not_applicable",
    "contraindicated",
    "physician_not_recommended",
  ]),
  inappropriateness_rationale: z.string().nullable(),
});
export type ReportInappropriateCare = z.infer<
  typeof reportInappropriateCareSchema
>;

const reportExhaustedCareSchema = z.object({
  treatment: z.string(),
  category: z.string().nullable(),
  documentedHistory: reportTreatmentSchema.shape.documentedHistory,
  diagnoses_addressed: z.array(z.string()),
  exhaustion_rationale: z.string(),
});
export type ReportExhaustedCare = z.infer<typeof reportExhaustedCareSchema>;

const reportRemainingCareSchema = z.object({
  treatment: z.string(),
  category: z.string().nullable(),
  documentedHistory: reportTreatmentSchema.shape.documentedHistory,
  applicability_rationales: z.array(
    z.object({
      diagnosis: z.string(),
      rationale: z.string(),
      // Only needed when applicability is uncertain or contraindicated.
      applicability: z.string().optional(),
    }),
  ),
  exhaustion_status: z.string(),
  exhaustion_rationale: z.string(),
});
const reportCurativeCareSchema = reportRemainingCareSchema;
const reportMaintenanceCareSchema = reportRemainingCareSchema;
export type ReportRemainingCare = z.infer<typeof reportRemainingCareSchema>;
export type ReportCurativeCare = z.infer<typeof reportCurativeCareSchema>;
export type ReportMaintenanceCare = z.infer<typeof reportMaintenanceCareSchema>;

const reportCareForUnsupportedDiagnosisSchema = z.object({
  diagnosis: z.string(),
  treatments: z.array(
    reportTreatmentSchema.pick({ treatment: true, documentedHistory: true }),
  ),
});
export type ReportCareForUnsupportedDiagnosis = z.infer<
  typeof reportCareForUnsupportedDiagnosisSchema
>;

const reportDiscussionRegionSchema = z.object({
  region: regionSchema,
  treatments: z.array(reportTreatmentSchema),
  // Additive comparison projection; older snapshots do not have this section.
  care_marked_inappropriate: z.array(reportInappropriateCareSchema).optional(),
  // Historical context only; an unsupported diagnosis does not establish unnecessary care.
  // Optional so previously frozen reports remain readable.
  care_for_unsupported_diagnoses: z
    .array(reportCareForUnsupportedDiagnosisSchema)
    .optional(),
  care_marked_exhausted: z.array(reportExhaustedCareSchema).optional(),
  remaining_curative_care: z.array(reportCurativeCareSchema).optional(),
  remaining_maintenance_care: z.array(reportMaintenanceCareSchema).optional(),
  priorAnalysis: legacyReportDiscussionRegionSchema.pick({
    trajectory: true,
    plateauEvidence: true,
  }),
  physicianDecisions: legacyReportDiscussionRegionSchema.pick({
    causation: true,
    mmi: true,
    impairment: true,
  }),
});
export type ReportBaseDiscussionRegion = z.infer<
  typeof reportDiscussionRegionSchema
>;

const reportBaseQuestionnaireSchema = legacyReportQuestionnaireSchema.extend({
  // Instructions from a matching instrument version, if available.
  instructions: z.string().nullable(),
  answers: z.array(
    z.object({
      group: z.string(),
      question: z.string(),
      score: z.number(),
      scoreRange: z.tuple([z.number(), z.number()]),
      // Omitted when the option label only repeats the numeric score.
      answerLabel: z.string().optional(),
    }),
  ),
});
export type ReportBaseQuestionnaire = z.infer<
  typeof reportBaseQuestionnaireSchema
>;

const reportQuestionnaireSchema = z.object({
  name: z.string(),
  question_description: z.string().nullable(),
  total_score: z.string().nullable(),
  // Omitted when completed on the examination date.
  completed_on: z.string().optional(),
  answers: z.array(z.object({ question: z.string(), score: z.string() })),
});
export type ReportQuestionnaire = z.infer<typeof reportQuestionnaireSchema>;

export const reportBaseInputSchema = legacyReportInputSchema.extend({
  schemaVersion: z.literal("report-v2"),
  background: z.object({
    recordedMedications:
      legacyReportInputSchema.shape.background.shape.medications,
    psychosocialFactors: caseSummary.psychosocialFactors,
  }),
  // Dated observations, not inferred start/end dates of a work-status period.
  workStatus: z.array(
    z.object({
      documentedOn: z.string().nullable(),
      status: legacyReportInputSchema.shape.workStatus.element.shape.status,
      restrictions: z.array(z.string()),
    }),
  ),
  examination: legacyReportInputSchema.shape.examination.extend({
    pdq: reportBaseQuestionnaireSchema.nullable(),
    questionnaires: z.array(reportBaseQuestionnaireSchema),
  }),
  discussion: legacyReportInputSchema.shape.discussion.extend({
    regions: z.array(reportDiscussionRegionSchema),
  }),
  // Verbatim from the referral; the drafter restates and answers each one.
  referralQuestions: z.array(z.string()),
});
export type ReportBaseInput = z.infer<typeof reportBaseInputSchema>;

export const reportVariantSchema = z.enum([
  "mmi_rating",
  "mmi_no_rating",
  "not_all_mmi_rating",
  "not_all_mmi_no_rating",
]);
export type ReportVariant = z.infer<typeof reportVariantSchema>;
export const reportVariantLabels: Record<ReportVariant, string> = {
  mmi_rating: "All regions at MMI · rating requested",
  mmi_no_rating: "All regions at MMI · no rating requested",
  not_all_mmi_rating: "Not all regions at MMI · rating requested",
  not_all_mmi_no_rating: "Not all regions at MMI · no rating requested",
};

export function selectReportVariant(
  allAtMmi: boolean,
  impairmentRequested: boolean,
): ReportVariant {
  return allAtMmi
    ? impairmentRequested
      ? "mmi_rating"
      : "mmi_no_rating"
    : impairmentRequested
      ? "not_all_mmi_rating"
      : "not_all_mmi_no_rating";
}

const reportMmiDecisionSchema = z.discriminatedUnion("status", [
  mmiDecisionSchema.options[0].extend({
    supporting_analysis: z.array(z.string()),
  }),
  mmiDecisionSchema.options[1].extend({
    supporting_analysis: z.array(z.string()),
  }),
]);

const draftImpairmentSchema =
  legacyReportDiscussionRegionSchema.shape.impairment
    .unwrap()
    .pick({ wpi: true })
    .nullable();

const reportDraftRegionSchema = reportDiscussionRegionSchema
  .omit({ priorAnalysis: true, treatments: true })
  .extend({
    patient_subjective_trajectory:
      postExamAnalysisSchema.shape.trajectory.shape.subjective,
    patient_objective_trajectory:
      postExamAnalysisSchema.shape.trajectory.shape.objective,
    patient_functional_trajectory:
      postExamAnalysisSchema.shape.trajectory.shape.functional,
    physicianDecisions:
      reportDiscussionRegionSchema.shape.physicianDecisions.extend({
        mmi: reportMmiDecisionSchema,
        impairment: draftImpairmentSchema,
      }),
  });

const noRatingRegionSchema = reportDraftRegionSchema.extend({
  physicianDecisions: reportDraftRegionSchema.shape.physicianDecisions.extend({
    impairment: z.never().optional(),
  }),
});
export type ReportDiscussionRegion =
  | z.infer<typeof reportDraftRegionSchema>
  | z.infer<typeof noRatingRegionSchema>;
const mmiStatusByRegionSchema = z.partialRecord(
  regionSchema,
  z.enum(["at_mmi", "not_at_mmi"]),
);
const wholePersonImpairmentSchema = z.object({
  scope: z.enum(["all_regions", "mmi_regions_only"]),
  included_regions: z.array(regionSchema),
  excluded_regions: z.array(regionSchema),
  percentage: z.number().nullable(),
});
const ratingDiscussionSchema = reportBaseInputSchema.shape.discussion
  .omit({ work: true, wholePerson: true })
  .extend({
    recommended_work_status: workOpinionSchema,
    regions: z.array(reportDraftRegionSchema).min(1),
    mmi_status_by_region: mmiStatusByRegionSchema,
    whole_person_impairment: wholePersonImpairmentSchema,
  });
const noRatingDiscussionSchema = reportBaseInputSchema.shape.discussion
  .omit({ work: true, wholePerson: true })
  .extend({
    recommended_work_status: workOpinionSchema,
    regions: z.array(noRatingRegionSchema).min(1),
    mmi_status_by_region: mmiStatusByRegionSchema,
    whole_person_impairment: z.never().optional(),
  });
const questionnaireExaminationSchema = reportBaseInputSchema.shape.examination
  .omit({ pdq: true, questionnaires: true })
  .extend({ questionnaires_completed: z.array(reportQuestionnaireSchema) });
const regionalExaminationFindingSchema = reportAmaFindingsSchema
  .omit({ diagnoses: true, row: true })
  .extend({
    // A non-root assessment (fracture, fusion, etc.) still needs its subject.
    finding: z.string().optional(),
  });
const variantBase = reportBaseInputSchema.extend({
  schemaVersion: z.literal("report-v5"),
  examination: questionnaireExaminationSchema
    .omit({ amaFindings: true })
    .extend({
      lumbar_spine_findings: z
        .array(regionalExaminationFindingSchema)
        .optional(),
      cervical_spine_findings: z
        .array(regionalExaminationFindingSchema)
        .optional(),
      thoracic_spine_findings: z
        .array(regionalExaminationFindingSchema)
        .optional(),
    }),
});
const ratingIntro = reportBaseInputSchema.shape.intro.extend({
  impairmentRequested: z.literal(true),
});
const noRatingIntro = reportBaseInputSchema.shape.intro.extend({
  impairmentRequested: z.literal(false),
});

export const mmiRatingReportInputSchema = variantBase.extend({
  variant: z.literal("mmi_rating"),
  intro: ratingIntro,
  discussion: ratingDiscussionSchema.omit({ mmi_status_by_region: true }),
});
export const mmiNoRatingReportInputSchema = variantBase.extend({
  variant: z.literal("mmi_no_rating"),
  intro: noRatingIntro,
  discussion: noRatingDiscussionSchema.omit({ mmi_status_by_region: true }),
});
export const notAllMmiRatingReportInputSchema = variantBase.extend({
  variant: z.literal("not_all_mmi_rating"),
  intro: ratingIntro,
  discussion: ratingDiscussionSchema,
});
export const notAllMmiNoRatingReportInputSchema = variantBase.extend({
  variant: z.literal("not_all_mmi_no_rating"),
  intro: noRatingIntro,
  discussion: noRatingDiscussionSchema,
});
export const reportInputSchema = z
  .discriminatedUnion("variant", [
    mmiRatingReportInputSchema,
    mmiNoRatingReportInputSchema,
    notAllMmiRatingReportInputSchema,
    notAllMmiNoRatingReportInputSchema,
  ])
  .superRefine((input, ctx) => {
    const allAtMmi = input.discussion.regions.every(
      (r) => r.physicianDecisions.mmi.status === "at_mmi",
    );
    if (
      input.variant !==
      selectReportVariant(allAtMmi, input.intro.impairmentRequested)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Report variant must match regional MMI decisions and rating request",
      });
    const regions = input.discussion.regions;
    if ("mmi_status_by_region" in input.discussion) {
      const summary = input.discussion.mmi_status_by_region;
      if (
        Object.keys(summary).length !== regions.length ||
        regions.some(
          (r) => summary[r.region] !== r.physicianDecisions.mmi.status,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "MMI summary must match regional decisions",
        });
    }
    const whole = input.discussion.whole_person_impairment;
    if (whole) {
      const included = regions
        .filter((r) => r.physicianDecisions.mmi.status === "at_mmi")
        .map((r) => r.region);
      const excluded = regions
        .filter((r) => r.physicianDecisions.mmi.status !== "at_mmi")
        .map((r) => r.region);
      if (
        whole.scope !== (allAtMmi ? "all_regions" : "mmi_regions_only") ||
        JSON.stringify(whole.included_regions) !== JSON.stringify(included) ||
        JSON.stringify(whole.excluded_regions) !== JSON.stringify(excluded)
      )
        ctx.addIssue({
          code: "custom",
          message: "WPI scope and regions must match regional MMI decisions",
        });
    }
  });
export type ReportInput = z.infer<typeof reportInputSchema>;

const previousRatingDiscussionSchema = ratingDiscussionSchema
  .omit({
    recommended_work_status: true,
    mmi_status_by_region: true,
    whole_person_impairment: true,
  })
  .extend({
    work: workOpinionSchema,
    wholePerson:
      reportBaseInputSchema.shape.discussion.shape.wholePerson.extend({
        impairmentScope: z.enum(["all_regions", "mmi_regions_only"]),
      }),
    regions: z.array(reportDiscussionRegionSchema).min(1),
  });
const previousNoRatingDiscussionSchema = noRatingDiscussionSchema
  .omit({
    recommended_work_status: true,
    mmi_status_by_region: true,
    whole_person_impairment: true,
  })
  .extend({
    work: workOpinionSchema,
    wholePerson: z.object({
      allAtMmi: z.boolean(),
      impairment: z.never().optional(),
    }),
    regions: z
      .array(
        reportDiscussionRegionSchema.extend({
          physicianDecisions:
            reportDiscussionRegionSchema.shape.physicianDecisions.extend({
              impairment: z.never().optional(),
            }),
        }),
      )
      .min(1),
  });

// Read older frozen drafts without rewriting their questionnaire payloads.
const previousExamination = {
  schemaVersion: z.literal("report-v3"),
  examination: reportBaseInputSchema.shape.examination,
};
const v3ReportVariantInputSchema = z.discriminatedUnion("variant", [
  mmiRatingReportInputSchema.extend({
    ...previousExamination,
    discussion: previousRatingDiscussionSchema,
  }),
  mmiNoRatingReportInputSchema.extend({
    ...previousExamination,
    discussion: previousNoRatingDiscussionSchema,
  }),
  notAllMmiRatingReportInputSchema.extend({
    ...previousExamination,
    discussion: previousRatingDiscussionSchema,
  }),
  notAllMmiNoRatingReportInputSchema.extend({
    ...previousExamination,
    discussion: previousNoRatingDiscussionSchema,
  }),
]);
const previousQuestionnaireExamination = {
  schemaVersion: z.literal("report-v4"),
  examination: questionnaireExaminationSchema,
};
const v4ReportVariantInputSchema = z.discriminatedUnion("variant", [
  mmiRatingReportInputSchema.extend({
    ...previousQuestionnaireExamination,
    discussion: previousRatingDiscussionSchema,
  }),
  mmiNoRatingReportInputSchema.extend({
    ...previousQuestionnaireExamination,
    discussion: previousNoRatingDiscussionSchema,
  }),
  notAllMmiRatingReportInputSchema.extend({
    ...previousQuestionnaireExamination,
    discussion: previousRatingDiscussionSchema,
  }),
  notAllMmiNoRatingReportInputSchema.extend({
    ...previousQuestionnaireExamination,
    discussion: previousNoRatingDiscussionSchema,
  }),
]);
const previousReportVariantInputSchema = z.union([
  v3ReportVariantInputSchema,
  v4ReportVariantInputSchema,
]);
export type PreviousReportVariantInput = z.infer<
  typeof previousReportVariantInputSchema
>;

// What still blocks generation, and the tab where it is fixed.
export const reportBlockerSchema = z.object({
  region: regionSchema.nullable(),
  message: z.string(),
  tab: z.enum(["summary", "analysis", "visit", "mmi"]),
});
export type ReportBlocker = z.infer<typeof reportBlockerSchema>;

// GET /cases/:caseId/report-input. The input is null while anything blocks it.
export const reportInputResponseSchema = z.object({
  input: reportInputSchema.nullable(),
  blockers: z.array(reportBlockerSchema),
});
export const legacyReportInputResponseSchema = reportInputResponseSchema.extend(
  {
    input: legacyReportInputSchema.nullable(),
  },
);
export type LegacyReportInputResponse = z.infer<
  typeof legacyReportInputResponseSchema
>;
export type ReportInputResponse = z.infer<typeof reportInputResponseSchema>;

export const reportProviderSchema = z.enum(["gemini", "openai"]);

// GET /cases/:caseId/report (latest, or null) and POST (generate). Every generation is
// a new row: the frozen input, then the drafted report once the model returns.
export const caseReportResponseSchema = z.object({
  id: z.number().int().positive(),
  caseId: z.number().int().positive(),
  input: z.union([
    previousReportVariantInputSchema,
    reportInputSchema,
    reportBaseInputSchema,
    legacyReportInputSchema,
  ]),
  report: z.string().nullable(),
  source: z
    .object({ provider: reportProviderSchema, model: z.string() })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CaseReportResponse = z.infer<typeof caseReportResponseSchema>;

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// The drafter writes the decided values itself, so check the ones that matter most
// made it into the text: each MMI date and each impairment value. Returns what is
// missing, in plain words.
export function reportFactCheck(
  input:
    | ReportInput
    | PreviousReportVariantInput
    | ReportBaseInput
    | LegacyReportInput,
  report: string,
): string[] {
  const missing: string[] = [];
  const hasDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
    const month = monthNames[m - 1]!;
    return [
      iso,
      `${m}/${d}/${y}`,
      `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`,
      `${month} ${d}, ${y}`,
      `${d} ${month} ${y}`,
    ].some((s) => report.includes(s));
  };
  // Rounding is not settled, so the exact value, one decimal or a whole number counts.
  const hasPercent = (wpi: number) =>
    [
      String(Number(wpi.toFixed(3))),
      wpi.toFixed(1),
      String(Math.round(wpi)),
    ].some((n) =>
      new RegExp(`(^|[^\\d.])${n.replace(".", "\\.")}\\s?%`).test(report),
    );
  for (const region of input.discussion.regions) {
    const r =
      "physicianDecisions" in region
        ? { region: region.region, ...region.physicianDecisions }
        : region;
    if (r.mmi.status === "at_mmi" && !hasDate(r.mmi.date))
      missing.push(`${r.region}: MMI date ${r.mmi.date}`);
    if (r.impairment && !hasPercent(r.impairment.wpi))
      missing.push(`${r.region}: regional impairment ${r.impairment.wpi}% WPI`);
  }
  const whole =
    "wholePerson" in input.discussion
      ? input.discussion.wholePerson.impairment?.wpi
      : input.discussion.whole_person_impairment?.percentage;
  if (whole != null && !hasPercent(whole))
    missing.push(`Whole person impairment ${whole}% WPI`);
  return missing;
}
