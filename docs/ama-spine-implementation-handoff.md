# AMA spine implementation handoff

2026-10-13. **Base reference data is finished; LLM examination-task enrichment and application integration remain.** This is the current plan for the next implementation chat; it supersedes conflicting suggestions in the older design notes.

Build one AMA reference table, retrieve candidate rows from canonical diagnoses, and render their questions in Exam prep / Visit. **Store physician answers in the existing visit JSON**, with one assessment per clinical component. Evaluate the supplied rules deterministically in the backend.

## 1. Import the AMA reference data

Input: [ama-spine.upload.json](ama-spine.upload.json), a plain array containing **30 rows, 108 entries, 178 questions**. Questions are already deduplicated within each row. Sixteen rows have `nerve_roots`; fourteen have `[]`. T2–T12 is expanded into eleven roots. Before import, complete the offline [LLM examination-task step](ama-examination-tasks-prompt.md), which adds `examination_tasks` directly to this file, then validate/review the result. The current upload does not yet contain tasks.

Add `AmaDiagnosticRows` (`ama_diagnostic_rows`) to [schema.ts](../backend/src/db/schema.ts) and generate a migration:

| Column        | Type                           |
| ------------- | ------------------------------ |
| `row_id`      | `text PRIMARY KEY`             |
| `region_id`   | `text NOT NULL`                |
| `description` | `text NOT NULL`                |
| `nerve_roots` | `text[] NOT NULL DEFAULT '{}'` |
| `help`        | nullable `text`                |
| `questions`   | `jsonb NOT NULL`               |
| `entries`     | `jsonb NOT NULL`               |
| `examination_tasks` | `jsonb NOT NULL`          |

Normalize regions **during import**: `cervical → cervical_spine`, `thoracic → thoracic_spine`, `lumbar → lumbar_spine`, matching application/canonical region IDs. Keep the generated file unchanged. `nerve_roots` is spine-specific; future non-spine uploads can omit it and use the empty default.

Create a dedicated importer under `backend/src/db/referenceData/` with `--validate-only` and a file-path argument. Validate the entire file before writing: unique IDs, question types/options, recursive rule structure and references, roots, impairment values, and examination tasks/PE links. Convert missing `help` to SQL null; preserve question/entry/task JSON. Import in one transaction, upserting by `row_id`, without deleting unrelated reference data. The existing treatment-taxonomy importer does **not** support AMA rows.

Suggested command sequence from repository root, **after implementing the importer/package script**:

```sh
# Extend the existing validator to accept/check examination_tasks first
python3 -B scripts/normalize-ama-spine.py --validate-only docs/ama-spine.upload.json
# Existing migration commands, after adding the schema
pnpm --filter backend generate
pnpm --filter backend migrate
# Proposed script to add: build backend, then run the dedicated importer
pnpm --filter backend ama:import --validate-only ../docs/ama-spine.upload.json
pnpm --filter backend ama:import ../docs/ama-spine.upload.json
```

Use the intended database for both migration and import; the current Drizzle configuration points to local `azime`, while reference imports use `DATABASE_URL`. Verify 30/108/178 after import. Start with one chosen Guides dataset; an updated release must not silently replace rules used by existing assessments. No per-question hashes or source-line metadata are needed.

## 2. Dashboard → candidate-row query

```text
Analysis: selected canonical diagnoses for the region
    → canonical_diagnoses.ama_row_ids
    → AMA rows, narrowed by affected roots when known
    → Exam prep: PE checklist
    → Visit: diagnosis/row confirmation + PE/CS answers
    → backend: supported entry per assessment
    → post-exam snapshot/report input
```

Assume canonical diagnoses expose `ama_row_ids`. Use the diagnosis scope selected in Analysis, not every diagnosis mentioned anywhere in the records. Today that scope is `preExam.inputSnapshot.scope.diagnoses`; generated Exam prep carries it in `refined.inputSnapshot.input.scope.diagnoses`.

Implement one reusable query, exposed through a proposed read-only `POST /cases/:caseId/ama-candidates/:region`. Accept diagnosis IDs and optional roots per diagnosis so the Visit can preview unsaved root changes. Validate them against the case's current regional scope. Return distinct full row objects plus the candidate row IDs for each diagnosis.

