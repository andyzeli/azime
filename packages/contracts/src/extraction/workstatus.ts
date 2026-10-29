import { z } from "zod";
import { strfield } from "./shared.js";

export const workStatusReportSchema = z.object({
  // reportDate: strfield.describe(
  //   "The date of the work status report, if explicitly stated in the record.",
  // ),
  restrictions: z
    .array(z.string())
    .describe(
      "Itemized list of explicit physical restrictions (e.g., 'No lifting > 10 lbs', 'No bending/stooping', 'Must sit 15 mins every hour').",
    ),
  status: z
    .enum(["full_duty", "modified_duty", "off_work", "unknown"])
    .describe("category of work status most applicable"),
  effectiveFrom: strfield
    .optional()
    .describe("Start date of accomodation, as YYYY-MM-DD"),
  effectiveThrough: strfield
    .optional()
    .describe("End date of accomodation, as YYYY-MM-DD"),
});
