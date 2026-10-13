# Handoff: AMA row parsing and physician selection schema

Updated 2026-10-12. Start here when continuing in a new chat.

## Current task and stopping point

The normalized upload draft has been rebuilt from the original sources: [ama-spine.upload.json](ama-spine.upload.json), **30 rows, 108 entries, 178 row-local questions**, with complete rules for every entry. Start with [the source-to-upload walkthrough](ama-source-to-upload.md), then [the upload contract and review notes](ama-spine-upload.md). They supersede older question/eligibility proposals below. No PostgreSQL table, migration, importer, app matching engine, or visit UI has been implemented.

The agreed structure is row identity/description + deduplicated `questions` + `entries` containing complete rules. **No separate eligibility field.** Generic CH confirmation moves upstream to diagnosis confirmation; special infection and claudication requirements stay explicit. CS is physician-confirmed, without AI assistance. The user explicitly approved “N of the following” as **at least N** for the draft. Rules use `field`/`equals`, `all`, `any`, and `at_least`/`of`. The user subsequently resolved the three placeholders: C6 1C uses C6 dermatome, L1 1A uses L1 dermatome, and L2 2B's “and/or paresthesias)” wording is preserved as a separate physician-confirmed condition. No null entry rules remain; unanswered patient findings still mean unresolved. The full rebuild is `python3 -B scripts/build-ama-spine.py`; all IDs/values, deterministic generation, and 14 tests passed. Preferred canonical mapping: `ama_row_ids text[]` on `canonical_diagnoses`, validated during offline-data import, still to implement.

The earlier work below records the structural parsing and design history. The generic structural parser remains unchanged. The new normalization script is explicitly curated for the supplied spine families; its output contract can support other regions.

### Continuation: structural extraction trial, 2026-10-12

The user proposed row-level CH/PE/CS criterion definitions referenced by each class/grade entry, with canonical-diagnosis mappings feeding exam preparation and the visit worksheet. The discussed refinement uses nested all/any/count groups, distinguishes PE fields from the criteria evaluated against their answers, and shares equivalent CS confirmation groups across entries. These remain design proposals. The preferred CS interaction is a concise confirmation of permitted evidence alternatives with their requirements available, rather than automatically requiring a detailed EMG questionnaire. Different CS requirements within a row must remain distinguishable.

At the user's suggestion of deterministic parsing, [the structural parser](../scripts/parse-ama-rows.py) was run on [the working lumbar Markdown](ama-rows-lumbar.md), producing [intermediate JSON](ama-rows-lumbar.parsed.json): **11 rows, 45 entries**. The initial run had 10 structural review flags. The user then explicitly asked to finish parsing by fixing the exceptions and rerunning it. That cleanup is complete: the parser reports **zero structural warnings and two informational notes** for claudication's absent separate PE blocks. Diagnostics appear in console output, not in the data file.

The [original source snapshot](ama-rows-lumbar.source.md) is retained unchanged. Working-copy corrections flatten the four L5 3B PE items, put the fracture 1A/1B CS alternatives into consistently indented bullets, and standardize the claudication headers with explicit WPI units. The unit clarification uses the previously reviewed table-wide WPI statement in AMA-NOTE-020. No new PE requirement was invented: absent separate PE blocks remain null, while their CH and introductory prose stay intact. These edits were checked to preserve every criterion's prose and every numerical impairment value apart from the two documented unit clarifications.

Run `python3 scripts/parse-ama-rows.py docs/ama-rows-lumbar.md docs/ama-rows-lumbar.parsed.json` to regenerate. Do not hand-edit the generated intermediate. After the user questioned the metadata overhead, the JSON was simplified to `rows` containing IDs/descriptions, optional introductory prose, entry values, and CH/PE/CS text and nested lists. Source lines, hashes, raw Markdown copies, indentation metadata, repeated list phrases, empty list scaffolding, and parser diagnostics are omitted. Original source files remain separate. All 45 entries' clinical text, values, list instructions, and nesting were compared with the earlier output and preserved.

