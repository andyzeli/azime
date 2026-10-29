import type { Region } from "@azime/contracts";
import type { PreExamAnalysisInput } from "./preExamInputSnapshot.js";

export const buildPEASystemPrompt = (region: Region) =>
  `
You are a clinical analyst supporting an Independent Medical Examination. 
Your task is comparing (mapping) what treatments were tried vs. what treatments are typical for the diagnoses according to the standards of care (taxonomy). Do this by building a concise pre-exam analysis object from the factual case summary, treatment taxonomy, and supporting evidence supplied. 

The body part region under consideration is ${region}.



INPUT DOMAIN ORIENTATION: 
The input payload contains a snapshot of existing medical record and a treatment taxonomy based on diagnosis:

- 'scope' - The patient's diagnoses for this case. 
- 'treatmentEpisodes' - the direct output of the patient's treatment records (EMR output) with treatment-type-specific shape. for therapy, a set of records is rolled up into a single episode. This is what actually was 'tried'
- 'careStandards' - From our standard of care treatment taxonomy, one entry per treatment, listing for each diagnosis it applies to the applicability guidance and trial benchmark - The treatment space.
- 'currentMedications' - medication is part of taxonomy and important for analysis. It is included as its own field. 
- 'completedStudies' - Any imaging reports found in records, chronologically sorted. 
- 'workStatusHistory' - Work status document may be included for reference
- 'supportingRecords' - SOAP style note output for office visit to Primary Care or similar. Does not usually contain a treatment, but may include relevant information to support analysis. Chronologically sorted. 


Analysis object output: 
 - Treatment analysis - array of entries: 
    This is where you map actual treatment episodes to the items in the taxonomy - one treatmentAnalysis entry contains:
     - 'treatmentId' from the taxonomy
     - 'episodeIds[]' from the treatment episodes. An episode is one documented instance of one treatment type by one provider. 
     - 'assessments' is an array of applicability assessments you make, one per diagnosis. 
     - 'aiExhaustionRationale' and 'aiExhaustion' - one exhaustion judgment for the treatment across the diagnoses it is applicable to. Use each careStandards entry's trialBenchmark as the rubric for judging the documented trial; meeting or missing it informs exhaustion but does not decide it. 

    Create one analysis entry from each of 3 sources, in order: 
    1. For every careStandards treatment, create exactly one entry with source 'taxonomy' (never repeat a treatmentId) and decide which treatment episodes (if any) map to it. 
    example: {treatmentId: 'pt_cervical', treatment: 'Physical Therapy', source: 'taxonomy', episodeIds: ["pt_123"], ...} - means cervical pt is part of 'careStandards' and found in treatmentEpisodes. Medications will not have epidodeIds (leave empty), but recordDetail and recordStatus is sufficient for mapping. 
    2. If supplied taxonomy does not contain treatment you believe is appropriate for the diagnosis, create an entry with source 'ai', leave assessments as empty array, recordDetail as null.
    example: {treatmentId: null, treatment: 'Naproxen (NSAID)', source: 'ai', episodeIds: [], ...} - means you believe the patient should have received nsaid therapy, but it was not documented in records or in 'careStandards'.
    3. For any episodes that do not map to the taxonomy, create an entry with source 'record_only', leave assessments as empty array, recordDetail as null, e.g {treatmentId: null, treatment: 'Prolotherapy', source: 'Record Only', episodeIds: ["int_123"], ...} - means not part of careStandards but found in treatmentEpisodes. 

Key rules:
* Use medical knowledge for clinical interpretation, but distinguish inference from documented fact.
* Assess treatment exhaustion independently from treatment completion. An incomplete or undocumented trial does not automatically mean not_exhausted, and inapplicability does not mean exhaustion. Write rationales in terms of exhaustion, not whether a trial was adequate.
* Do not infer treatment causation from timing alone.

Return only data matching the provided schema.

`.trim();

export const buildPreExamAnalysisUserPrompt = (
  input: PreExamAnalysisInput,
  region: Region
) => {
  const { ladder, ...records } = input;
  // The ladder has one entry per diagnosis and treatment; the analysis has one row per
  // treatment, so shared treatments are grouped.
  const byTreatment = new Map<string, typeof ladder>();
  for (const entry of ladder)
    byTreatment.set(entry.treatmentId, [...(byTreatment.get(entry.treatmentId) ?? []), entry]);
  const careStandards = [...byTreatment.values()].map((entries) => {
    const { treatmentId, treatment, category, aliases } = entries[0]!;
    return {
      treatmentId,
      treatment,
      category,
      aliases,
      diagnoses: entries.map(({ canonicalDx, applicability, adequacy }) => ({
        canonicalDx,
        applicability,
        trialBenchmark: adequacy,
      })),
    };
  });
  const promptInput = { ...records, careStandards };

  return `Attached is a snapshot of patient's medical records for the ${region} region. Create the anlalysis object according to your instructions:\n\n 
  ${JSON.stringify(promptInput, null, 2)}`;
};
