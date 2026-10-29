# Finish line: remaining work

Status as of 2026-10-23. The pipeline is done end to end (Records → Summary → Analysis → Visit → MMI → Report). Next is UI polish. Check items off as they are done or dropped.

## Done recently (for reference)

- Report tab: builder, readiness, Generate (one Markdown call per variant prompt), review with out-of-date and fact check. "Inspect report input" shows the exact prompts without drafting.
- Report readiness blocks when diagnoses, treatment review, visit or case summary changed since the post-exam analysis ran.
- Referral questions: entered on the intake page (`/cases/$caseId`, below Records), stored on `patientcase.referral_questions`, sent to the drafter in the report input; each variant prompt ends with an addendum that restates and answers them.
- Combining: CVC formula with per-region caps in `backend/src/ama/combineImpairment.ts`; no rounding (intermediate or final).
- L2 reference row (17-21-04): class 2B uses `sensory_status = sharp_dull_loss` like L3/L4. The Guides cell's "and/or paresthesias)" is a copy error from the femoral stretch cell (note the unmatched parenthesis), so symptoms alone do not meet 2B. Final. Generator (`scripts/normalize-ama-spine.py`), `spine.json` and the database agree.

## 1. Leftovers (small cleanup)

- [ ] Remove the Visit tab "Saved visit JSON (debug)" panel (`visit.lazy.tsx`).
- [ ] AMA reference data is not fully repeatable: `examination_tasks` in `spine.json` came from a one-off local AI pass. Move them into a reviewed overlay file keyed by `row_id`, merge it in `normalize-ama-spine.py` (fail when a task references a missing question id), so `build-ama-spine.py` emits exactly what is imported. Then fix `backend/reference-data/ama-rows/README.md` (still says `spine.json` is a copy of the deleted `docs/ama-spine.upload.json`).

## 2. Still open: decide for v1

- [x] Past care for not-supported diagnoses reaches the report. Report input reads matching 3A + physician review directly and groups recorded treatments assessed for an unsupported diagnosis, regardless of that assessment's applicability, with no applicable supported diagnosis, under `care_for_unsupported_diagnoses`. Includes treatment name and the unchanged In Records status/detail; pass 4 stays supported-only. This history does not itself establish inappropriate or unnecessary care.
- [x] MMI tab questions not built: past treatment necessity (q11) and compliance (q8); q15, q6, q9, q10. Some may now be covered by referral questions.
- [x] Save the rating-table class and modifier from the Visit, so myelopathy tables get rated (`visit.amaTableSelections`; reaches MMI and report input as WPI, without class/modifier labels; OK for v1). For v2 integrate Chapter 13
- [ ] Exam date is the visit's `createdAt`. Use the appointment date (TODO in `contracts/postExamAnalysis.ts`).
- [x] Confirm WPI is never rounded (combining returns e.g. 7.375), or decide where to round.
- [ ] Patient name in the report intro.
- [x] Rename applicability "applicable" to "appropriate" (contracts, AI schemas, UI labels)?
- [ ] Optional: `reportFactCheck` checks every referral question appears in the draft.

## 3. Verify with real data

- [ ] Case 1 after the exhaustion change: review, 3B, pass 4, remaining care, report regenerated. While doing it, check the prompts:
  - 3A (Gemini 2.5 Flash): untried rows all said "not attempted, therefore not exhausted" (`preExamAnalysisPrompt.ts:42` may now cover it), and SCS / surgery / functional restoration were applicable while the rationale said "not yet indicated" (not addressed).
  - Drafter (`ai/reportPrompts/*`): the first draft was a data dump and wrote "Not documented". If it still does, add a rule to leave out missing information.
- [ ] Opinions tab (was MMI) clicked through with real saves: remaining care, MMI decision, impairment.
- [ ] Case 1 AMA history question answered in Visit, real rating checked.
- [ ] Referral questions: saved on the intake page, answered in a generated report.

## 4. Polish (next)

- [ ] Phase 4: Assessment tab UI.
- [ ] Interface style for the selectors (remaining care, MMI).
- [ ] Shell tab meta and status values are still mock data (`mockCaseQueryOptions` in `p_case.lazy.tsx`).
- [ ] Open question: should remaining care follow Analysis live, or stay tied to the latest pass 4 (current)?
- [ ] Visit dictation (TODO stub in `visit.lazy.tsx`).
- [ ] Old intake cockpit panels (`cases/case/components/cockpit/*Panel.tsx`) and `mockups/`: kept as debug views; decide what stays.
- [ ] Keep `docs/pipeline-detail.md` in sync.
- [ ] Dark mode toggle (later): plan and decisions in `docs/dark-mode-plan.md`. Not started.
