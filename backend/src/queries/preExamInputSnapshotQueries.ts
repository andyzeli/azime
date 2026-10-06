import type { Region } from "@azime/contracts";
import { eq } from "drizzle-orm";
import type { PreExamInputSnapshot } from "../ai/preExamInputSnapshot.js";
import { db } from "../db/index.js";
import { PatientCase } from "../db/schema.js";
import type { DocumentExtractionArtifacts } from "./caseArtifactQueries.js";
import { getCanonicalDiagnoses } from "./canonicalDiagnosesQueries.js";
import { getCompletedStudies } from "./completedStudies.js";
import { getDxSupport } from "./dxSupport.js";
import { getLadderEntries } from "./ladderEntries.js";
import { getMedicationHistory } from "./medicationHistory.js";
import { buildTreatmentEpisodes } from "./treatmentEpisodes.js";
import { getWorkStatusHistory } from "./workStatusHistory.js";

// Every diagnosis found in the region's records; the snapshot scope is a subset.
export const getRegionDiagnoses = async (caseId: number, region: Region) =>
  (await getDxSupport(caseId))
    .filter((diagnosis) => diagnosis.region === region)
    .map((s) => s.canonicalDx);

export const getPreExamInputSnapshot = async (
  caseId: number,
  region: Region,
  extractionArtifacts: DocumentExtractionArtifacts,
  selectedDiagnoses?: string[],
): Promise<PreExamInputSnapshot | null> => {
  const patientCase = await db.query.PatientCase.findFirst({
    columns: { regions: true },
    where: eq(PatientCase.id, caseId),
  });

  if (!patientCase?.regions.includes(region)) {
    return null;
  }

  const [currentMedications, completedStudies, workStatusHistory, diagnosesInRegion] =
    await Promise.all([
      getMedicationHistory(caseId),
      getCompletedStudies(caseId),
      getWorkStatusHistory(caseId),
      getRegionDiagnoses(caseId, region),
    ]);

  // Physicians may add any canonical diagnosis for the region, not only ones in the records.
  const allowed = new Set([
    ...diagnosesInRegion,
    ...(await getCanonicalDiagnoses(region)).map((d) => d.canonicalDx),
  ]);
  const diagnoses =
    selectedDiagnoses === undefined
      ? diagnosesInRegion
      : selectedDiagnoses.filter((diagnosis) => allowed.has(diagnosis));
  const ladder = await getLadderEntries(region, diagnoses);

  return {
    scope: { region, diagnoses },
    ladder,
    treatmentEpisodes: buildTreatmentEpisodes(extractionArtifacts, region),
    currentMedications,
    completedStudies,
    workStatusHistory,
    supportingRecords: extractionArtifacts.filter(
      (record) =>
        record.documentType === "encounter" &&
        record.provider?.discipline !== "Chiropractic",
    ),
  };
};