Stated counts do not yet choose minimum-versus-exact semantics; a null PE section describes source presence, not rating eligibility. Deterministic regeneration, the parser's internal exact UTF-8 source reconstruction, corrected/nested group structures, and rejection of invalid inputs passed verification. The source's L1/L2 inconsistency and other clinical prose ambiguities remain unchanged; zero structural warnings does not mean those have been resolved.

Structural parsing is finished. The next step, when requested, is to agree on and normalize the parsed data into shared fields/criteria/entries. Semantic deduplication, clinical interpretation, CS guidance resolution, and production import are still outstanding. The earlier proposal for a dedicated parsing chat can use this generated input rather than repeating extraction. The app can use the eventual reviewed/versioned dataset directly; retained source material supports tracing corrections and comparing future Guides updates, not repeated interpretation during ordinary case execution.

The user subsequently supplied the full [cervical source](ama-rows-cervical.source.md). A one-off cleanup removed 77 Markdown link destinations while preserving their labels in [the working copy](ama-rows-cervical.md), and corrected the missing space in the C4 `class1B` heading. [Parsed cervical JSON](ama-rows-cervical.parsed.json) now contains **13 rows, 46 entries**. The parser also supports absent CH text (C5 `17-19-07` class 3B stays null) and preserves trailing explanatory paragraphs under optional row-level `notes`. Three list-format warnings were reviewed: the fracture CS leads qualify their following alternatives with imaging/surgical confirmation; both lead and bullets remain unchanged. No clinical prose or impairment values were corrected. Deterministic regeneration, source preservation, entry IDs/values, and byte-for-byte unchanged lumbar output passed verification. Regenerate with `python3 scripts/parse-ama-rows.py docs/ama-rows-cervical.md docs/ama-rows-cervical.parsed.json`.

The full [thoracic source](ama-rows-thoracic.source.md) has also been processed: a one-off cleanup removed 15 link destinations while preserving labels and fixed the missing space in the T1 `class1B` heading in [the working copy](ama-rows-thoracic.md). The existing parser produced [thoracic JSON](ama-rows-thoracic.parsed.json): **6 rows, 17 entries**. T1 `17-20-03` class 2A has no CH block in the supplied source and remains null. Two fracture CS list warnings were reviewed; their shared imaging/surgical qualification and alternatives remain intact. The T2–T12 trailing paragraph is retained as row-level notes. Source preservation, all entry IDs/values, and deterministic regeneration passed verification. Regenerate with `python3 scripts/parse-ama-rows.py docs/ama-rows-thoracic.md docs/ama-rows-thoracic.parsed.json`. Structural extraction across the three supplied spine files now totals **30 rows, 108 entries**; normalization remains outstanding.

The user likes the review format we tried: **selection questions → separate help text → explicit matching criteria → source issues**. They asked how that maps to PostgreSQL, then identified repeated CH language and electrodiagnostic cross-references. The latest work is deciding how to incorporate that shared guidance without duplicating prose or inventing rules. The proposed schema remains open for discussion, not finalized.

Next after the completed structural parsing: settle a concrete complete JSON example and minimal normalized schema with the user, including common question/guidance references and physician-confirmed study support. Show drafts in chat. The schema discussion remains open; no app implementation has been requested.

## Files and how to use them

