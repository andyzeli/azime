# Proposed AMA rating selection workflow

Status: design proposal, 2026-10-12. The user has ended row-by-row reading notes and proposed a dynamic physician worksheet whose evidence selections map to DBI entries. No runtime, schema, or dataset changes are implemented here.

**Latest continuation:** [The first normalized spine draft](ama-spine.upload.json) and [its upload contract](ama-spine-upload.md) now exist. The current agreement is deduplicated row-level questions and complete rules on each entry, with no separate eligibility field. Repeated CH moves to upstream diagnosis confirmation; special CH requirements remain. CS confirmation is supplied by the physician without AI assistance, and “N of the following” is interpreted as at least N for this draft, as explicitly approved by the user. The older workflow discussion below is historical wherever it differs. No app runtime or database import has been implemented.

## Core interaction

The physician confirms a diagnosis, reviews or supplies relevant findings, and approves a supported class/grade. Software compares confirmed findings with explicit criteria and retrieves the listed impairment value. AI can propose evidence-backed answers; it does not author new rating rules during a case or independently approve the diagnosis/rating.

Use an evidence-driven worksheet rather than requiring the physician to read every permutation. The source uses clinical history (CH), physical examination (PE), and clinical studies (CS); field group labels should follow the verified source terminology.

1. **Confirm diagnosis and scope.** Start from the active regional diagnosis list, retrieve candidate AMA rows from its mapping, and confirm relevant specificity such as root and side. Keep actual diagnosis and analogous-row selection separate when analogy is used.
2. **Review history.** Show the relevant CH questions, with proposed answers and sources when available. Confirmation of an extracted historical statement is separate from judgment that it supports today's rating.
3. **Record examination findings.** Show diagnosis-specific choices and measurements, reusing confirmed visit evidence instead of asking for duplicate entry. Keep prior examinations distinguishable from today's findings.
4. **Review supporting studies.** Show qualifying evidence alternatives with links to the actual findings. Ask whether the evidence supports the specific criterion, not just whether a study exists.
5. **Review candidate entries.** Show which class/grade criteria are met, not met, or unresolved, and why. Keep nonmatching entries accessible for inspection. Do not automatically choose the highest value or hide a conflict by forcing the next branch.
6. **Approve selection.** With one fully supported entry, propose it for approval. With multiple matches, ask the physician to resolve selection under applicable guidance. With no full match, show the actual gaps/conflicts and allow deferral or separately documented judgment where permitted. A rationale does not turn a failed criterion into a satisfied one.
7. **Calculate and report.** Retrieve the selected entry's value, then apply verified component-combination, overlap, weighting, cap, and conversion rules separately. Preserve the selected method/version, confirmed evidence, source references, physician decision, and calculation steps for reporting.

History, exam, and studies may appear as guided sections, but should remain editable in any order. Changing an earlier answer updates candidate support. Do not build a one-way wizard that loses answers or prevents documenting relevant findings because another criterion is missing.

## Example: supplied C3 entries

For `17-19-05`, common history and study questions are asked once. The sensory findings distinguish the supplied entries:

| Physician-reviewed finding | Candidate entry if all common criteria are also met |
| --- | --- |
| Residual symptoms without objective sensory loss as specified by the row | 1A — 2% WPI |
| Diminished pinprick with sharp/dull perception intact | 1B — 4% WPI |
| Loss of sharp/dull perception | 1C — 5% WPI |
| Unclear, conflicting, or not assessed | Keep the unresolved finding visible; do not choose a grade automatically |

Do not ask for a percent or a desired severity. Ask about the evidence that distinguishes the entries. These example values and requirements are sourced from the supplied excerpt recorded in AMA-NOTE-045; production use requires the reviewed method-specific dataset.

## Minimum reference-data structure

| Object | What it contains |
| --- | --- |
| AMA diagnostic row | Row ID, name/description, table and method/release references, applicable region and any routing exception |
| Finding/question definition | Stable local key, readable question, evidence group (CH/PE/CS), answer type/options or measurement units, clinical qualifiers, and source explanation |
| Class/grade entry | Exact label, listed impairment value/unit, explicit criteria, and source locator |
| Criteria group | Nested `all` / `any` groups referencing finding answers or numeric comparisons; an explicit clinician-judgment answer where the source requires judgment |
| Canonical diagnosis mapping | Links care-taxonomy diagnoses to candidate rows in the selected method/version |

Share questions among entries within a row first. Share across diagnoses only where the evidence semantics are actually identical; matching words alone do not establish that. Do not flatten root, side, test type, timing, or units out of a clinical criterion.

### Reusable history questions and referenced study guidance

User observation (2026-10-12): the reviewed class/grade entries repeat the same history condition and many reference the electrodiagnostic section. Normalize confirmed repetitions once rather than duplicating them in every entry.

- **Common CH requirements:** Reuse questions for residual symptoms and mechanism-of-injury consistency with the diagnosis. Ask once for the relevant diagnosis/rating-component scope and share the confirmed answers among its candidate entries. The source condition still has both parts; confirming the diagnosis alone does not silently answer them. Do not treat an answer as universal across unrelated diagnoses, roots, sides, or timepoints. Subsequent source exceptions take precedence over a common default.
- **Common electrodiagnostic guidance:** Distill the actual referenced section into concise help or an expandable qualification checklist. Show it when electrodiagnostic evidence is being used, retaining the source section/release and any diagnosis/root-specific caveat. An inconclusive or absent study does not become negative diagnostic evidence automatically, nor does it satisfy a confirmation condition. Other allowed CS alternatives remain available.
- **Separate explanation from criteria:** Required conditions in the referenced section belong in explicit qualification checks or a clearly identified physician confirmation, not merely buried in help text. Technique/background can remain optional help. Decide which items need separate answers after reviewing the section; do not invent requirements from the cross-reference alone.
- **Simple initial storage:** Place reusable question definitions, criterion fragments, and guidance blocks in versioned JSONB on `ama_reference_versions` (if using the proposed three-table layout). Row JSON references their IDs and supplies explicit scope parameters such as root. Validate and resolve references when importing/loading a dataset; no separate guidance database or retrieval system is required initially. Materialize the resolved version for case reproducibility. Avoid free-form template substitution that could change clinical meaning.

