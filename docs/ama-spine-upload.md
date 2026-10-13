# AMA spine upload draft

Updated 2026-10-13 with spine-specific nerve-root metadata. [Upload JSON](ama-spine.upload.json): **30 rows, 108 entries, 178 questions**, with a matching rule on every entry. All source entry IDs and impairment values are retained. The user resolved the three earlier placeholders as documented below. Read [the process walkthrough](ama-source-to-upload.md) for the scripted base rebuild followed by the LLM examination-task step and final validation/review. The current upload does not yet contain examination tasks. This file has not been imported into PostgreSQL; no application schema, migration, visit UI, or production rating engine was changed.

The user agreed to row-level deduplicated questions and complete matching rules on every entry. The repeated CH confirmation moves to the diagnosis-confirmation workflow. Its prerequisite remains: the physician confirms residual symptoms and a mechanism consistent with the diagnosis before rating that diagnosis. Specific claudication and infection history requirements remain explicit questions.

## File and proposed table

The JSON is a plain array of row objects. Each object maps directly to one proposed `ama_diagnostic_rows` record:

| Property / column | PostgreSQL type         | Meaning                                                       |
| ----------------- | ----------------------- | ------------------------------------------------------------- |
| `row_id`          | `text` primary key      | Guide row identity, such as `17-21-11`                        |
| `region_id`       | `text`                  | `cervical`, `thoracic`, or `lumbar`                           |
| `description`     | `text`                  | Row description                                               |
| `nerve_roots`     | `text[]` for spine rows | Covered nerve roots, such as `["L5"]`; `[]` for non-root rows |
| `help`            | nullable `text`         | Retained row introductions and trailing notes                 |
| `questions`       | `jsonb`                 | Questions asked once per row                                  |
| `entries`         | `jsonb`                 | Class/grade entries, impairment values, and complete rules    |
| `examination_tasks` | `jsonb`               | Preparation tasks and PE-question links, added by the LLM step |

For this initial table, row IDs address a single chosen Guides dataset. Confirm the release before production import; if several releases are retained, use `(reference_version_id, row_id)` as the key. Version selection belongs to the reference dataset, not repeated source metadata on each question.

The preferred mapping is an `ama_row_ids text[]` column on `canonical_diagnoses`, supplied by the offline taxonomy project and validated against the AMA dataset at import. This draft does not invent canonical diagnosis IDs or their mappings. Patient answers and selected entries are separate case data, not reference-row fields. The existing care-taxonomy importer does not yet accept this file.

`nerve_roots` is derived from the root-specific row descriptions. The T2-T12 row expands to eleven values, `T2` through `T12`; vertebral levels in fracture descriptions do not populate this field. Sixteen rows have roots and fourteen have `[]`. Spine queries can intersect these arrays with the patient's affected roots to narrow the canonical diagnosis's candidate rows, retaining non-root candidates for their own confirmation criteria. This metadata selects candidates; it does not establish that PE/CS criteria are met. Other body regions can omit the field and use their own selection rules.

## Question contract

Every question has `id`, `group`, `prompt`, and `type`. Optional `help` contains the actual qualifications for concise prompts. A `choice` question also has `options`, each with a stable `value`, a `label`, and optional `help`.

- `group: "PE"`: current examination findings; these are the questions exam preparation can retrieve.
- `group: "CS"`: physician-confirmed clinical studies or operative findings.
- `group: "diagnosis"`: row-specific history requirements retained from CH.
- `type: "boolean"`: an explicit `true` or `false` answer.
- `type: "choice"`: exactly one listed option value.

Missing answers or `null` mean unresolved, never `false`. `none` and `not_confirmed` are explicit completed answers, distinct from not assessed. Question IDs are local to a row; case answers must also be scoped to the selected diagnosis/component and applicable side/root.

Help containing a criterion must be available with its question, and confirmation must cover that criterion. Do not render six identical fracture prompts without their distinct fracture descriptions, or a generic instability prompt without its thresholds. Row help preserves combination/routing statements for review; those statements are not implemented as calculation rules by this file.