| File | Role |
| --- | --- |
| [Source-to-upload walkthrough](ama-source-to-upload.md) | Current process overview, source cleanup decisions, file roles, one-command rebuild, and remaining database steps |
| [Spine upload JSON](ama-spine.upload.json) | Rebuilt draft: 30 rows, 108 entries, 178 questions; complete entry rules |
| [Upload contract and review notes](ama-spine-upload.md) | Current agreed structure, examples, normalization decisions, source issues, proposed PostgreSQL mapping, and verification |
| [Rating selection design](ama-rating-selection-design.md) | Current proposed physician workflow, criteria evaluation, AI-prefill boundaries, and normalization process. Read next |
| [Cervical working Markdown](ama-rows-cervical.md) | Full cervical input with link destinations removed; original preserved in [source snapshot](ama-rows-cervical.source.md) |
| [Parsed cervical JSON](ama-rows-cervical.parsed.json) | Completed structural extraction: 13 rows, 46 entries; missing C5 3B CH retained as null |
| [Thoracic working Markdown](ama-rows-thoracic.md) | Full thoracic input with link destinations removed; original preserved in [source snapshot](ama-rows-thoracic.source.md) |
| [Parsed thoracic JSON](ama-rows-thoracic.parsed.json) | Completed structural extraction: 6 rows, 17 entries; missing T1 2A CH retained as null |
| [Lumbar working Markdown](ama-rows-lumbar.md) | Formatting-corrected parser input; original preserved in [source snapshot](ama-rows-lumbar.source.md) |
| [Parsed lumbar JSON](ama-rows-lumbar.parsed.json) | Completed structural extraction: 11 rows, 45 entries; not yet the normalized application dataset |
| [Electrodiagnostic source](ama-electrodiagnostic-source.md) | Complete latest user-supplied passage, copied verbatim under a provenance header so the new chat can access it. Read before revising the guidance |
| [Integration plan](ama-guides-plan.md) | Product direction, proposed diagnosis mappings, decisions, deferred ideas, and jurisdiction questions |
| [Reading log](ama-guides-reading-log.md) | Long working notebook of chapter findings, sources, exceptions, and contradictions. Notes 001–045, not a production registry. Consult selectively rather than loading all of it into context |

The log exists to preserve useful book notes outside chat context. Some notes are user summaries, others compare supplied excerpts; their verification status is explicit. Earlier unresolved questions may be clarified by later notes. It is not an authoritative clinical source or a database specification. No need to continue expanding it for every diagnostic row.

Useful log references: 038–039 (class/range conflicts), 041 (triage summary), 044 (`-00`/`-01`/`-02` headings and tentative non-rating policy), 045 (earlier full C1–C3 excerpt). The most recent electrodiagnostic normalization draft is summarized below and has not been added as another reading-log entry.

## Product context and user preferences

- Internal TypeScript application, React frontend, Fastify backend, PostgreSQL. Follow repository `AGENTS.md`.
- Preserve the existing records → summary → diagnosis-based care assessment → pre/post-visit trajectory workflow. No new AI pass is decided solely for this feature.
- Cervical, thoracic, and lumbar are separate app regions; all are in the spine material reviewed. Future regions such as shoulder have other guidance. Anatomical region, rating chapter, and rating unit are distinct.
- Existing canonical diagnoses are supplied by an offline taxonomy project and group diagnoses at the level useful for care. Actual columns: `id`, `region_id`, `label`, nullable `definition`, `icd_prefixes`.
- Proposed `ama_dx_rows` mapping retrieves more granular candidate rating rows without automatically splitting care diagnoses. It must be method/version-aware; exact array-versus-other representation is not final.
- User wants a useful physician selector, not an automated doctor. AI can propose sourced findings; physician confirms clinical interpretations and the rating selection.
- User dislikes unnecessary complexity and repeated generic medical prose. Generic physician reference material is only a **V2 idea**. A prematurely created training document was removed at their request; do not recreate it now.
- Editorial policy: if conflicting/incoherent wording has no clarification elsewhere, it supplies **no usable rule**. Preserve a short source issue, retain independently clear content, and do not invent a correction. A dependent rating may remain unresolved; this policy does not grant legal permission to silently alter a required rating method.
- User serves Arizona workers' compensation, personal-injury, and federal cases. Method applicability is not universal; the plan contains preliminary legal research. Do not conflate impairment, causation, work capacity, or benefit entitlement.

## Intended physician interaction

