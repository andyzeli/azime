Implement treatment-level exhaustion, replacing diagnosis-level adequacy throughout the workflow.

1. Keep taxonomy adequacy criteria as input. They remain the rubric for evaluating the documented trial. Do not rename or remove them.
2. Update 3A’s output, prompt, and .describe() fields:
   {
   // Existing treatment fields...
   assessments: Array<{
   canonicalDx: string;
   aiApplicability: Applicability;
   aiApplicabilityRationale: string;
   }>;
   aiExhaustion: "exhausted" | "not_exhausted" | "unclear";
   aiExhaustionRationale: string;
   }
   Assess exhaustion once per treatment across its applicable diagnoses:
   - exhausted: further use is unlikely to provide meaningful additional improvement.
   - not_exhausted: a relevant, feasible opportunity remains insufficiently explored.
   - unclear: evidence cannot establish either conclusion.
     Inadequate or undocumented treatment does not automatically mean not_exhausted. Inapplicability does not mean exhaustion. Explain meaningful diagnosis-specific differences in the single rationale.
3. Update physician steering and the Analysis tab. Keep applicability agreement/override per diagnosis. Move exhaustion agreement/override to the treatment row. Update physician-added treatments, validation, initialization, and the pure review resolver. Display one exhaustion control and rationale per treatment.
4. Update the diagnosis-addition/delta flow. New diagnoses add applicability assessments and may change the treatment-level exhaustion judgment. Update delta schemas, prompts, and merge logic; invalidate affected physician exhaustion reviews rather than silently carrying them forward.
5. Update Refined Analysis and pass 4 inputs.
   - Full reviewed treatment rows contain diagnosis-specific applicability plus one effective exhaustion judgment.
   - 3B receives detailed issues where applicability is unclear, or an applicable treatment is not_exhausted/unclear.
   - Applicable, exhausted treatments become compact context.
   - Preserve physician notes and existing pruning behavior.
   - Update both passes’ prompts/descriptions to use exhaustion consistently.
6. Update MMI / Remaining Care. Replace adequacy-based candidate selection in opinions.ts and the MMI UI. Surface applicable not_exhausted/unclear treatments and unclear applicability for physician review. Preserve ongoing exhausted treatment as a possible maintenance-care question. Exhaustion must not automatically determine care disposition or MMI.
7. Update report drafting. Change report contracts, input assembly, preview, and prompt to provide one exhaustion assessment/rationale per treatment, alongside diagnosis-specific applicability. Preserve the physician’s remaining-care and MMI decisions separately.
8. Reset existing development data and update supporting files. Delete affected generated analyses, physician steering, and downstream artifacts that depend on the old shape. Regenerate through the updated pipeline. Update fixtures, examples, docs, and relevant tests. No data migration, compatibility schemas, or special stale handling for this change.