For **each diagnosis**, retrieve rows where:

```text
row_id belongs to that diagnosis's ama_row_ids
AND region_id matches the current region
AND (nerve_roots is empty OR affectedRoots is unknown
     OR nerve_roots overlaps affectedRoots)
```

`affectedRoots: null` means unknown: keep all mapped root rows as provisional candidates and prompt for roots. `[]` means explicitly no affected roots: retain only non-root candidates. Neither state establishes eligibility. An empty canonical mapping means “No mapped AMA row,” not 0% impairment.

Roots belong to the patient/visit, not the canonical taxonomy. Reuse explicitly documented roots when available, then have the physician confirm them; otherwise ask directly. Do not infer the root solely from a vertebral/disc level. No new AI pass is necessary for v1.

## 3. Exam prep and Visit behavior

**Exam prep:** add an “AMA examination findings” panel using the candidate rows' `examination_tasks`, authored by the offline LLM step. Display each task ID once while retaining all originating row/question references. Different root distributions or procedures remain distinct tasks. This is a deterministic lookup alongside existing AI-generated priorities; the Visit forms and rating rules continue to use `questions` and `entries`.

**Visit:** extend the existing diagnosis-confirmation card. Confirm the canonical diagnosis, residual symptoms and a mechanism consistent with it, and affected roots where relevant. If that history prerequisite fails, stop rating that diagnosis; do not automatically substitute a zero-impairment row. Keep the existing diagnosis-rejection / stale-prep behavior.

Show applicable AMA rows as check-all-that-apply candidates, even when usually only one remains. Selecting a row opens its complete form:

- **PE:** findings from today's examination. Render Boolean questions as Yes / No / Unanswered and choices as the supplied options. An unchecked checkbox must not silently mean No.
- **CS:** for root rows, one confirmation that **at least one listed alternative** qualifies, with imaging, EMG, and operative alternatives available. Show essential qualifications beside the control; longer EMG guidance can expand. No AI study qualification or separate EMG questionnaire in v1.
- **Other rows:** retain the supplied fracture conditions, fusion/claudication extent choices, instability thresholds, and `group: "diagnosis"` history questions. Do not replace these with a universal “imaging supports diagnosis” Boolean.

For conditions mapped to radiculopathy rows, retain the actual canonical diagnosis and apply the selected root row's unchanged questions/rules. Do not require an additional separately extracted radiculopathy diagnosis. Root selection alone does not answer any PE or CS question.

## 4. Answer storage: extend the existing visit JSON

Use `case_visit_documentation.documentation`, its existing save endpoint, and `expectedRevision` concurrency checks. **No separate case-answer table for v1.** Define the structure in [visitDocumentation.ts](../packages/contracts/src/visitDocumentation.ts).

Extend each existing `diagnosisReviews` item with `amaHistoryConfirmed: boolean | null` (covers both residual symptoms and consistent mechanism) and `affectedRoots: string[] | null`, both defaulting to null for old visits. Preserve its existing status and `refinedUpdatedAt`. Add `amaAssessments`, defaulting to `[]`:

```json
{
  "amaAssessments": [
    {
      "id": "5d22abfa-32aa-48f1-aacc-030507e6fd6e",
      "region": "lumbar_spine",
      "canonicalDxIds": ["lumbar_disc_herniation"],
      "rowId": "17-21-07",
      "nerveRoot": "L5",
      "side": "left",
      "answers": {
        "sensory_status": "diminished_pinprick",
        "cs_confirmed": true,
        "neural_tension": null
      }
    }
  ]
}
```

This is an incomplete-answer example, not a completed rating. Values are `boolean | string | null`; strings must match the question's option values. Missing and null mean unresolved. Explicit `false`, `none`, and `not_confirmed` are completed negative answers.

An assessment represents a **row + actual root + side**, linked to one or more diagnoses. Store one actual root even for the shared T2–T12 row. Use separate left/right root assessments for bilateral findings; use null root/side for non-root rows when irrelevant. Ask for unresolved laterality before finalizing a lateralized component. Preserve row-defined bilateral choices such as claudication instead of splitting those arbitrarily.