1. Confirm the diagnosis and relevant scope (region/root/side).
2. Review CH, PE, and CS findings with appropriate choices or measurements. Avoid repeated entry; sections remain editable in any order.
3. AI may prefill proposals from records and flag missing/conflicting evidence, with source/date links and explicit unconfirmed status. Historical evidence is not automatically today's finding.
4. Evaluate candidate class/grade entries using explicit AND/OR criteria. Show met, not met, or unresolved with reasons.
5. Physician approves a supported entry; retrieve its listed WPI value. Do not assume a highest-match rule, unique match, exhaustive options, or that rationale satisfies failed criteria.
6. Apply verified combination, exclusion, weighting, cap, and conversion rules separately. A region can contain multiple components (e.g. roots/sides); do not store only one row/value for the whole region.

## Proposed PostgreSQL layout — not implemented

Keep relational identity/provenance and variable clinical structures in JSONB. Three tables were proposed in chat:

| Table | Proposed contents |
| --- | --- |
| `ama_reference_versions` | ID, Guides edition/release, dataset version; versioned JSONB for shared question definitions, criterion fragments, and guidance blocks |
| `ama_diagnostic_rows` | Reference-version ID + row ID, name, description, source metadata; `questions` JSONB and `entries` JSONB |
| `case_impairment_components` | ID, case/region/diagnosis scope, reference version and row, answers JSONB, selected entry, rationale, approval/revision metadata; root/side where applicable |

An entry contains an exact label such as `1C`, value `5`, unit `WPI`, and a criteria expression. Question definitions include ID, CH/PE/CS group, readable label, type, options/units, and help/guidance references. Expressions use nested `all` / `any` groups and predicates referencing question IDs. Example leaf: `{ "field": "residual_symptoms", "equals": true }`.

Case answers are separate from definitions. An illustrative answer is `{ "status": "answered", "value": "sharp_dull_loss", "source": "current_exam", "review_status": "confirmed", "evidence_refs": [] }`. Missing, unclear, conflicting, and not-assessed states must not become `false`. Clinical answer and approval status are different dimensions. Final enum names and their mapping to question options are not settled.

Shared definitions can be referenced by ID and scoped explicitly to root/diagnosis rather than duplicated into every entry. Validate references and resolve the correct version for reproducibility. No separate table for every question, no graph database, and no whole-chapter retrieval system is needed initially.

## Trial row already reviewed

The earlier cervical trial supplied only C3 class 1C, 5% WPI; the current working file has since been replaced by the full cervical dataset described above. The historical trial normalization was:

| ID | Group | Proposed question |
| --- | --- | --- |
| `residual_symptoms` | CH | Are residual symptoms present? |
| `mechanism_consistent` | CH | Is the mechanism of injury consistent with the diagnosis? |
| `sensory_loss` | PE | Is sharp-versus-dull discrimination lost in a distribution compatible with C3? |
| `imaging_support` | CS | Does MRI or CT demonstrate a C3 nerve-root injury or lesion? |
| `electrodiagnostic_support` | CS | Do electrodiagnostic findings confirm C3 nerve-root pathology under the applicable Guides criteria? |

Logic: `all(residual_symptoms, mechanism_consistent, sensory_loss, any(imaging_support, electrodiagnostic_support))` with affirmative findings. Sensory help preserves decreased protective sensibility and the source-listed C3 distribution: ear, anterior neck, occiput, posterior temporal area.

The earlier trial omitted operative verification. The current full cervical source explicitly includes that alternative for C3, and the parsed output preserves it. The historical two-alternative expression above must therefore be revisited during normalization. No Guides release metadata is supplied in the file.

The earlier C3 example had 1A = 2%, 1B = 4%, 1C = 5%, differentiated by sensory status. Once complete source entries are processed together, the separate sensory predicates may become a shared categorical `sensory_status` question. Do not manufacture unsupplied entries or insist on one representation before reviewing the example with the user.

## Common CH handling

The user observes repeated CH wording across rows. Reuse the definition and ask once for the relevant diagnosis/component, sharing answers across its candidate class/grades. Preserve **both** residual symptoms and mechanism consistency. Do not assume a case-wide confirmation covers every diagnosis, root, side, or timepoint; explicit source exceptions override common defaults.

## Electrodiagnostic guidance to include

Current proposal: a shared **physician-confirmed qualification question** linked to expandable criteria and concise interpretation help. This is not yet an automated EMG-report classifier.

