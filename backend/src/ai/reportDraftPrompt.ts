import {
  reportInputSchema,
  type ReportInput,
  type ReportVariant,
} from "@azime/contracts";
import { mmiRatingSystemPrompt } from "./reportPrompts/mmiRating.js";
import { mmiNoRatingSystemPrompt } from "./reportPrompts/mmiNoRating.js";
import { notAllMmiRatingSystemPrompt } from "./reportPrompts/notAllMmiRating.js";
import { notAllMmiNoRatingSystemPrompt } from "./reportPrompts/notAllMmiNoRating.js";

const systemPrompts: Record<ReportVariant, string> = {
  mmi_rating: mmiRatingSystemPrompt,
  mmi_no_rating: mmiNoRatingSystemPrompt,
  not_all_mmi_rating: notAllMmiRatingSystemPrompt,
  not_all_mmi_no_rating: notAllMmiNoRatingSystemPrompt,
};

export const buildReportDraftUserPrompt = (input: ReportInput) => {
  const draftInput = reportInputSchema.parse(input);
  return `Draft the IME report from this input:\n\n${JSON.stringify(draftInput)}`;
};

// Dry run and generation use this same validated input/prompt pairing.
export function buildReportDraftRequest(input: ReportInput) {
  const validated = reportInputSchema.parse(input);
  return {
    variant: validated.variant,
    input: validated,
    systemPrompt: systemPrompts[validated.variant],
    userPrompt: buildReportDraftUserPrompt(validated),
  };
}
