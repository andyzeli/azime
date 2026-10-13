# AMA Guides integration planning

Status: exploratory planning, carried forward on 2026-10-11. No runtime changes or final clinical rules are established by this document.

Source: [AMA Guides Update Planning](chatgpt-conversation://6acaff00-6e60-83e8-bb82-27b32ff19313). The retrieved conversation contains five turns, including a user-pasted L2 radiculopathy excerpt. Earlier chapter material and embedded structured examples were not available in the retrieved content. Assistant interpretations from that conversation are hypotheses to verify, not authoritative Guides instructions.

## Product direction

Make relevant guidance available where the physician needs it: choosing a diagnosis, preparing for and performing the examination, interpreting evidence, and selecting an impairment classification. This can provide value in cases that do not require impairment rating.

The user specifically identifies SIE guidance as a source of embedded physician education: exam preparation can surface which findings need clarification and why they matter, even when no rating is requested. Retrieve relevant diagnosis-specific guidance, compare it with available evidence, and highlight unresolved examination questions. Retain the distinction between clinical examination guidance and requirements specific to rating; a rating criterion is not automatically a universal examination requirement.

Retrieving a useful reference is a worthwhile capability on its own. We do not need to turn every passage into AI analysis or executable rules. Start by reading and organizing representative material, then choose the simplest useful implementation.

## Agreed reading approach

Confirmed with the user on 2026-10-11: continue through the book passage by passage, classifying meaningful material as we encounter it. Develop the knowledge model progressively rather than designing the complete impairment algorithm up front.

- **Actionable:** Could become a decision rule, physician prompt, or reference card. This identifies a potential use, not a commitment to automate it.
- **Informational:** Useful clinical background to retrieve when relevant.
- **Redundant or incoherent:** No need to encode it unless it contains an explicit requirement. Link duplicates to the retained note; preserve unclear requirements as unresolved questions.

As notes accumulate, consolidate duplicates, reconcile contradictions against their source context, and refine the categories and knowledge model. Keep unresolved interpretation separate from disposition: an actionable passage can still need clarification.

**Editorial exclusion policy (user decision, 2026-10-11):** If wording is internally inconsistent or incoherent and no related passage clarifies it, treat that wording as providing no usable guidance. Exclude it from reference guidance, AI instructions, validation constraints, and calculation/routing rules. Do not guess a correction or infer permission or prohibition from the gap. Keep a brief source/issue note so a later clarification can be incorporated. Apply exclusion to the defective statement, preserving any independently clear instructions around it. An explicit requirement embedded in defective prose follows the same policy if its meaning cannot be resolved. Earlier notes marked unresolved remain research items, not product requirements or implementation blockers by themselves; if a particular rating depends on missing guidance, leave that determination unresolved.

## Working architectural baseline

Scope reminder from the user (2026-10-11): the application treats cervical, thoracic, and lumbar as separate regions. All three belong to the spine material currently being reviewed in AMA Chapter 17. An application region is therefore not equivalent to a Guides chapter. Future regions, such as shoulder, will need their own applicable guidance and tables. Keep current spine observations scoped accordingly; no broader routing or schema decision is needed now.

A subsequent excerpt provides a concrete boundary case: T1 pathology is rated similarly to cervical pathology because of upper-limb effects, with T2–T12 handled separately. Preserve the distinction between anatomical region and rating guidance; exact T1 routing awaits the detailed instructions (AMA-NOTE-012).

Preserve the workflow discussed by the user:

1. Extract record-level facts and retain their sources.
2. Produce the AI case summary.
3. Retrieve diagnosis-based care taxonomy and assess applicability and adequacy against documented care.
4. Assess objective, subjective, and functional trajectories before and after the visit.

Guidance can support preparation and examination along this flow. The physician confirms diagnoses, documents findings, and makes clinical decisions. Impairment classification remains a downstream consumer of the evidence and the relevant MMI and rating-eligibility decisions.

This is a planning baseline, not a finding that existing extraction fields are sufficient or that every stage is implemented. Review representative Guides passages before deciding whether targeted changes to extraction or examination capture are needed.

- Preserve granular findings and their source/date; summaries alone may omit details needed later.
- Keep change over time (trajectory) separate from the current findings used for impairment assessment.
- Keep care-taxonomy concepts separate from impairment-table categories, even where they share diagnosis mappings.
- Keep reference guidance, patient evidence, AI suggestions, and physician decisions distinguishable.

## Organize knowledge on separate dimensions

Use multiple category tags when a passage serves more than one purpose.

| Category | Material to capture | Potential workflow use |
| --- | --- | --- |
| Diagnosis guidance | Confirmation, differentiation, diagnostic selection | Case review and diagnosis confirmation |
| Clinical patterns / evidence | Presentations, natural history, imaging correlations, cited evidence | Interpretation and case analysis |
| Examination guidance | Questions, maneuvers, measurements, documentation | Preparation and examination |
| Care / MMI guidance | Recovery expectations, treatment considerations, stabilization | Care review and MMI support |
| Causation / apportionment | Guidance on attribution and preexisting conditions | Physician opinions |
| Impairment classification | Diagnosis rows, SIE criteria, classes, WPI values | Rating worksheet |
| Special rules / reporting | Routing, exclusions, combinations, required explanations | Rating and report preparation |

“Clinical patterns / evidence” does not automatically mean current best evidence. Record the source's version, citations, and review status before presenting a statement that way.

Independently record:

- **Intended use:** reference, contextual suggestion, or candidate structured rule.
- **Authority in the source:** explicit requirement, recommendation, descriptive statement, or ambiguous. Preserve scope and exceptions.
- **Disposition:** actionable, informational, or redundant/incoherent, following the agreed reading approach. Track unresolved questions separately.
- **Verification:** conversation-derived, source-checked, or physician-reviewed.

## Possible delivery levels

### V2 idea — Readable physician reference library

User request (2026-10-11): consider having AI digest the dense Guides prose into clearer, concise reference material, available through a dedicated reference-material route in the app. Give sections stable links so relevant workflow screens can link directly to explanations, examination reminders, or cautions. This is optional physician reference material, not automated clinical judgment.

Defer drafting and implementation to V2. If pursued, retain source/version references, distinguish source requirements from explanatory paraphrase, apply the editorial exclusion policy, and arrange physician review of the resulting guidance. Content-use permissions remain an existing open question. No separate training document is needed now.

### Potential implementation increments

1. **Relevant references:** retrieve reviewed guidance by diagnosis, region, and workflow stage, with source/version links. This is the first implementation candidate.
2. **Contextual suggestions:** use relevant guidance and case evidence to propose focused questions or examination priorities. Keep the source and the reason for the suggestion visible.
3. **Structured rating support:** show applicable rows and criteria, compare confirmed findings, and calculate only the mechanical steps that have been verified for the selected method.

These are possible increments, not a commitment to implement all three. Keep narrative guidance separate from any eventual strongly typed rating-table configuration. Defer the production registry schema until the reading sample exposes recurring patterns.

If AI is introduced, inspect the prompt and output schema together, keep runtime instructions in dedicated modules, separate source material and case input from system instructions, and validate output before use or persistence.

## Physician judgment and class selection

**Current design direction (2026-10-12):** Pause row-by-row reading notes and design a dynamic evidence-selection worksheet, as proposed by the user. AI may prefill source-linked suggestions; the physician confirms the diagnosis and findings; explicit criteria identify supported class/grade entries and their listed values. This advances beyond the earlier reference-only suggestion without committing to automatic diagnosis or highest-value selection. See [Rating selection workflow](ama-rating-selection-design.md) for the proposed interaction, reference-data shape, source-normalization process, and treatment of ambiguous/missing findings.

The user's working interpretation is that clinical judgment selects the most applicable class. The pasted L2 excerpt also contains explicit conjunctions and alternatives. The retrieved discussion does not settle how those requirements interact when findings do not neatly match a class.

Proposed interaction to evaluate:

1. Physician confirms the diagnosis and relevant findings.
2. Software presents candidate rows/classes, source criteria, and corresponding values.
3. Software distinguishes supporting, conflicting, and missing evidence.
4. Physician selects a class and records the basis where needed.

Do not yet encode a “highest qualifying class” rule, a closest-match algorithm, or permission to bypass unmet criteria. Resolve the general selection instructions and exceptions first. A rationale field by itself does not establish that a choice complies with the method.

Later class/grade prose says both are determined by diagnostic-row SIEs and grade values may be nonlinear: use explicit row/class/grade values rather than interpolating or importing an older grade-modifier formula. The supplied lumbar class-range summary conflicts with detailed examples and is excluded from usable validation rules pending clarification (AMA-NOTE-038/039). The same prose states regional caps of cervical 33%, thoracic 22%, and lumbar 33% WPI; Section 17.16 remains to be reviewed for their precise application.

### Analogous row when the diagnosis has no direct match

A subsequently supplied passage explicitly instructs the evaluator to use professional judgment to select the closest analogous listed diagnosis when the actual diagnosis has no direct DBI row. The comparison considers CH, mechanism of injury, PE, relevant CS, natural history, and resultant functional impairment. The report must identify the selected row and explain the choice; see AMA-NOTE-011.

Proposed behavior: preserve the actual clinical diagnosis, separately record that the rating uses an analogous row, and retain the physician's rationale and supporting evidence for report drafting. Missing entries in our own mapping dataset do not establish that the Guides lack a direct row. This pathway addresses an unlisted diagnosis; it does not resolve how to choose a class when a listed diagnosis's findings only partly match its class criteria. Automated closest-match selection remains undecided.

## Relationship to existing plans

- [Product overview](product-overview.md) and [application pipeline](application-pipeline.md) provide the broader workflow context.
- [Pipeline detail](pipeline-detail.md) describes pass boundaries and evidence snapshots but explicitly warns that it may be out of date. Confirm relevant details against code before implementation.
- [Exam-to-report design v3](exam-to-report-design-v3.html) explores regional processing and scoped physician opinions. Its impairment walkthrough explicitly uses the original Sixth Edition 2008/2009 method; do not carry that calculation into the revised spine method without verification.
- [Reference-data import](../backend/reference-data/README.md) describes the existing care-taxonomy import. A guidance registry is a proposal, not an existing part of that importer.

## Next planning steps

### Report scope: impairment and work opinions

User-proposed direction on 2026-10-11: explain that the AMA impairment rating addresses medically assessed loss of function or structure and does not itself determine broader disability, job-specific work capacity, or benefit entitlement. See AMA-NOTE-009 in the reading log; the underlying source passage has only been summarized so far.

Keep physician work-capacity/restriction opinions separate and include them when the referral calls for them. Do not derive restrictions from an impairment percentage. Report drafting should use the approved functional rationale and relevant job demands, and distinguish those opinions from the impairment calculation. Any scope statement must match what the report actually includes.

### Causation support

Section 17.15a supplies a candidate structure for a separate causation opinion: diagnosis, mechanism/exposure, chronology, plausibility, alternative explanations, scientific support, and documented conclusion under the applicable standard (AMA-NOTE-042). Organize the evidence for physician review and preserve the approved reasoning independently of the rating result. This does not establish a new AI pass or a verified implementation of the separately cited causation framework.

Do not automatically exclude incident contribution because preexisting pathology exists, equate temporal association with causation, or infer apportionment percentages. The source's probability/certainty wording and preexisting-condition exclusion need clarification; jurisdiction-specific standards remain part of the case scope. The actual apportionment method has not yet been supplied.

### Proposed scope limit for incongruent-presentation ratings

The user is considering a policy of not providing numerical impairment ratings for cases assigned to the `-01`/`-02` incongruent-presentation/nonspecific-pain pathways (first cervical headings captured in AMA-NOTE-044). This is tentative, not an adopted exclusion or implementation request. If adopted, retain these source rows for recognition and make “rating not provided” a distinct outcome with the physician's explanation; do not substitute 0%, automatically reject the clinical assessment, or silently omit a requested opinion. Confirm the policy against the engagement scope and applicable jurisdiction/program requirements before operational use.

### Canonical diagnoses and AMA row mappings

Planning discussion on 2026-10-11: the user describes the existing canonical diagnoses as based on the previous Guides and aligned with the level at which treatments attach. The revised Guides introduce finer diagnosis distinctions. Preserve useful care groupings while exploring a mapping to more granular AMA diagnostic rows.

The current `canonical_diagnoses` definition in `backend/src/db/schema.ts` contains `id`, `region_id`, `label`, nullable `definition`, and `icd_prefixes`. The offline taxonomy project supplies this reference data through the validated import. ICD prefixes help group record diagnoses; they do not by themselves establish the evidence required for an AMA row.

**Proposed minimum change, not yet approved for implementation:** Add an `ama_dx_rows` array of row identifiers to a canonical diagnosis, populated by the offline taxonomy project. A canonical diagnosis can then retrieve several candidate AMA rows while continuing to use its existing care-taxonomy links. Confirm the selected row against the physician-reviewed diagnosis and relevant SIEs; membership in the array is a candidate mapping, not rating eligibility or final selection.

Before settling the shape:

- Check representative revised rows to see whether the existing canonical grouping remains useful for care. Finer AMA distinctions alone do not require splitting the treatment taxonomy, but clinically meaningful care differences may.
- Associate mappings with an explicit Guides edition/release. A plain string array is sufficient only if that version is unambiguous in its containing dataset/configuration. If multiple methods coexist, make the mapping version-specific rather than mixing row IDs in one unqualified list. The existing reference-data dataset version is not automatically a Guides release identifier.
- Each AMA diagnostic-row definition has its own `id` and `description` (for example, `17-19-05` and `Cervical Radiculopathy Involving the C3 Nerve Root`, from the supplied passage). Keep these definitions, criteria, class/grade-specific values, and source table references in the proposed AMA reference data; `ama_dx_rows` on a canonical diagnosis would contain the linked row IDs. The row's identity is separate from a patient's selected class/grade and resulting impairment value.
- When implemented, update the offline export, strict import validation, persistence, and relevant contracts/queries together. Validate row references against the selected AMA dataset. No match should remain visible as an unmapped diagnosis, not silently exclude it from review.

This is a proposed bridge between care concepts and rating concepts, not a decision to rebuild the canonical taxonomy or implement a general mapping framework now.

For rating documentation, retain enough information to reproduce the full source reference: Guides method/release, DBI table, row ID and description, selected class/grade, and resulting value/unit. The supplied 17.02d passage expressly calls for identifying the diagnosis by row and class/grade label; see AMA-NOTE-010. Preserve source identifiers as strings, including punctuation and leading zeros.

Later lumbar passages establish a need to represent multiple rating components within a region (for example, distinct roots and sides), with component-specific weighting and combination rules. A single row/class/value per region is therefore insufficient for all described cases. The fracture-only passage also selects the highest fracture rating within each region before combining across regions. Preserve these requirements from AMA-NOTE-016/017; defer the calculation/data model until combination, rounding, and cap scope are clarified.

The final lumbar excerpts add overlapping-rating exclusions, explicitly describe a 33% lumbar WPI maximum, and identify a constrained standalone nonspecific-rating option (whose row and scope references conflict). Table 17-21 values are stated to be WPI, while a FECA-related passage points to a separate extremity-conversion method. Preserve units, applicable rating/reporting method, component exclusions, and calculation provenance. Track the unresolved source errors in AMA-NOTE-020–023 rather than correcting them by assumption or implementing their ambiguous parts.

### Reading and design sequence

User decision (2026-10-12): enough prose and sample rows have been reviewed for this phase. Stop row-by-row reading notes and design the remaining rating workflow using the existing examples. Skipped/deferred sections and unresolved source issues remain recorded; this does not mark the entire chapter or rating specification as verified. The sequence below is now a targeted design/reference-preparation checklist, not a request to continue pasting rows into the log.

1. Read representative actual DBI rows: row ID, diagnosis name, description, and each class/grade entry's WPI value and SIE criteria.
2. Preserve evidence groups (CH, PE, CS as supplied), required conjunctions, alternatives, thresholds, and exceptions. Do not flatten nested “all of” / “one of” conditions into a checklist that changes their meaning.
3. Connect each row to its table/method version, canonical-diagnosis candidates, and applicable previously captured routing, combination, exclusion, and cap instructions. Return to prose only when needed to interpret a row or settle a consequential gap.
4. Sketch the minimum physician-facing flow: candidate diagnosis/row → relevant findings and source criteria → physician-selected class/grade and rationale → corresponding listed value → applicable combination rules. Partial matches remain an interpretation issue; rationale alone does not establish satisfaction of explicit criteria.
5. Propose the minimum reference-data shape and implementation slice after the sample confirms recurring row patterns. No full automation or immediate schema change is committed by this reading decision.

## Open decisions

### Applicability of AMA requirements — research checkpoint

The user raised whether AMA ratings are required at all and confirmed interest in Arizona workers' compensation, personal injury litigation, and federal claims. Determine the governing jurisdiction, claim type, requested opinion, and required edition/release before committing to a rating method. Criticism of a method is distinct from authority to replace it. These examples were checked on 2026-10-11; federal research below is specifically FECA schedule awards, not all federal claims, and personal-injury requirements still need case-specific review:

- **Arizona workers' compensation:** [R20-5-113(B)](https://www.law.cornell.edu/regulations/arizona/Ariz-Admin-Code-SS-R20-5-113) uses “should” and “if applicable.” In [Gutierrez v. ICA (2011), paragraphs 12–14](https://cases.justia.com/arizona/supreme-court/CV100285PR-2.pdf), the Arizona Supreme Court explained that use is discretionary and that other evidence may establish impairment when the Guides do not accurately reflect the claimant's loss. This supports investigating a reasoned, case-specific alternative, not assuming a blanket rejection is sufficient. Confirm current controlling authority and application to the intended case before implementation.
- **Federal FECA schedule awards:** The [DOL procedure manual](https://www.dol.gov/agencies/owcp/FECA/regs/compliance/DFECfolio/FECA-PT2/group2) specifies Sixth Edition use, subject to stated exceptions. [FECA Transmittal 25-04, February 10, 2025](https://www.dol.gov/agencies/owcp/FECA/regs/compliance/DFECfolio/FECATransmittals) revoked the January 2025 policy permitting either Fifth or Sixth Edition and reinstated prior procedures. Do not rely on the superseded January change. These sources do not by themselves settle which digital Sixth Edition update is accepted.

Product direction remains to keep clinical evidence and physician opinions useful independently of the rating module, while identifying the method applicable to a requested rating. Our editorial-exclusion policy is a content-curation policy; it does not itself establish legal permission to depart from an adopted rating standard. A disputed passage that materially affects a required rating needs an explicit resolution or disclosed limitation, not a silently altered result labeled compliant.

### Remaining questions

- Which exact Guides edition/release and jurisdictional scope should the first implementation support?
- What do the general instructions permit when findings partially satisfy or conflict with a class?
- Which guidance transfers beyond impairment rating, and which is specific to the rating context?
- What precise evidence is already retained, and what requires additional extraction or visit capture?
- How should guidance relate to the application's canonical diagnoses without making rating categories dictate the care taxonomy?
- What source content and integration uses are covered by the project's permissions? This was raised in the prior discussion and remains unresolved.
- Who reviews the clinical interpretation, and what is sufficient to promote a reading note into production guidance or executable rules?