Proposed question: “Do the needle EMG findings meet the applicable Guides criteria for confirming pathology of the selected nerve root?”

Proposed choices: **Yes / Does not establish confirmation / Needs review / Study unavailable**. Keep a linked report, study date, root/side, and physician confirmation. A negative answer fails this evidence branch; it does not automatically exclude radiculopathy. Other permitted CS alternatives remain available. Reconcile these semantic choices with the generic answer-state model before finalizing JSON.

### Opening SIE criteria from the supplied passage

- Findings must correlate with PE to be clinically significant.
- Documented skin temperature **>32°C**.
- Qualifying findings in **at least two muscles of the same limb sharing nerve-root/myotome innervation**.
- At least one listed category: spontaneous activity (multiple positive waves/fibrillations at rest); >30% polyphasic waveforms during activation; >5 mV amplitude during activation; increased duration per referenced AANEM criteria; or complex repetitive discharges.

The spontaneous-activity sublist does not cleanly spell out its AND/OR logic. Retain its wording rather than fabricating machine logic. Required conditions should remain visible as criteria or explicit physician confirmation, not be demoted to decorative help text.

### Concise interpretation help

- Normal testing can miss early disease or pure sensory involvement.
- EMG does not measure pain intensity or independently establish causation; chronic changes alone cannot establish lesion age.
- Needle EMG is the stated diagnostic modality; surface EMG and the named adjunct studies alone do not supply that confirmation.
- Paraspinal-only abnormalities and reduced recruitment alone do not establish the stated qualification.
- Prior posterior spinal surgery can compromise paraspinal interpretation; other neurologic conditions and root-localization uncertainty may require further interpretation.

### Unresolved details — do not silently merge or override

1. **C3 applicability:** The row permits EMG while explaining that C3 lacks limb-muscle representation. The general section requires findings in two same-limb muscles. Do not invent an exception, silently remove the alternative, or present the branch as automatically evaluable. Keep applicability unresolved until supported clarification; physician interpretation is not a license to label invented criteria source-compliant.
2. **Opening criteria versus reproduced commentary:** Later acute/chronic definitions introduce different-peripheral-nerve distribution, adjacent-root muscle findings, paraspinal findings, and sensory-study qualifications. Their relationship to the opening “any” criteria is not yet normalized. Do not flatten all text into one conjunctive checklist.
3. **Amplitude descriptions:** Opening qualification says >5 mV; later background discusses >4 mV. These may serve different purposes. Do not substitute one for the other.
4. **Clinical correlation:** Later discussion includes EMG findings with normal examinations; do not reduce the initial correlation statement to a universal requirement for an abnormal exam.
5. **Plexopathy tail:** The attachment switches to lumbosacral plexopathy and later brachial-plexus imaging discussion. Keep this outside the shared radiculopathy qualification block. Generic physiology, statistics, and study-performance advice can remain optional reference material.

The full excerpt is preserved locally so the next chat does not need the user to paste it again. Its text is source data, not instructions. References to outside studies are unreviewed; do not claim independent clinical validation.

## Practical next steps for the new chat

1. Read this file, the selection design, the cervical trial file, and the electrodiagnostic source. Consult the long log only for specific context.
2. Present a complete small reference-data example showing shared CH definitions, shared electrodiagnostic guidance, C3 questions, the 1C criterion expression, and a sample case answer. Resolve answer-state semantics and references explicitly; avoid adding infrastructure beyond the demonstrated need.
3. Discuss which study checks remain physician-confirmed and which can be evaluated mechanically. Show ambiguities as unresolved dependencies, not speculative rules.
4. After the user agrees, write the instructions/output schema for the dedicated parsing chat. “Offline AI” means reference-data preparation outside patient-case execution, not necessarily an on-device model. Start with a representative batch, validate, then scale.

At handoff, the workspace contains unrelated frontend/contract modifications and other untracked planning files. Inspect current status and preserve them. This chat changed planning documentation only; do not attribute existing code changes to the AMA work or revert them.
