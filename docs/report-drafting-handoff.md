# Report drafting handoff

Updated 2026-10-23. This records the decisions from the report-input simplification chat and the next work. Read alongside current code; older plans in `finish-line-todo.md` and `report-input-fixes.md` contain stale design details. Do not treat their case-type split or original report-tab status as current.

## Working principles

- Input assembly is deterministic querying and projection of captured data. No additional AI pass to compact, reconcile, or infer clinical decisions.
- Preserve physician decisions and supplied rationales. Do not implement a large clinical contradiction rules engine for v1 or silently reconcile inconsistent testing data.
- Keep applicability rationale paired with each diagnosis. Do not match functionally equivalent strings or deduplicate the new remaining-care rationale arrays.
- Report should read as cohesive prose, loosely following `docs/ime-report.md`, rather than dumping input fields. Explicit referral questions are answered in the same drafting pass, in the Addendum.
- Small, explicit changes. The user reviews JSON through Inspect report input, which copies pretty JSON to clipboard. Generate draft performs the actual model call.

## Current flow and files

- `backend/src/queries/reportInputQueries.ts`: `_getReportInput` retained as legacy comparison; `getReportInput` assembles the current base input and selects its variant. Readiness checks run before generation.
- `backend/src/report/input.ts`: internal base mapping, still containing the full treatment rows and priorAnalysis used to produce the final projections.
- `backend/src/report/inputs/`: four variant projections plus examination, treatment and MMI summary helpers.
- `packages/contracts/src/report.ts`: input validation/types, saved-report compatibility, report fact checks. Active input currently uses `report-v5`; multiple iterative changes have occurred under that version. Do not assume an arbitrary saved v5 snapshot has today's shape.
- `backend/src/ai/reportPrompts/`: four self-contained system prompts.
- `backend/src/ai/reportDraftPrompt.ts`: selects prompt and serializes input for dry run and generation.
- `backend/src/ai/makeReportDraft.ts`, report controller and report queries: actual draft generation/persistence.
- `frontend/azimeclient/src/routes/p_cases/p_case/tabs/report.lazy.tsx`: builder preview, input inspection, generation, and draft display.
- `docs/ex-input.json`, `ex-4.json`, and other examples are manually updated snapshots, not stable test fixtures or necessarily today's schema.

## Implemented final input shape

- Four variants: `mmi_rating`, `mmi_no_rating`, `not_all_mmi_rating`, `not_all_mmi_no_rating`. Split by rating requested, not work-comp vs PI. These are alternative calls, not four sequential passes.
- `examination.questionnaires_completed`: name, question_description, total_score (percentage string), answers with question and formatted score. No invented Function/Mood grouping. Completion date included only when different from exam date.
- AMA findings flattened into `lumbar_spine_findings`, `cervical_spine_findings`, `thoracic_spine_findings` as applicable. Root, side, test/result pairs; non-root assessments retain a finding label.
- Per-region trajectories: `patient_subjective_trajectory`, `patient_objective_trajectory`, `patient_functional_trajectory`; selected evidence lives in `physicianDecisions.mmi.supporting_analysis`. No final `priorAnalysis` wrapper or regional `plateauEvidence` field.
- `discussion.recommended_work_status` replaces final `work`. Historical work-status data is separate.
- Per-region care sections replace the old final `treatments` block, now removed from all four outputs and preview:
  - `care_marked_inappropriate`: reviewed exclusions or physician not_recommended decision, diagnosis attribution, decision_basis, inappropriateness_rationale.
  - `care_marked_exhausted`: exhausted treatment, applicable diagnoses_addressed, exhaustion_rationale.
  - `remaining_curative_care`: only for non-MMI regions in either not_all_mmi variant.
  - `remaining_maintenance_care`: available in all variants.
- Remaining-care entries contain treatment, category, documentedHistory, applicability_rationales (one diagnosis/rationale entry each; explicit applicability for uncertain/contraindicated entries), exhaustion_status and exhaustion_rationale.
- Removed physician_note from remaining care: the underlying disposition note only exists for not_recommended decisions. That reason is already in care_marked_inappropriate. It was not the analysis steering-row note.
- Exhausted care can also be maintenance care. Sections can overlap; prompts tell writer to avoid repeating the narrative. Preserve exhausted/unclear statuses without relabeling them not_exhausted.

## MMI and whole-person impairment

- `discussion.mmi_status_by_region`: region-to-status mapping, present only in not_all_mmi variants.
- `discussion.whole_person_impairment`: rating-requested variants only; fields scope, included_regions, excluded_regions, percentage. No calculation trace.
- Regional `physicianDecisions.impairment` contains only `{ wpi }` or null in rating variants. No components, entryId, or rationale. No-rating variants omit regional and whole-person impairment; examination findings remain.
- Scope is all_regions if every region is at MMI; otherwise mmi_regions_only.
- Any non-MMI region selects a not_all_mmi variant. The prompt explicitly handles each region independently; this does not mean every region is non-MMI.
- WPI includes only MMI regions. A single region can supply WPI; multiple rated regions use the existing combination calculation. No eligible regions yields null, never an invented zero. An eligible region with pending rating also prevents a completed combined value.
- Mixed-MMI WPI must not be presented as a final rating covering all regions.
- Old final wholePerson wrapper removed. Internal base/legacy structures remain for assembly and historical readers.

