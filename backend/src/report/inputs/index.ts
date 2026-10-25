import {
  reportInputSchema,
  selectReportVariant,
  type ReportBaseInput,
  type ReportInput,
} from "@azime/contracts";
import { buildMmiRatingInput } from "./mmiRating.js";
import { buildMmiNoRatingInput } from "./mmiNoRating.js";
import { buildNotAllMmiRatingInput } from "./notAllMmiRating.js";
import { buildNotAllMmiNoRatingInput } from "./notAllMmiNoRating.js";

// Select from physician decisions, never case type or the number of regions.
export function buildReportVariantInput(base: ReportBaseInput): ReportInput {
  const allAtMmi = base.discussion.regions.every(
    (r) => r.physicianDecisions.mmi.status === "at_mmi",
  );
  const variant = selectReportVariant(allAtMmi, base.intro.impairmentRequested);
  const builders = {
    mmi_rating: buildMmiRatingInput,
    mmi_no_rating: buildMmiNoRatingInput,
    not_all_mmi_rating: buildNotAllMmiRatingInput,
    not_all_mmi_no_rating: buildNotAllMmiNoRatingInput,
  };
  return reportInputSchema.parse(builders[variant](base));
}
