import { wholePersonImpairment } from "./mmiSummary.js";
import {
  mmiRatingReportInputSchema,
  type ReportBaseInput,
} from "@azime/contracts";

import {
  careMarkedInappropriate,
  careMarkedExhausted,
  remainingMaintenanceCare,
} from "./treatments.js";
import { compactReportExamination } from "./examination.js";

// Dedicated projection for this report variant; shared sections remain unchanged.
export function buildMmiRatingInput(base: ReportBaseInput) {
  return mmiRatingReportInputSchema.parse({
    ...base,
    schemaVersion: "report-v5",
    examination: compactReportExamination(base.examination),
    variant: "mmi_rating",
    discussion: {
      ...base.discussion,
      recommended_work_status: base.discussion.work,
      regions: base.discussion.regions.map((r) => ({
        ...r,
        physicianDecisions: {
          ...r.physicianDecisions,
          mmi: {
            ...r.physicianDecisions.mmi,
            supporting_analysis: r.priorAnalysis.plateauEvidence,
          },
        },
        patient_subjective_trajectory: r.priorAnalysis.trajectory.subjective,
        patient_objective_trajectory: r.priorAnalysis.trajectory.objective,
        patient_functional_trajectory: r.priorAnalysis.trajectory.functional,
        care_marked_inappropriate: careMarkedInappropriate(r.treatments),
        care_marked_exhausted: careMarkedExhausted(r.treatments),
        remaining_maintenance_care: remainingMaintenanceCare(r.treatments),
      })),

      whole_person_impairment: wholePersonImpairment(base),
    },
  });
}
