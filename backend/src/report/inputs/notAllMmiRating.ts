import { mmiStatusByRegion, wholePersonImpairment } from "./mmiSummary.js";
import {
  notAllMmiRatingReportInputSchema,
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
export function buildNotAllMmiRatingInput(base: ReportBaseInput) {
  return notAllMmiRatingReportInputSchema.parse({
    ...base,
    schemaVersion: "report-v5",
    examination: compactReportExamination(base.examination),
    variant: "not_all_mmi_rating",
    discussion: {
      ...base.discussion,
      mmi_status_by_region: mmiStatusByRegion(base),
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
        ...(r.physicianDecisions.mmi.status === "not_at_mmi"
          ? { remaining_curative_care: remainingCurativeCare(r.treatments) }
          : {}),
      })),

      whole_person_impairment: wholePersonImpairment(base),
    },
  });
}