## Matching-rule contract

Each entry has only `entry_id`, `impairment: {value, unit}`, and `criteria`.

| Rule                                      | Meaning                                            |
| ----------------------------------------- | -------------------------------------------------- |
| `{"field":"pe_consistent","equals":true}` | Compare one answer with a literal value            |
| `{"all":[...]}`                           | Every child condition must be met                  |
| `{"any":[...]}`                           | At least one child condition must be met           |
| `{"at_least":4,"of":[...]}`               | At least four of the listed conditions must be met |

The user explicitly approved interpreting “N of the following” as **at least N** for this first draft. Count each top-level condition once. For example, a compound thigh-or-calf atrophy condition is one condition, even if both sites qualify. “All of the following” remains an AND group.

Keep three-valued evaluation: met, not met, unresolved. In an AND group, a false child fails the group; otherwise an unanswered child leaves it unresolved. In an OR group, a true child satisfies it; otherwise an unanswered child leaves it unresolved. For a count group, it is met when enough findings are true, not met when even all unanswered findings could not reach the count, and otherwise unresolved. Unresolved patient answers are valid; a missing/null reference-data entry rule is now rejected by the upload validator.

This file defines support for entries, not a production selection algorithm. A future descending class/grade selection must not silently skip an unresolved higher entry and select a lower one. Runtime diagnosis gating, combination, exclusion, and conversion behavior remain separate work.

## Concrete examples

**Lumbar fusion, `17-21-11`:** two questions: `pe_consistent` and `fusion_extent`. Both entries require `pe_consistent = true`. `single_level` selects 1A / 5% WPI; `multiple_levels` selects 1B / 9% WPI. `not_confirmed` satisfies neither entry.

```json
{
  "entry_id": "1B",
  "impairment": { "value": 9, "unit": "WPI" },
  "criteria": {
    "all": [
      { "field": "pe_consistent", "equals": true },
      { "field": "fusion_extent", "equals": "multiple_levels" }
    ]
  }
}
```

**C3 radiculopathy, `17-19-05`:** one sensory-choice question and one CS confirmation. Each entry requires CS confirmation. Residual symptoms without objective sensory loss, diminished pinprick with intact sharp/dull discrimination, and sharp/dull loss map respectively to 1A / 2%, 1B / 4%, and 1C / 5% WPI.

**L4 radiculopathy, `17-21-06`, 2A:** CS confirmation plus at least four of five conditions: sharp/dull loss, the specified neural-tension result, the specified 4/5 motor findings, the specified atrophy band, and the specified diminished reflex. Each distinct question is defined once, even when several entries reference it.

**Thoracic fracture, `17-20-05`:** the PE consistency question is shared. CS questions retain each distinct fracture criterion; entries use their own OR groups. A generic “imaging supports fracture” confirmation would lose the entry distinctions, so it is not substituted.

## Normalization choices

- Sensory categories become a single choice for each radiculopathy row. Compound motor and atrophy findings remain boolean confirmations with their complete wording. Different muscles or measurement sites can satisfy different compound conditions, so those have not been forced into one mutually exclusive severity choice.
- Radiculopathy CS alternatives are shown together in one physician-confirmed question. Each row's first CS block supplies the shared help; the reviewed differences among its later entries are wording/punctuation/reference variations, not different evidence pathways. The supplied opening electrodiagnostic qualification passage is included as help. Its deeper interpretation is not turned into an invented machine rule.
- The L5 1A CS list omits the “one of” label. This draft uses the same alternative interpretation as its other entries; the actual three alternatives are unchanged.
- Instability uses one confirmation containing the supplied region/level-specific criteria, including nested lumbar thresholds. The draft does not build a measurement calculator or infer omitted measurement protocols.
- Fracture questions explicitly ask for imaging or operative confirmation of the full condition. In the lumbar source, the shared confirmation wording appears inside the first alternative; the draft applies that evidentiary qualification to the alternatives as discussed during source review.
- Fusion and claudication use extent choices. For claudication, bilateral involvement belongs to the higher option even when at one level.
- Generic CH language is omitted. The infection-specific six-month/chronic-osteomyelitis requirement and full claudication history remain. Missing CH blocks in C5 3B and T1 2A are not filled with invented source text.
- Exact repeated conditions and presentation-only differences are deduplicated. The duplicated L5 SLR text differing by a stray closing parenthesis is one question. Clinical inequalities and numbers are not “corrected” to match neighboring entries.

