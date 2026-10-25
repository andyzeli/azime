import { z } from "zod";
import type { PostExamInput } from "./postExamAnalysis.js";
import { regionSchema } from "./regions.js";

// The physician's purpose for each remaining-care candidate. Together these answer
// q1 (supportive/maintenance care) and q2 (further treatment necessary).
// Supportive and maintenance are one category: care that sustains, not improves.
export const careDispositionSchema = z.enum([
  "curative",
  "maintenance",
  "not_recommended",
]);
export type CareDisposition = z.infer<typeof careDispositionSchema>;

// Not recommended denies care the analysis left open, so it requires the physician's reason.
export const remainingCareDecisionSchema = z.discriminatedUnion("disposition", [
  z.object({ disposition: z.literal("curative") }),
  z.object({ disposition: z.literal("maintenance") }),
  z.object({ disposition: z.literal("not_recommended"), note: z.string().trim().min(1) }),
]);
export type RemainingCareDecision = z.infer<typeof remainingCareDecisionSchema>;

// One MMI opinion per region. Saved as the physician edits, so required fields can be
// blank; mmiCheck says what is still missing.
export const mmiDecisionSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("at_mmi"),
    date: z.iso.date(),
    note: z.string(),
  }),
  z.object({
    status: z.literal("not_at_mmi"),
    // Reasons beyond the curative care: healing time, diagnostics wanted, anything else.
    note: z.string(),
    reevaluateIn: z
      .object({
        amount: z.number().int().positive(),
        unit: z.enum(["weeks", "months"]),
      })
      .nullable(),
  }),
]);
export type MmiDecision = z.infer<typeof mmiDecisionSchema>;

// The physician's causation opinion for one supported diagnosis. Covers the common
// referral questions (causation, pre-existing conditions, aggravation) in one answer;
// there is deliberately no numeric apportionment. Saved as edited: aggravation can be
// blank until chosen, and causationCheck says what is missing.
export const causationOpinionSchema = z.object({
  relationship: z.enum(["caused", "aggravated", "preexisting_not_aggravated", "not_related"]),
  // Only for "aggravated".
  aggravation: z.enum(["temporary", "permanent"]).nullable(),
  note: z.string(),
});
export type CausationOpinion = z.infer<typeof causationOpinionSchema>;

export const regionOpinionsSchema = z.object({
  // Treatment row id (3A row or physician-added treatment) → decision. Missing = undecided.
  remainingCare: z.record(z.string(), remainingCareDecisionSchema),
  mmi: mmiDecisionSchema.optional(),
  // Supported diagnosis → causation opinion. Missing = not yet stated.
  causation: z.record(z.string(), causationOpinionSchema),
});
export type RegionOpinions = z.infer<typeof regionOpinionsSchema>;

// The physician's work status recommendation: one for the case, reconciling regions.
export const workOpinionSchema = z.object({
  status: z.enum(["full_duty", "modified_duty", "off_work"]),
  // Only for modified duty.
  restrictions: z.array(z.string()),
  duration: z.enum(["temporary", "permanent"]).nullable(),
});
export type WorkOpinion = z.infer<typeof workOpinionSchema>;

// One opinions document per case; regional opinions keyed by region.
export const caseOpinionsSchema = z.object({
  regions: z.partialRecord(regionSchema, regionOpinionsSchema),
  work: workOpinionSchema.optional(),
});
export type CaseOpinions = z.infer<typeof caseOpinionsSchema>;

export const emptyRegionOpinions = (): RegionOpinions => ({ remainingCare: {}, causation: {} });

// What keeps the causation opinions incomplete for the region's supported diagnoses.
export function causationCheck(opinions: RegionOpinions, supportedDiagnoses: string[]) {
  const issues: string[] = [];
  const missing = supportedDiagnoses.filter((dx) => !opinions.causation[dx]);
  if (missing.length) issues.push("State causation for every supported diagnosis.");
  if (
    supportedDiagnoses.some(
      (dx) => opinions.causation[dx]?.relationship === "aggravated" && !opinions.causation[dx]?.aggravation
    )
  )
    issues.push("Say whether each aggravation is temporary or permanent.");
  return issues;
}