## Latest user updates and next decisions

### Explicit referral questions — WIRED

- Questions are entered elsewhere and stored in patientcase.referral_questions (text[] in the schema).
- `referralQuestions` reaches the frozen input and the actual model call: `buildReportDraftUserPrompt` now validates and serializes the full input with compact JSON.
- User chose same-pass answers. Current prompts request an Addendum restating and answering the supplied questions.
- Inspect report input shows system prompt, compact user prompt, and readable JSON with character counts; clipboard JSON remains formatted.
- Verify actual question coverage and unsupported-question handling during real draft testing.

### Visit-note headings carry source meaning — IMPLEMENTED in prompts

- User specifically states imaging in the visit note's Objective section means the physician personally reviewed DICOM images.
- All four prompts now instruct the writer to respect the note's headings and attribution: Subjective is patient report, Objective is physician findings/observations; Objective imaging is personal DICOM review under this app's convention.
- Distinguish physician review from radiology reports and records summaries. Do not infer personal review from records summaries or add findings absent from the note.
- Additional heading conventions should be supplied by the user; do not invent them.

## Validation and known follow-up work

- Latest observed frontend type check passed after separating generation and inspection (2026-10-23). Earlier unused-import failures in CaseDetail.tsx are not a current known blocker. Contracts/backend build passed on the preceding input changes. A fresh full-suite/full-build result is not claimed.
- `node --test backend/tests/reportMmiSummary.test.mjs backend/tests/reportTreatmentSections.test.mjs`: 18 passed, including all four variants, mixed MMI, single and multiple regions, no eligible MMI regions, and absence of the final treatments block.
- Older `reportVariants.test.mjs` has known stale fixture assumptions: it reads docs/ex-input.json as an older shape, but that file was replaced by a v5 example. It also has assertions for subsequently renamed fields. Do not claim the entire test suite passes. Refresh these tests using stable fixtures when doing test maintenance.
- Validate real generated drafts next: heading attribution, concise synthesis, no repetitive rationale dumps, correct regional MMI and partial WPI wording, referral-question coverage.
- Consider explicit versioning/backward compatibility for earlier v5 snapshots before production use; this chat has been iterating the input schema in place.
- Many unrelated staged/unstaged/untracked changes exist in this shared repository. Preserve them; do not reset or commit all files indiscriminately.

## Post-exam unresolved questions removed (2026-10-22)

- Decision: remove the separate post-exam unresolvedQuestions schema output and MMI-screen list. No replacement field, physician adjudication box, or new report pass.
- Preparation questions before the visit remain unchanged.
- Existing trajectory, plateau evidence, and MMI-posture reasoning still explain material conflicting or insufficient evidence when it affects the assessment. The prompt now explicitly places those limitations in that existing reasoning rather than generating questions or tasks.
- Older stored analyses can still be read: schema parsing discards the retired extra field. No database rewrite or regeneration is required just to remove the list.
- The earlier discussion of cannot_determine MMI and a physician clarification box was exploratory, not approved for implementation. Neither has been added by this change.

## Prompt and terminology decisions

- Prefer short explanations of where data lives, its source, and its clinical meaning. Avoid a giant glossary of self-evident keys, repeated rules, or instructions recounting alternatives rejected in this chat.
- The user is actively editing all four prompt files. Read their current contents before editing; preserve those changes. `shared.md` is temporary explanatory prose, not an imported runtime prompt.
- The rating has already been calculated. The writer states the supplied regional WPI and briefly references regional objective findings; detailed calculations and components remain internal.
- Keep applicability terminology and enums in the taxonomy/upload pipeline. The production physician steering label now reads "Not appropriate or applicable" for not_applicable. Contraindicated remains a separate option. Mockup labels may differ.
- Exhaustion definition already covers no further meaningful additional improvement, whether treatment succeeded or failed. Do not change the enum or definition just for this distinction. Ongoing exhausted treatments remain candidates for physician maintenance decisions.
- care_marked_inappropriate includes non-applicability/appropriateness, contraindication, and physician rejection. The decision_basis and rationale explain which. Do not automatically equate every exclusion with past medical non-necessity.

## Generation and inspection actions (2026-10-23)

The Report tab now offers Generate draft (Regenerate draft when a prior draft exists) and a separate Inspect report input action. Inspection retains formatted JSON clipboard copying and prompt character counts and no longer hides the latest draft. Both paths use the shared prompt/input builder. Generation errors are displayed in the footer.

## Start here in a new chat

1. Read this handoff and AGENTS.md. For wider product context read docs/product-overview.md and docs/application-pipeline.md; consult docs/pipeline-detail.md for implementation context.
2. Read the current runtime prompt, contract, and corresponding input projection together before changing report behavior.
3. Focus next on real end-to-end drafts and UI fixes, not further speculative pipeline redesign. Cover all four variants, a mixed-MMI case, questions with and without supporting opinions, and a generation failure/retry.
4. Review wording, question coverage, physician-image attribution, exact supplied ratings/dates, and maintenance recommendations. Refresh stale tests/fixtures and settle handling of obsolete development drafts before production.

No model drafting call was made as part of the generation-button wiring verification. Successful real end-to-end report generation still needs to be established through testing. No additional pipeline feature is known to be approved and outstanding from this chat.