The generic structural parser remains independent of body region. This normalization script deliberately recognizes the supplied spine row families and rejects unfamiliar ones. A future region can reuse the questions/entries contract with its own reviewed normalization rules; `nerve_roots` is specific to spine data.

## User-resolved source items

On 2026-10-12, the user supplied these decisions. All three entries now have matching rules. The original `.source.md` snapshots remain unchanged.

| Entry                    | Applied decision                                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cervical `17-19-08` / 1C | Correct C5 to C6 dermatome in the working Markdown, then reparse.                                                                                                                                                                                                                   |
| Lumbar `17-21-03` / 1A   | Correct L2 to L1 dermatome in the working Markdown, then reparse.                                                                                                                                                                                                                   |
| Lumbar `17-21-04` / 2B   | Leave “and/or paresthesias)” unchanged. Retain the full sensory sentence as a separate physician-confirmed PE question, `sensory_criterion_2b`, required alongside neural-tension, 3/5 motor, and CS findings. No automatic interpretation of the internal and/or wording is added. |

## Other source wording retained

Additional source features are retained literally for review, rather than treated as transcription fixes:

- L3 3B states **two of four**, whereas its preceding entries state three of four.
- C5 3A uses `>2 cm to <3 cm` and 3B uses `>3.0 cm`, leaving an atrophy boundary at exactly 3 cm. Other rows use `≤3 cm`. The draft preserves each wording.
- S1 2B says `>1.5 cm to 2 cm` without an explicit upper-bound inequality. Its full condition remains a physician-confirmed boolean; no numeric comparison was inferred.
- The C4 CS text routes a described prefixed-plexus situation to C5. The help retains that instruction; the future row-selection workflow must handle it. A CS confirmation is not an implementation of that routing.
- Upper-root EMG limitations and the general limb-muscle requirements remain as supplied. Their reconciliation and the detailed EMG standards are still a guidance review item, not an automatically validated evidence branch. See [the retained source](ama-electrodiagnostic-source.md).

## Regeneration and verification

Scripted base rebuild from original source snapshots, including cleanup, parsing, normalization, validation, and tests:

```sh
python3 -B scripts/build-ama-spine.py
```

Then run the [LLM examination-task prompt](ama-examination-tasks-prompt.md) to add `examination_tasks` directly to the upload, followed by final validation/review. Rebuilding the base overwrites those tasks, so repeat the LLM step after each rebuild. The current validator must be extended to accept/check the task field when implementing that step.

To repeat only the base normalization/validation stages, before LLM enrichment:

```sh
python3 -B scripts/normalize-ama-spine.py
python3 -B scripts/normalize-ama-spine.py --validate-only docs/ama-spine.upload.json
python3 -B -m unittest discover -s scripts -p test_normalize_ama_spine.py -v
```

The normalizer validates row and question identity, nerve-root metadata against row descriptions, allowed answer types and choice values, impairment values, nonempty logical groups, counts, complete entry rules, and every rule reference. Sixteen tests cover the source-to-parsed path, every source entry ID/value, deterministic output, single/grouped roots, non-root rows, invalid root metadata, the approved corrections, verbatim paresthesias wording, CS failure, missing answers, sensory selection, fusion extent, fracture alternatives, count boundaries, special history requirements, retained nested thresholds, and invalid references. The test evaluator is a small reference implementation, not app runtime code. The other source wording listed above remains as supplied.