// What keeps the work status opinion incomplete.
export function workCheck(work: WorkOpinion | undefined) {
  if (!work) return ["Give a work status recommendation."];
  const issues: string[] = [];
  if (work.status === "modified_duty" && !work.restrictions.some((r) => r.trim()))
    issues.push("List the restrictions for modified duty.");
  if (work.status !== "full_duty" && !work.duration)
    issues.push("Say whether the work status is temporary or permanent.");
  return issues;
}

export const saveCaseOpinionsRequestSchema = z.object({
  opinions: caseOpinionsSchema,
  expectedRevision: z.number().int().nonnegative(),
});
export type SaveCaseOpinionsRequest = z.infer<typeof saveCaseOpinionsRequestSchema>;

// GET /cases/:caseId/opinions returns null until the first save.
export const caseOpinionsResponseSchema = z.object({
  id: z.number().int().positive(),
  caseId: z.number().int().positive(),
  opinions: caseOpinionsSchema,
  revision: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CaseOpinionsResponse = z.infer<typeof caseOpinionsResponseSchema>;

// Why a treatment is a remaining-care candidate for one diagnosis.
export type RemainingCareReason =
  | "not_exhausted"
  | "exhaustion_unclear"
  | "applicability_unclear"
  | "ongoing";

type ReviewedTreatment =
  PostExamInput["reviewedTreatmentAnalysis"]["treatments"][number];

function remainingCareReason(
  treatment: ReviewedTreatment,
  assessment: ReviewedTreatment["assessments"][number],
): RemainingCareReason | null {
  const applicability = assessment.applicability.value;
  if (applicability === "unclear") return "applicability_unclear";
  if (applicability !== "applicable") return null;
  const exhaustion = treatment.exhaustion.value;
  if (exhaustion === "not_exhausted") return "not_exhausted";
  if (exhaustion === "unclear") return "exhaustion_unclear";
  // Exhausted for improvement but still continuing: a maintenance question.
  return treatment.recordStatus === "Ongoing" ? "ongoing" : null;
}

// Deterministic remaining-care candidates from the reviewed treatments pass 4 used
// (physician-resolved values, pruned rows already gone, physician additions included):
// applicable treatments that are not exhausted or unclear, exhausted treatment that is
// still ongoing, and unclear applicability that needs the physician's call. Not-applicable
// and contraindicated assessments never make a row a candidate. The physician decides the
// disposition; exhaustion never decides care or MMI by itself.
export function remainingCareCandidates(
  reviewed: PostExamInput["reviewedTreatmentAnalysis"],
) {
  return reviewed.treatments.flatMap((treatment) => {
    const reasons = treatment.assessments.flatMap((assessment) => {
      const reason = remainingCareReason(treatment, assessment);
      return reason
        ? [
            {
              canonicalDx: assessment.canonicalDx,
              reason,
              rationale:
                reason === "applicability_unclear"
                  ? assessment.applicability.rationale
                  : treatment.exhaustion.rationale,
            },
          ]
        : [];
    });
    return reasons.length ? [{ treatment, reasons }] : [];
  });
}
export type RemainingCareCandidate = ReturnType<
  typeof remainingCareCandidates
>[number];

// MMI follows from remaining care: at MMI is impossible while care is curative, and
// not at MMI without curative care needs a stated reason. Returns the curative rows
// (cited as reasons when not at MMI) and what still keeps the opinion incomplete.
export function mmiCheck(
  opinions: RegionOpinions,
  candidates: RemainingCareCandidate[],
) {
  const decisionFor = (c: RemainingCareCandidate) =>
    opinions.remainingCare[c.treatment.id];
  const careDecided = candidates.every((c) => decisionFor(c));
  const curative = candidates.filter(
    (c) => decisionFor(c)?.disposition === "curative",
  );
  const mmi = opinions.mmi;
  const issues: string[] = [];
  if (!careDecided) issues.push("Decide remaining care first.");
  if (!mmi) issues.push("Choose an MMI status.");
  else if (mmi.status === "at_mmi") {
    if (curative.length)
      issues.push("At MMI contradicts remaining care marked curative.");
  } else {
    if (!curative.length && !mmi.note.trim())
      issues.push("No curative care is marked: say what is still expected to change.");
    if (!mmi.reevaluateIn) issues.push("Set the re-evaluation time frame.");
  }
  return { careDecided, curative, issues };
}