Question IDs are local: `answers.cs_confirmed` belongs only to this assessment. If herniation and stenosis refer to the same clinical root/side component, associate both with one assessment instead of collecting duplicate answers or creating duplicate impairment components. Do not automatically share findings across different roots, sides, or rows.

On save, validate answers against their reference row, root/side scope, and linked diagnoses. On diagnosis/root changes, flag affected assessments for review and exclude them from current results until reconciled; retain their answers. Regenerated prep must not erase visit answers or silently renew an earlier confirmation.

## 5. Deterministic evaluation and downstream use

Implement a small evaluator for `field/equals`, `all`, `any`, and `at_least/of`. Return **met / not met / unresolved**, with the responsible question IDs. “N of” means **at least N**, as already approved. Count each compound condition once; do not infer that a stronger finding satisfies a differently worded weaker condition.

For `all`, one false child fails; otherwise any unknown leaves it unresolved. For `any`, one true child succeeds; otherwise any unknown leaves it unresolved. A count succeeds when enough children are true, fails when true plus unknown cannot reach the threshold, and is otherwise unresolved.

Evaluate entries within each selected row in descending numeric class, then descending grade (for example, 3B → 3A → 2B → 2A → 1C). Select the first met entry **only when every higher entry is not met**. An unresolved higher entry blocks a definitive lower selection. All entries not met means “No supported entry,” not zero. Keep diagnosis/history/root confirmation as prerequisites outside the entry rules; there is no reference-row `eligibility` field.

Return entry ID, its exact impairment value/unit, and unresolved questions. Draft results can be recomputed; the client does not supply an authoritative percentage. A proposed `POST /cases/:caseId/ama-evaluate/:region` can preview the draft, using the same validation/evaluator as saved data.

Extend the existing post-exam snapshot builder to freeze relevant confirmed diagnoses, assessments/answers, the reference rows used, and computed results. It currently does not pass these AMA data through. This preserves the exact wording/rules behind a result without adding metadata to every question. Later answer/scope changes require a new snapshot and review of dependent results.

These are **component results**, not a final combined WPI. Final rating approval/MMI and combination, overlap, exclusions, and caps remain separate work. In particular, do not sum multiple selected roots or rows. Preserve all help, including the C4→C5 routing exception, and surface exceptions for physician review rather than claiming root filtering implements them.

## 6. Implementation order and checks

1. Complete the offline LLM step and validate/review its tasks. Add reference contracts/table/migration and dedicated importer, then import the enriched upload.
2. Add candidate lookup and the deterministic evaluator, then shared visit answer contracts/save validation.
3. Add the Exam prep checklist and Visit forms to the current `/p_cases/$caseId` dashboard. Wire queries in `frontend/azimeclient/src/routes/cases/queries.ts`; update `tabs/exam-prep.lazy.tsx` and `tabs/visit.lazy.tsx` under `routes/p_cases/p_case/`.
4. Extend `backend/src/queries/postExamInputQueries.ts`, `backend/src/ai/postExamInputSnapshot.ts`, and their contracts to capture the structured results. If changing downstream AI behavior, review its prompt and output schema together; the model consumes results, not invents rating rules.

Acceptance checks: region conversion; L5 lookup; unknown versus no roots; T2–T12 lookup; retained non-root candidates; duplicate diagnoses sharing one component; separate sides; correct question/help rendering; answer round-trip with revision conflict; invalid IDs/choices rejected; unresolved higher entry blocking a lower match; count boundaries; scope changes requiring review; snapshot reproducibility.

Reference-rule examples already exist in [test_normalize_ama_spine.py](../scripts/test_normalize_ama_spine.py). The scripted base rebuild (`python3 -B scripts/build-ama-spine.py`) passes 16 tests; port relevant cases to the runtime evaluator. Repeat the LLM step after rebuilding the base file. See [the upload contract](ama-spine-upload.md) for exact schemas/clinical wording exceptions and [the source walkthrough](ama-source-to-upload.md) for the full workflow.
