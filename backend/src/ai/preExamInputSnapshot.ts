import type { Region } from "@azime/contracts";
import type { DocumentExtractionArtifact } from "../queries/caseArtifactQueries.js";
import type { CompletedStudy } from "../queries/completedStudies.js";
import type { LadderContextEntry } from "../queries/ladderEntries.js";
import type { MedicationHistoryEntry } from "../queries/medicationHistory.js";
import type { TreatmentEpisode } from "../queries/treatmentEpisodes.js";
import type { WorkStatusHistoryEntry } from "../queries/workStatusHistory.js";

export type PreExamInputSnapshot = {
  scope: {
    region: Region;
    diagnoses: string[];
  };
  ladder: LadderContextEntry[];
  treatmentEpisodes: TreatmentEpisode[];
  currentMedications: MedicationHistoryEntry[];
  completedStudies: CompletedStudy[];
  workStatusHistory: WorkStatusHistoryEntry[];
  supportingRecords: DocumentExtractionArtifact[];
};

export type PreExamAnalysisInput = Omit<PreExamInputSnapshot, "ladder"> & {
  ladder: Array<Omit<LadderContextEntry, "sources">>;
};
