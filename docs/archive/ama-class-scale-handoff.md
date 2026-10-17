# AMA class-scale: next implementation

Connect the uploaded CNS tables to Exam Prep and Visit. The candidate endpoint and a basic class/MOD selector already exist.

## Build next

1. **Use a hard-coded v1 rule:** confirmed `cervical_myelopathy`, `thoracic_myelopathy`, or `lumbar_myelopathy` enables table-based rating. Extend the existing candidate endpoint to return the uploaded CNS tables for these diagnoses. This flow should not depend on canonical diagnosis-to-table mappings.
2. **Exam Prep:** add a `!` beside the matching diagnosis pill in the AMA examination heading. Its tooltip should explain that the diagnosis requires table-based rating. In the component body, add a multiple-table selector, similar to the existing affected-roots control. The physician chooses which tables apply.
3. **Visit:** use the selected tables for the existing two-question workflow: class 0–4 → MOD A/B/C → WPI. Display each table’s instructions and option text. Changing class clears MOD; unanswered is distinct from `0% WPI`.
4. **Finish integration:** handle loading, errors and empty results. Keep selections available between Exam Prep and Visit in local UI state. Preserve existing diagnostic-row behavior and case/region scope checks.

**Out of scope:** class-scale Visit JSON persistence and report integration (step 5).

## Where to work

| Area | Starting files |
| --- | --- |
| Uploaded data | [cnstables.json](../backend/reference-data/ama-rating-tables/cnstables.json) — 10 definitions, including separate dominant/nondominant upper-extremity tables |
| Endpoint | `POST /cases/:caseId/ama-candidates/:region`; [amaCandidatesQueries.ts](../backend/src/queries/amaCandidatesQueries.ts), [candidates.ts](../backend/src/ama/candidates.ts) |
| Exam Prep | [AmaExamTasks.tsx](../frontend/azimeclient/src/routes/p_cases/p_case/components/AmaExamTasks.tsx) |
| Visit | [AmaClassScaleSelector.tsx](../frontend/azimeclient/src/routes/p_cases/p_case/components/AmaClassScaleSelector.tsx), [visit.lazy.tsx](../frontend/azimeclient/src/routes/p_cases/p_case/tabs/visit.lazy.tsx) |
| Client query | [queries.ts](../frontend/azimeclient/src/routes/cases/queries.ts): `amaCandidatesQueryOptions` |
| Contract and lookup | [amaRatingTables.ts](../packages/contracts/src/amaRatingTables.ts), [candidate types](../packages/contracts/src/amaReference.ts) |

The endpoint already returns `candidateTableIds` per diagnosis and full definitions in `ratingTables`. Results use `{ class_value, mod_option_id, wpi }`.

## Done when

A confirmed Myelopathy diagnosis shows the Exam Prep alert; the physician selects tables, opens Visit, chooses class/MOD and sees the matching WPI. Check multiple selections, `0% WPI`, diagnosis removal, switching cases, query failures and unaffected spine-row behavior.

```sh
pnpm --filter backend test:ama-tables
pnpm --filter backend test:ama-reference
pnpm --filter azimeclient exec tsc -b
```
