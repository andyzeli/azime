# Fix: duplicate treatment rows in the pre-exam analysis (3A)

Date: 2026-10-24

## Symptom

In the MMI tab, remaining care for case 1 lumbar listed NSAIDs, PT and activity
modification three times each (9 rows). Removing one of the three diagnoses did not
change it.

## Cause

The duplicates were already in the 3A output. Remaining care only lists what it is given:

```
3A treatmentAnalysis  →  pass 4 snapshot (reviewedTreatmentAnalysis)  →  remainingCareCandidates  →  MMI tab
```

The treatment ladder (`ladder_entries`) has **one entry per diagnosis × treatment**. A
treatment recommended for three diagnoses is three ladder entries. 3A sent those entries
to the model as `careStandards` unchanged, and the prompt said:

> For Every candidate from the supplied treatment taxonomy, create an entry …

So the model created one row per ladder entry. Case 1 lumbar had three diagnoses
(radiculopathy, disc herniation, myelopathy), so the stored analysis had 25 rows for 17
distinct treatments:

| treatmentId | rows |
|---|---|
| activity_modification_lumbar, pt_lumbar, nsaids_lumbar | 3 each |
| home_exercise_lumbar, manipulation_lumbar, microdiscectomy_lumbar, esi_transforaminal_lumbar | 2 each |

Every copy carried assessments for all three diagnoses, so nothing marked them as
duplicates. The output schema expects one row per treatment, with per-diagnosis
assessments inside it.

**Why removing a diagnosis didn't help:** remaining care reads the latest pass 4, which
reads the 3A analysis. That 3A had been run with all three diagnoses and was never re-run.
Re-running it before this fix would still have produced duplicates, because the input was
still one entry per diagnosis and treatment.

## Changes

### 1. The model gets one `careStandards` entry per treatment

`backend/src/ai/preExamAnalysisPrompt.ts`, `buildPreExamAnalysisUserPrompt`

Before, each ladder entry was passed through as-is:

```ts
const careStandards = ladder.map(({ adequacy, ...entry }) => ({
  ...entry,
  trialBenchmark: adequacy,
}));
```

```json
[
  { "id": "…", "region": "lumbar_spine", "canonicalDx": "lumbar_radiculopathy",   "treatmentId": "pt_lumbar", "treatment": "Physical therapy …", "category": "conservative", "aliases": [], "applicability": "…", "trialBenchmark": "…" },
  { "id": "…", "region": "lumbar_spine", "canonicalDx": "lumbar_disc_herniation", "treatmentId": "pt_lumbar", "treatment": "Physical therapy …", "category": "conservative", "aliases": [], "applicability": "…", "trialBenchmark": "…" },
  …
]
```

Now ladder entries are grouped by `treatmentId`. The shared fields appear once, and the
per-diagnosis fields (applicability guidance, trial benchmark) go in a `diagnoses` list:

```json
[
  {
    "treatmentId": "pt_lumbar",
    "treatment": "Physical therapy / supervised exercise therapy",
    "category": "conservative",
    "aliases": ["PT", "physiotherapy", "…"],
    "diagnoses": [
      { "canonicalDx": "lumbar_disc_herniation", "applicability": "…", "trialBenchmark": "…" },
      { "canonicalDx": "lumbar_radiculopathy",   "applicability": "…", "trialBenchmark": "…" }
    ]
  },
  …
]
```

The ladder entry `id` and `region` are no longer sent: the output never references them,
and the region is already stated in the system prompt. On case 1 lumbar, 29 ladder
entries became 17 treatments.

Only the prompt input changed. The stored snapshot (`inputSnapshot.ladder`) is still one
entry per diagnosis and treatment, so `ladderCategories`, the Analysis tab and the delta
run that read it are unaffected.

### 2. Prompt wording

Same file, `buildPEASystemPrompt`:

- `careStandards` is described as "one entry per treatment, listing for each diagnosis it
  applies to the applicability guidance and trial benchmark".
- Source rule 1 now reads: "For every careStandards treatment, create exactly one entry
  with source 'taxonomy' (never repeat a treatmentId) …"

### 3. A repeated treatment fails the run

`backend/src/ai/makePreExamAnalysis.ts`, after the existing check for unknown treatmentIds:

```ts
const taxonomyIds = payload.treatmentAnalysis.flatMap((t) => t.treatmentId ?? []);
const repeated = taxonomyIds.filter((id, i) => taxonomyIds.indexOf(id) !== i);
if (repeated.length > 0) {
  throw new Error(
    `${provider} pre-exam analysis repeated treatmentIds: ${[...new Set(repeated)].join(", ")}`
  );
}
```

A duplicate is a contract violation, so the run fails instead of being saved, the same way
an unknown treatmentId already fails. Rows with `treatmentId: null` (`ai` and
`record_only`) are not checked.

## Not changed

- **"Analyze diagnosis" (the delta run):** it sends only the new diagnosis's ladder, so each
  treatment appears once. `mergePreExamDelta` adds the new assessment to the existing row
  when that treatment already has a row, so it doesn't create duplicates.
- **Remaining care, pass 4 and the report input:** they were correct; they listed
  duplicates only because they were given duplicates.

## Verification

- Built the prompt from case 1's stored lumbar snapshot: 29 ladder entries became 17
  `careStandards` treatments, none repeated.
- Backend tests: all pass except `reportUnsupportedCare.test.mjs` test 4 ("historical care
  survives all report variants…"), which checks report prompt wording. It fails the same
  way without these changes.
- No real model run yet.

## Cleaning up existing data

Analyses that are already stored keep their duplicates until they are re-run. For
case 1:

1. `pnpm run build` in `backend`, then restart the backend.
2. Re-run 3A for lumbar. This resets that region's treatment review (steering is tied to
   one 3A run), so the review has to be redone.
3. Re-run the post-exam analysis (pass 4). Remaining care then lists each treatment once.
