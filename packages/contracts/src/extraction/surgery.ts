import { z } from "zod";
import {
  diagnosisSchema,
  procedureItemSchema,
} from "./shared.js";

export const surgerySchema = z.object({
  preOpDiagnoses: z
    .array(diagnosisSchema)
    .describe(
      "Pre-operative or pre-procedure diagnoses/indications. Look for headers like: 'Pre-Op Diagnosis', 'Preoperative Indication', 'Pre-Procedure Impression', or 'Indication for Surgery'.",
    ),

  postOpDiagnoses: z
    .array(diagnosisSchema)
    .describe(
      "Post-operative or post-procedure diagnoses recorded after the procedure. Look for headers like: 'Post-Op Diagnosis', 'Postoperative Impression', or 'Post-Procedure Diagnosis'.",
    ),

  proceduresPerformed: z
    .array(procedureItemSchema)
    .describe(
      "List of all surgical procedures or operations completed during this session. Look for: 'Procedure(s) Performed', 'Title of Operation', 'Surgeries Completed', or 'Interventions'.",
    ),

  implantsAndHardware: z
    .array(z.string())
    .describe(
      "Any hardware, implants, grafts, screws, cages, or prosthetics placed during the procedure (e.g., '2x 4.5mm pedicle screws at L4', 'PEEK interbody cage', 'Allograft matrix'). If none, return an empty array.",
    ),

  operativeFindings: z
    .string()
    .describe(
      "Direct intraoperative findings, anatomical conditions observed during surgery, or pathological findings (e.g., 'Large central disc herniation at L5-S1 compressing the S1 nerve root with surrounding severe scar tissue').",
    ),

  complications: z
    .string()
    .describe(
      "Any unexpected events or complications noted during or immediately after the procedure (e.g., 'Dural tear repaired primarily with 6-0 Prolene', 'Excessive bleeding'). If no complications occurred or were noted, return 'None'.",
    ),

  postOpPlanAndRestrictions: z
    .string()
    .describe(
      "Post-procedure instructions, immediate discharge plan, or post-surgical physical restrictions (e.g., 'Non-weight bearing on Right Lower Extremity for 6 weeks', 'Wear TLSO brace when ambulating', 'Follow up in 10-14 days for suture removal'). Crucial for tracking the recovery trajectory for MMI.",
    ),
});
