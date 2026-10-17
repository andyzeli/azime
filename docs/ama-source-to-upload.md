# AMA spine: from source rows to the upload file

Updated 2026-10-13. This is the step-by-step account of how we built the data, which files matter, and how to repeat the process.

**Current result:** [ama-spine.upload.json](ama-spine.upload.json) contains **30 diagnosis rows, 108 class/grade entries, and 178 questions**. Every entry has a matching rule. Every spine row also has `nerve_roots`: sixteen root-specific rows have populated arrays; fourteen other rows have `[]`. The scripted base build and 16 tests pass. Complete the LLM examination-task step below before import; the current upload does not yet contain tasks. The PostgreSQL table and importer have not been implemented or run.

```text
Original AMA source Markdown
    ↓ reviewed cleanup and corrections
Working Markdown
    ↓ structural parser
Parsed JSON: CH / PE / CS text and lists
    ↓ spine normalization generator
Upload JSON: questions + entries with matching rules
    ↓ LLM step using ama-examination-tasks-prompt.md
Same upload JSON, with examination_tasks added
    ↓ final validation and review
Ready-to-upload file
```

## 1. Preserve the original supplied text

The starting files are:

- [Cervical source](ama-rows-cervical.source.md)
- [Thoracic source](ama-rows-thoracic.source.md)
- [Lumbar source](ama-rows-lumbar.source.md)

These `.source.md` files are retained unchanged. They contain the original row headings, entry percentages, CH/PE/CS prose, links, and occasional formatting or wording errors.

## 2. Prepare working Markdown

Originally, we made these cleanup changes with one-off scripts and targeted edits. They are now recorded in `prepare_source()` in [build-ama-spine.py](../scripts/build-ama-spine.py), so starting from the original sources reproduces them.

It writes [cervical](ama-rows-cervical.md), [thoracic](ama-rows-thoracic.md), and [lumbar](ama-rows-lumbar.md) working copies and applies these specific changes:

| Change                                                                   | Purpose                                                                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Remove Markdown link destinations while retaining their text             | Keep section references and citation labels without URLs; 77 cervical, 15 thoracic, and 1 lumbar link |
| Add the missing space in cervical C4 and thoracic T1 `class1B` headings  | Make entry headings consistent                                                                        |
| Flatten the malformed lumbar L5 3B PE list into four sibling conditions  | Preserve the intended top-level count                                                                 |
| Put lumbar fracture 1A/1B CS alternatives into properly indented bullets | Make all alternatives explicit                                                                        |
| Add explicit WPI units to the two lumbar claudication headers            | Apply the previously reviewed table-wide unit; percentages remain 2 and 4                             |
| Correct cervical C6 1C's `C5 dermatome` to `C6 dermatome`                | User-approved correction on 2026-10-12                                                                |
| Correct lumbar L1 1A's `L2 dermatome` to `L1 dermatome`                  | User-approved correction on 2026-10-12                                                                |

The L2 2B wording ending in **“and/or paresthesias)” is left unchanged**, as requested. Missing CH/PE blocks are not filled with invented text.

These are explicit fixes for the supplied files. If a future source changes so a targeted correction no longer matches, the build stops for review instead of guessing.

## 3. Extract the structure into parsed JSON

[parse-ama-rows.py](../scripts/parse-ama-rows.py) reads each working Markdown file and creates:

- [Cervical parsed JSON](ama-rows-cervical.parsed.json): 13 rows / 46 entries.
- [Thoracic parsed JSON](ama-rows-thoracic.parsed.json): 6 rows / 17 entries.
- [Lumbar parsed JSON](ama-rows-lumbar.parsed.json): 11 rows / 45 entries.

This stage recognizes row IDs/descriptions, entry IDs/percentages, CH/PE/CS sections, list instructions, nested bullets, and introductory/trailing paragraphs. It preserves missing sections as null and checks internally that all input text was accounted for.

