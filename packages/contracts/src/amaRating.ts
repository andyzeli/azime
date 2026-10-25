import { z } from "zod";
import { amaNerveRootSchema } from "./amaReference.js";
import { regionSchema } from "./regions.js";

// Draft AMA rating for one region: one result per component (a diagnostic-row
// assessment or a class/modifier table selection). Not a combined regional value.

// Why a component is not rated: no supported diagnosis to rate. Its findings are kept.
export const amaNotRatedReasonSchema = z.enum([
  "unlinked",
  "diagnosis_not_supported",
]);
export type AmaNotRatedReason = z.infer<typeof amaNotRatedReasonSchema>;

// Why a rated component is 0% WPI. Both fall on the Guides' 0% rows (-00 no residual
// symptoms, -01 incongruent presentation); which one is not distinguished. The
// nonspecific-pain row (-02) is deliberately not used.
export const amaZeroReasonSchema = z.enum([
  "history_not_confirmed",
  "no_criteria_met",
]);
export type AmaZeroReason = z.infer<typeof amaZeroReasonSchema>;

const componentBase = {
  // Row or table description, for display.
  description: z.string(),
  // The eligible diagnoses when rated or pending; all linked diagnoses when not rated.
  canonicalDxIds: z.array(z.string()),
  status: z.enum(["rated", "unresolved", "pending_history", "not_rated"]),
  notRatedReason: amaNotRatedReasonSchema.nullable(),
  // Set only for a rated 0% that no class entry produced.
  zeroReason: amaZeroReasonSchema.nullable(),
  wpi: z.number().nullable(),
};

export const amaRowComponentSchema = z.object({
  ...componentBase,
  method: z.literal("diagnostic_row"),
  assessmentId: z.string(),
  rowId: z.string(),
  nerveRoot: amaNerveRootSchema.nullable(),
  side: z.enum(["left", "right"]).nullable(),
  entryId: z.string().nullable(),
  unresolvedQuestionIds: z.array(z.string()),
});
export type AmaRowComponent = z.infer<typeof amaRowComponentSchema>;

export const amaTableComponentSchema = z.object({
  ...componentBase,
  method: z.literal("class_modifier_table"),
  region: regionSchema,
  tableId: z.string(),
  classValue: z.number().nullable(),
  modOptionId: z.string().nullable(),
  missingAnswers: z.array(z.enum(["classValue", "modOptionId"])),
});
export type AmaTableComponent = z.infer<typeof amaTableComponentSchema>;

export const amaRegionRatingSchema = z.object({
  region: regionSchema,
  components: z.array(
    z.discriminatedUnion("method", [amaRowComponentSchema, amaTableComponentSchema])
  ),
});
export type AmaRegionRating = z.infer<typeof amaRegionRatingSchema>;

// Regional combination is null when retained components are pending, a combining
// rule is missing, or nothing is eligible. Subsumed components do not block it.
export const amaRegionRatingResponseSchema = amaRegionRatingSchema.extend({
  // Explains why no complete combined value is available.
  combinationIssues: z.array(z.string()).default([]),
  combined: z
    .object({ wpi: z.number(), rationale: z.array(z.string()) })
    .nullable(),
});
export type AmaRegionRatingResponse = z.infer<typeof amaRegionRatingResponseSchema>;
