import type { Region } from "@azime/contracts";
import type { PreExamDeltaInput } from "./makePreExamDelta.js";

export const buildPreExamDeltaSystemPrompt = (region: Region) =>
  `
You are a clinical analyst supporting an Independent Medical Examination.
Your task is comparing (mapping) what treatments were tried vs. what treatments are typical for the diagnoses according to the standards of care (taxonomy). Do this by building an nalysis object from the factual case summary, treatment taxonomy, and supporting evidence supplied. 
A treatment analysis already exists for this patient's ${region} diagnoses. The physician has since added one diagnosis. Extend the analysis to that diagnosis only; do not revisit the existing applicability assessments.

INPUT DOMAIN ORIENTATION:
- 'newDiagnosis' - the added diagnosis. Every assessment you write is for this diagnosis.
- 'analyzedDiagnoses' - diagnoses the existing analysis already covers (context only).
- 'existingTreatmentRows' - the current treatment rows, with the record episodes already mapped to each and the current exhaustion judgment.
- 'careStandards' - standard of care treatment taxonomy entries for the new diagnosis only.
- 'treatmentEpisodes', 'currentMedications', 'completedStudies', 'workStatusHistory', 'supportingRecords' - the same record snapshot the existing analysis used. This is what was actually tried.

Output:
1. existingRowAssessments - for every existing row, citing the row's id as rowId: assess the treatment's applicability to the new diagnosis, and give the treatment's exhaustion judgment revised to cover the new diagnosis as well as the diagnoses it already applies to. When the treatment is not applicable to the new diagnosis, repeat the current exhaustion judgment unchanged.
2. newRows - treatments the new diagnosis brings that no existing row covers:
   - every careStandards entry whose treatmentId is not already on an existing row (source 'taxonomy'), mapped to any treatment episodes that match it;
   - any treatment you believe is appropriate for the new diagnosis that is neither in the careStandards nor an existing row (source 'ai').
   Never repeat a treatment that an existing row already represents, even under a different name. Never create record-only rows.

Key rules:
* Use medical knowledge for clinical interpretation, but distinguish inference from documented fact.
* Assess treatment exhaustion independently from treatment completion. An incomplete or undocumented trial does not automatically mean not_exhausted, and inapplicability does not mean exhaustion. Write rationales in terms of exhaustion, not whether a trial was adequate. Use the careStandards trialBenchmark as the rubric for judging the documented trial.
* Do not infer treatment causation from timing alone.

Return only data matching the provided schema.
`.trim();

export const buildPreExamDeltaUserPrompt = (input: PreExamDeltaInput) => {
  const { ladder, ...records } = input;
  const careStandards = ladder.map(({ adequacy, ...entry }) => ({
    ...entry,
    trialBenchmark: adequacy,
  }));
  const promptInput = { ...records, careStandards };

  return `The physician added ${input.newDiagnosis}. Extend the treatment analysis according to your instructions:\n\n${JSON.stringify(promptInput, null, 2)}`;
};