It does **not** decide which questions to ask or how a clinical condition should be interpreted. For example, it stores “four of the following” as a stated count. The later normalization stage turns that into an “at least four” rule using the decision we made together.

The structural parser has no spine-specific clinical logic. It can read other body regions when their Markdown uses this format.

## 4. Generate questions and entry rules

`normalize_rows()` in [normalize-ama-spine.py](../scripts/normalize-ama-spine.py) reads all three parsed files and writes the combined [upload JSON](ama-spine.upload.json).

I manually designed the normalization rules; the script applies them deterministically. This stage recognizes the supplied spine row families. It does not call an AI model when run.

Each output row contains:

| Field                                | What it holds                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `row_id`, `region_id`, `description` | The diagnosis-row identity and name                                                            |
| `nerve_roots`                        | Spine-specific roots parsed from the description, with T2-T12 expanded; `[]` for non-root rows |
| `questions`                          | The questions defined once for that row                                                        |
| `entries`                            | Each class/grade, its impairment value/unit, and its complete matching rule                    |
| Optional `help`                      | Row-level explanatory text retained from the source                                            |

Each question has an `id`, a physician-facing `prompt`, a `group` (`PE`, `CS`, or `diagnosis`), and a `type` (`boolean` or `choice`). Choice options have a stored `value` and displayed `label`. Question/option `help` holds fuller descriptions and qualifications. Essential conditions should be visible with the control; longer reference guidance can be expandable.

The decisions implemented here are:

1. **Move repeated CH confirmation upstream.** The physician confirms residual symptoms and a consistent mechanism when confirming the diagnosis. Infection and claudication retain their additional history requirements as explicit questions.
2. **Define each question once per row.** Entries refer to question IDs. There is no separate `eligibility` field; every entry contains its complete matching rule.
3. **Use one sensory choice where findings are mutually exclusive.** Keep compound motor/atrophy conditions as confirmations with their full wording, so different sites are not incorrectly forced into one answer.
4. **Use a shared CS confirmation for radiculopathy.** The row's permitted imaging, EMG, and operative alternatives are included. The supplied EMG qualification passage is included as help; the physician confirms the requirements.
5. **Keep CS distinctions that affect class/grade.** Fracture findings remain separate conditions; fusion and claudication use extent choices. Instability uses a confirmation with the region-specific thresholds and nested requirements shown.
6. **Translate the logical groups.** “All” becomes `all`; alternatives become `any`; “N of the following” becomes `at_least: N`, as approved. Missing answers remain unresolved rather than becoming false.
7. **Preserve L2 2B's special wording.** `sensory_criterion_2b` is a separate PE confirmation with the original sentence in its help. The generator does not drop the paresthesias clause or infer an extra machine-readable OR branch. This confirmation, the neural-tension finding, the 3/5 motor finding, and CS confirmation are all required for that entry.

For example, lumbar fusion/arthroplasty (`17-21-11`) has two questions: PE consistency and confirmed fusion extent. Its 1B rule is:

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

The two dermatome corrections and preserved L2 wording replace the previous three null-rule placeholders. **All 108 entries now have complete rules.** Other source wording, such as L3 3B's unusual “two of four,” is retained as supplied; see [the detailed review notes](ama-spine-upload.md).

## 5. Check the scripted base build

The scripted base rebuild command, run from the repository root, is:

```sh
python3 -B scripts/build-ama-spine.py
```

It recreates the working Markdown, reparses all three files, generates the base upload JSON, validates it, and runs the tests. It overwrites those generated outputs, including any previously added examination tasks; it never writes to the original `.source.md` snapshots. Fix base parsing/normalization in the scripts. After a rebuild, repeat the LLM step below.

The checks cover:

- Source → working Markdown → parsed JSON matches the generated files.
- All 30 row identities and 108 entry IDs/impairment values survive normalization.
- Every rule refers to a defined question and valid answer value; all entries have non-null rules.
- C6/L1 corrected dermatome text reaches the final questions and the entries match example answers.
- The L2 paresthesias sentence survives unchanged and its separate confirmation is actually required.
- Four-of-five accepts four or five findings, but not three; unanswered findings remain unresolved when they could affect the result.
- Fusion, fracture, sensory, special-history, CS-failure, and instability examples behave as specified.
- Regeneration reproduces the same JSON.

