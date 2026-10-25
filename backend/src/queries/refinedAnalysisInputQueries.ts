import { eq } from "drizzle-orm";
import type { Region, RefinedAnalysisInputSnapshot } from "@azime/contracts";
import { db } from "../db/index.js";
import { PatientCase } from "../db/schema.js";
import { buildRefinedAnalysisInputSnapshot } from "../ai/refinedAnalysisInputSnapshot.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { getStoredCaseSummary } from "./caseSummaryQueries.js";
import { getPhysicianSteering } from "./physicianSteeringQueries.js";
import { getStoredPreExamAnalysis } from "./preExamAnalysisQueries.js";
import { getRegionDiagnosisList } from "./regionDiagnosesQueries.js";

export async function getRefinedAnalysisInput(
  caseId: number,
  region: Region
): Promise<RefinedAnalysisInputSnapshot> {
  const [patientCase, caseSummary, preExam, steering, diagnoses] = await Promise.all([
    db.query.PatientCase.findFirst({
      columns: {
        caseType: true,
        injuryType: true,
        dateOfInjury: true,
        regions: true,
      },
      where: eq(PatientCase.id, caseId),
    }),
    getStoredCaseSummary(caseId),
    getStoredPreExamAnalysis(caseId, region),
    getPhysicianSteering(caseId, region),
    getRegionDiagnosisList(caseId, region),
  ]);

  if (!patientCase?.regions.includes(region)) {
    throw new MissingPrerequisiteError("Region is not in scope for this case");
  }
  if (!caseSummary) {
    throw new MissingPrerequisiteError(
      "Generate the case summary before taking a refined analysis snapshot"
    );
  }
  if (!preExam?.analysis || !preExam.inputSnapshot) {
    throw new MissingPrerequisiteError(
      "Generate the regional pre-exam analysis before taking a refined analysis snapshot"
    );
  }
  if (!steering) {
    throw new MissingPrerequisiteError(
      "Save the treatment review before creating the prep sheet"
    );
  }

  return buildRefinedAnalysisInputSnapshot({
    caseContext: {
      caseType: patientCase.caseType,
      injuryType: patientCase.injuryType,
      dateOfInjury: patientCase.dateOfInjury,
    },
    scope: preExam.inputSnapshot.scope,
    diagnoses,
    caseSummary,
    preExam: {
      id: preExam.id,
      updatedAt: preExam.updatedAt.toISOString(),
      analysis: preExam.analysis,
      ladder: preExam.inputSnapshot.ladder,
    },
    steering,
  });
}