The electrodiagnostic passage was supplied on 2026-10-12 and is being normalized in chat before settling the format. Its opening SIE criteria require documented skin temperature >32°C and qualifying findings in at least two same-limb muscles sharing root innervation. Later reproduced commentary adds acute/chronic distribution and interpretation requirements; their relationship to the opening criteria needs review. In particular, the limb-muscle requirement does not cleanly apply to the supplied C3 row's warning about lack of limb representation. Do not silently waive it or remove the source's electrodiagnostic alternative. The proposed first implementation is a physician-confirmed qualification question with source-linked criteria/help and an explicit unresolved applicability state where necessary. Automated study qualification is not established by the current draft. No migration or production reference data has been created.

Schematic example, using the user's placeholders rather than clinical rules:

`all(history = A, any(exam = PA, exam = PB), MRI_supports_CX = yes)`

This is a logical expression over confirmed evidence. It can power both the question presentation and an explanation of why an entry is supported. It need not become a separately maintained decision tree for every possible answer sequence. If PA and PB can coexist, capture them as separate observations or a multi-select, not an artificially exclusive dropdown.

## Case evidence and AI proposals

Keep source reference data separate from case answers. Each case answer needs its scope, observed/reported finding, provenance/date, and physician review status. Preserve whether it came from a record, today's examination, a physician interpretation, or an AI proposal. A record-supported historical finding is not automatically a current finding.

Use meaningful answer states: yes/no where appropriate, categorical findings or numeric measurements elsewhere, plus not assessed, unclear, and conflicting as needed. Not applicable should be available only where meaningful and must not silently count as satisfied. Keep the clinical answer separate from whether the physician has reviewed it.

An optional preparation step can map available record evidence to proposed answers and identify missing findings for the visit. It should receive a bounded set of versioned question IDs and relevant evidence, return validated answers and valid evidence references, and preserve contradictions. Inspect existing preparation prompts and contracts before deciding which pass, if any, should perform it. Do not change the existing pass boundaries merely to add prefilling.

Use text labels as well as color: “Suggested from records,” “Confirmed,” “Needs assessment,” or “Conflicting evidence.” Do not use a green match to imply physician confirmation or clinical truth. Ratings based on proposals remain provisional until review. Preserve unresolved proposals when the physician edits an answer only as provenance, not as the effective decision.

## Matching and approval behavior

For explicit criteria, calculate three states:

- **Met:** every necessary condition is established, accounting for allowed alternatives.
- **Not met:** a required condition is contradicted, or every allowed alternative is contradicted.
- **Unresolved:** missing, unclear, conflicting, or unreviewed evidence prevents a determination and no decisive failure has already occurred.

For `all`, any failed child makes the group not met; otherwise unresolved children keep it unresolved. For `any`, one met child satisfies the group; if none is met and at least one is unresolved, the group remains unresolved. Preserve reasons and individual child states for physician inspection.

Keep patient evidence, criterion status, and the physician's selection distinct. Where a clinician judges compatibility or relevance, capture that judgment and basis explicitly rather than fabricating a numeric similarity score. An unencoded source rule is not automatically met.

Evidence gathering can occur before MMI. Final rating approval still depends on the applicable MMI and eligibility decisions. Changes to confirmed diagnosis, evidence, reference version, or selected entry must flag dependent approvals/calculations as needing review, without destroying prior versions. Multiple roots/sides/components remain separate before combination.

## Cleaning up the source offline

Prepare reference data offline, extending the existing taxonomy-project workflow if appropriate:

1. Retain a source locator/version and permitted supporting text for every entry.
2. Draft concise questions and criteria from the source, preserving thresholds and nested AND/OR relationships.
3. Separate explanatory clinical advice from required criteria. Preserve options such as operative confirmation versus imaging rather than replacing them with a single generic “study positive” answer.
4. Review the normalized interpretation side by side with the source. AI can draft; consequential clinical interpretations need physician review.
5. Apply the editorial-exclusion policy. Unresolved defective text supplies no rule; mark any entry dependent on it as requiring manual review instead of silently broadening eligibility or inventing a correction.
6. Validate IDs, values/units, option references, and criteria structure. Check representative scenarios: single match, overlapping matches, no match, missing evidence, conflicting sources, and threshold boundaries. Publish a versioned dataset only after these checks and source review.

This is more structured than the earlier reference-only suggestion, but does not commit to automated diagnosis or unrestricted class selection. Start with a small verified family of rows such as the supplied C3 example to prove the workflow; do not ingest the entire chapter before testing the interaction.

## Immediate next design work

Agree on the worksheet interaction and minimal finding/criteria format, then sketch a C3 case with prefilled historical evidence and new exam answers. Reconcile the design with current visit capture, diagnosis review, and MMI workflows before implementing. The [integration plan](ama-guides-plan.md) and [reading log](ama-guides-reading-log.md) remain the record of broader requirements and unresolved source issues. The optional prose-reference library remains V2.
