import { mmiStatusByRegion } from "./mmiSummary.js";
import {
  notAllMmiNoRatingReportInputSchema,
  type ReportBaseInput,
} from "@azime/contracts";

import {
  careMarkedInappropriate,
  careMarkedExhausted,
  remainingMaintenanceCare,
  remainingCurativeCare,
} from "./treatments.js";
import { compactReportExamination } from "./examination.js";

// Dedicated projection for this report variant; shared sections remain unchanged.
export function buildNotAllMmiNoRatingInput(base: ReportBaseInput) {
  return notAllMmiNoRatingReportInputSchema.parse({
    ...base,
    schemaVersion: "report-v5",
    examination: compactReportExamination(base.examination),
    variant: "not_all_mmi_no_rating",
    discussion: {
      ...base.discussion,
      mmi_status_by_region: mmiStatusByRegion(base),
      recommended_work_status: base.discussion.work,
      regions: base.discussion.regions.map((r) => {
        const { impairment: _, ...physicianDecisions } = r.physicianDecisions;
        return {
          ...r,
          patient_subjective_trajectory: r.priorAnalysis.trajectory.subjective,
          patient_objective_trajectory: r.priorAnalysis.trajectory.objective,
          patient_functional_trajectory: r.priorAnalysis.trajectory.functional,
          physicianDecisions: {
            ...physicianDecisions,
            mmi: {
              ...physicianDecisions.mmi,
              supporting_analysis: r.priorAnalysis.plateauEvidence,
            },
          },
          care_marked_inappropriate: careMarkedInappropriate(r.treatments),
          care_marked_exhausted: careMarkedExhausted(r.treatments),
          remaining_maintenance_care: remainingMaintenanceCare(r.treatments),
          ...(r.physicianDecisions.mmi.status === "not_at_mmi"
            ? { remaining_curative_care: remainingCurativeCare(r.treatments) }
            : {}),
        };
      }),
    },
  });
}