The scripted run passed **16 tests**. The parser still prints five previously reviewed fracture-list formatting notices and four informational notes about missing source sections. Their text is retained correctly; these are not failed tests or null final entry rules.

To run only the base normalization/validation stages, before LLM enrichment:

```sh
python3 -B scripts/normalize-ama-spine.py
python3 -B scripts/normalize-ama-spine.py --validate-only docs/ama-spine.upload.json
python3 -B -m unittest discover -s scripts -p test_normalize_ama_spine.py -v
```

## 6. LLM step: add examination tasks

Run one offline LLM pass using [ama-examination-tasks-prompt.md](ama-examination-tasks-prompt.md). It reads the normalized `ama-spine.upload.json` and adds `examination_tasks` directly to each row in that file. All existing questions, rules, roots, and impairment values stay unchanged.

The LLM turns related PE grading questions into preparation tasks and gives identical tasks shared IDs for checklist deduplication. Tasks link back to their row's PE question IDs. No separate task-mapping file or deterministic task-generation logic is needed.

## 7. Validate, review, and upload

Validate task structure, shared-ID consistency, and PE-question coverage, and verify that removing the new field leaves the base data unchanged. Extend the existing validator to accept/check this new field when implementing the LLM step; the current validator covers the base format only. Review the task wording against its linked questions. The enriched `ama-spine.upload.json` is then the upload artifact.

The workflow includes this LLM step every time the base file is rebuilt. It is an offline data-preparation step, not an AI call during patient visits.

## What happens after this file

The proposed `ama_diagnostic_rows` table stores identity/description/row help in ordinary columns, spine `nerve_roots` as `text[]`, and `questions`/`entries`/`examination_tasks` in JSONB columns. Other body regions can omit nerve-root metadata. The existing treatment-taxonomy importer does not yet import this file.

Our preferred canonical-diagnosis mapping is an `ama_row_ids text[]` column on `canonical_diagnoses`, supplied by the offline taxonomy project. Its import must check that referenced AMA row IDs exist. The column, mappings, AMA table/importer, and application queries/UI remain separate implementation steps; rebuilding this file does not perform them.

Keep [this walkthrough](ama-source-to-upload.md) as the process overview and [ama-spine-upload.md](ama-spine-upload.md) as the detailed data contract.

ama*diagnostic_rows reference: questions (criteria), examination_tasks (tests → question_ids), entries (rules)
│ POST /ama-candidates/:region rows mapped from the Analysis dx scope
▼
Visit tab (draft)
Diagnoses card → confirm dx, history Yes/No, pick root + side
→ amaAssessments[] { rowId, nerveRoot, side, canonicalDxIds }
AMA findings → per assessment, the physician records FINDINGS:
motorGrades { taskId: "4" } → derives motor*_ (amaMotorAnswers)
atrophyCm { taskId: 1.8 } → derives atrophy_ (amaAtrophyAnswers)
answers { questionId: value } → SLR, sensory, reflex, CS, history directly
│ PUT /cases/:id/visit validation: row/root/side, question ids, derived answers must match findings
▼
case_visit_documentation.documentation one JSON doc per case, revisioned (ids only, no wording)
│ POST /post-exam-analysis/:region/snapshot (Save & run post-exam)
▼
case_post_exam_analysis.input_snapshot.input.visit.amaFindings[]
only this region's linked assessments; empty when AMA is off
freezeAmaFindings joins each assessment with its row:
{ rowId, description, nerveRoot, side, canonicalDxIds,
examination: [{ taskId, prompt, questionIds, motorGrade, atrophyCm }], tests performed
answers: [{ questionId, group, prompt, criterion, answer, answerLabel }] } resolved only
