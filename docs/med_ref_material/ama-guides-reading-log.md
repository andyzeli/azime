# AMA Guides reading log

Companion to the [integration plan](ama-guides-plan.md). This is a working notebook, not a validated clinical knowledge base or production schema.

## Source status

The initial notes come from the [planning conversation](chatgpt-conversation://6acaff00-6e60-83e8-bb82-27b32ff19313), including the user's pasted section 17-21-04. The discussion identifies the subject as the revised 2025 spine methodology; exact source release metadata remains to be checked. No complete chapter was reviewed during this planning handoff. The repository's `ch17.txt` was empty at handoff.

Subsequent notes identify the supplied passage directly. “Source-checked against supplied excerpt” means the note was compared with that text, not that the complete publication, release metadata, or linked sections were independently verified.

Use a source locator and a concise paraphrase for each useful passage. Retain exact logical connectors, dependencies, and exceptions when analyzing candidate rules. Do not fill gaps from an assistant's earlier interpretation.

## How we will use this log

For each passage, capture its useful meaning, category, and disposition:

- **Actionable:** A candidate decision rule, physician prompt, or reference card.
- **Informational:** Clinical background worth retrieving in context.
- **Redundant or incoherent:** Skip encoding unless it contains an explicit requirement; link duplicates to an existing note and retain unclear requirements for resolution.

Use the template below as needed, keeping simple notes short. Record unresolved questions separately from disposition. Periodically consolidate duplicates and reconcile contradictions using source context, allowing the knowledge model to emerge from the reading. The reading queue tracks material to revisit; it does not require us to solve the rating algorithm before continuing through the book.

**Editorial exclusion policy (user decision, 2026-10-11):** Check related passages for clarification of conflicting or incoherent wording. If none resolves it, classify the defective statement as **excluded — no usable guidance**. Do not use it as a reference recommendation, AI instruction, constraint, or executable rule, and do not invent a corrected meaning. Preserve a short source/issue note and any independently clear surrounding instructions. This also applies to apparent requirements whose meaning remains indeterminate. Earlier unresolved editorial notes follow this policy: they are research notes, not requirements to implement. A missing rule provides neither permission nor prohibition; any specific rating determination dependent on it remains unresolved.

## Reading queue

| Material | Why read it | Status |
| --- | --- | --- |
| General diagnosis, row, and class-selection instructions | Resolve clinical judgment, mixed findings, and required criteria | Step 1 / 17.01d reviewed below; class-selection instructions still needed |
| 17.07; 17.12; 17.13b4b–c | Functional loss; natural-history incongruence; inconsistent history versus unconfirmed diagnosis | Referenced by Step 1; passages needed |
| DBI table legends, definitions, and footnotes | Establish how to interpret rows and evidence requirements | Needed |
| 17-21-04: lumbar radiculopathy involving L2 | Concrete example spanning diagnosis, examination, studies, and classes | Excerpt available in prior conversation; full context needed |
| Degenerative spondylolisthesis, cervical | Sample diagnosis-specific guidance | Supplied passage reviewed in AMA-NOTE-028 |
| Degenerative spondylolisthesis, lumbar | Compare shared and region-specific guidance | Supplied passage reviewed in AMA-NOTE-029 |
| Spondylolysis and isthmic spondylolisthesis | Identify diagnostic distinctions and rating dependencies | Supplied passage reviewed in AMA-NOTE-030 |
| Pseudoarthrosis | Identify diagnostic and examination guidance | Heading identified; passage needed |
| AOMSI | Clarify definitions, evidence requirements, and cross-references | Regional thresholds in AMA-NOTE-018/024; methodology in AMA-NOTE-031. Detailed figures/protocols still needed |
| Cervical and thoracic combination sections | Check region-specific routing, combinations, caps, and exceptions | Deferred by user; no assumption that lumbar rules apply. Regional AOMSI excerpts reviewed in AMA-NOTE-024 |

## Initial observation: L2 excerpt

**ID:** AMA-NOTE-001  
**Source locator:** Section 17-21-04, as pasted by the user in the prior conversation.  
**Verification:** Conversation-derived; surrounding instructions not checked.  
**Categories:** Impairment classification; examination guidance; diagnosis guidance.  
**Potential uses:** Reference card; focused evidence capture; candidate structured criteria.  
**Authority:** The excerpt includes explicit requirements; their interaction with general selection rules remains unresolved.  
**Disposition:** Actionable candidate with unresolved interpretation.

The excerpt distinguishes clinical history, physical examination findings, and supporting clinical studies. It differentiates subjective sensory symptoms, objective sensory findings, motor strength, and neural tension findings. Some criteria are conjunctive and some accept alternative supporting evidence.

Potential software implications to investigate:

- Reuse clinical findings across guidance and rating views rather than immediately creating one form for every row.
- Preserve distinctions between symptoms and observed findings, including anatomical specificity and evidence provenance.
- Preserve “all” versus “one of” relationships when representing criteria.
- Keep “not documented,” “not assessed,” and a negative finding distinguishable.
- Let the physician inspect why a candidate class appears relevant and which evidence is missing or conflicting.

**Unresolved example from the discussion:** What is the correct selection process when motor findings resemble a higher class but accompanying sensory or neural tension criteria do not match? Obtain the governing instructions before choosing automated behavior.

**Next source checks:** General class-selection instructions; full row context and footnotes; cross-referenced definitions for supporting studies; exact edition/release.

No rating values or executable class-selection rules are promoted into the plan from this example.

## Rating workflow outline

Supplied by the user on 2026-10-11. Retain these as the book's organizational steps; their detailed implementation remains to be explored.

1. Confirm a clinically relevant diagnosis (DX).
2. Confirm maximum medical improvement (MMI).
3. Identify the relevant diagnosis-based impairment (DBI) table.
4. Determine the diagnostic row, class, grade, and impairment value.
5. Guidelines for report documentation.

## Step 1 — Confirm a clinically relevant diagnosis

**Source:** User-supplied [Step 1 excerpt](/Users/andrewzelinski/.codex/attachments/e08bf2cb-e537-445c-b251-bad02434a68c/Pasted%20text.txt), headings “Diagnosis-Based Impairment Linked to Confirmed and Clinically Relevant Diagnosis” and “17.01d Criteria for Confirming a Clinically Relevant Diagnosis.”  
**Verification:** Source-checked against supplied excerpt on 2026-10-11; exact release and cross-references unverified.

### AMA-NOTE-002 — Diagnostic confirmation and clinical relevance

**Categories:** Diagnosis guidance; examination guidance; clinical patterns / evidence.  
**Disposition:** Actionable.  
**Potential use:** Physician review prompt or reference card.  
**Authority:** Diagnostic confirmation instructions; professional judgment is explicit.

The evaluator identifies clinical history (CH), physical examination (PE), and clinical studies (CS) supporting the diagnosis, then considers their consistency and relevance in light of the condition's natural history before assigning a diagnostic row. Consider alternative explanations for the current presentation whenever possible.

- CH includes the condition's history, mechanism, current presentation, prior findings and records, review of systems, and self-reported functional effects.
- PE can draw on a direct examination, documented prior examination findings, or both.
- CS includes review of diagnostic images and reports, laboratory testing, and electrodiagnostic studies as relevant to the diagnosis.

**Possible product behavior:** Present the supporting evidence grouped as CH / PE / CS, with sources and dates, relevant inconsistencies, and alternative explanations for physician review. These are useful evidence-review categories beyond impairment rating. Do not infer from the list that every diagnosis requires every study modality or new testing. Historical and current findings should remain distinguishable.

**Boundary:** Confirming a diagnosis is separate from assigning its impairment class. This passage does not establish class-specific evidence sufficiency or resolve AMA-NOTE-001's mixed-findings example.

### AMA-NOTE-003 — Natural history as interpretive context

**Categories:** Clinical patterns / evidence; diagnosis guidance.  
**Disposition:** Informational, with a possible contextual review prompt.  
**Authority:** Definition and interpretive guidance.

Here natural history encompasses progression over time in the context of aging, treatment or its absence, preexisting impairment and conditions, comorbidities, and psychosocial factors where possible. Diagnostic findings should be considered against that context.

**Possible product behavior:** Retrieve diagnosis-specific natural-history guidance alongside the timeline and relevant patient context. This passage supplies the framework, not the diagnosis-specific expected course, diagnostic exclusions, or causation/apportionment rules. Do not convert an atypical course into an automatic rejection of a diagnosis.

### AMA-NOTE-004 — Inconsistent history versus unconfirmed diagnosis

**Categories:** Diagnosis guidance; impairment classification; special rules / reporting.  
**Disposition:** Actionable; cross-reference interpretation unresolved.  
**Authority:** Explicit permission and a conditional restriction.

The excerpt distinguishes two situations:

1. CH does not align with PE and CS, but PE and CS substantiate impairment: professional judgment may support assigning a diagnostic row.
2. Discrepancies among CH, PE, CS, and natural history prevent confirmation of a clinically relevant diagnosis: the excerpt says a specific row ending in -03 or above cannot be assigned, and directs the reader to 17.13b4b, 17.13b4c, and 17.12.

**Possible product behavior:** Flag discordance for physician interpretation and surface the relevant guidance. Do not treat every inconsistency as failed diagnostic confirmation. Do not automatically select a fallback row, infer zero impairment, or treat missing evidence as a demonstrated contradiction.

**Open questions:** Read the referenced sections to establish these pathways and row numbering in context. Permission to assign a row despite inconsistent history does not establish permission to bypass that row's class criteria.

### AMA-NOTE-005 — Multiple applicable diagnoses

**Categories:** Impairment classification; diagnosis guidance; special rules / reporting.  
**Disposition:** Actionable candidate; scope and exceptions unresolved.  
**Authority:** Selection instruction with stated exceptions.

The excerpt directs selection of the highest causally related impairment rating when multiple diagnoses apply. It says the associated diagnosis will generally be more specific, while some diagnoses or combinations require specialized guidance.

**Possible product behavior:** Preserve the clinically applicable candidates, evidence of causal relevance, and their supported rating pathways for comparison. This does not authorize choosing an unsupported diagnosis for a larger percentage, deleting other clinical diagnoses, or applying a case-wide maximum instead of combination rules.

**Open questions:** Establish the selection scope (region, table, or other unit), causal-relevance requirements, and diagnosis/combination exceptions before implementing a maximum-selection rule. Specificity alone is not stated as an unconditional selection rule.

### Editorial observations

**Disposition:** Redundant or incoherent.

- The restriction on assigning rows -03 and above is repeated verbatim; retain the requirement once in AMA-NOTE-004.
- The reference to upper-limb function appears out of place in this spine/pelvis passage. Flag it as a possible editorial error; do not derive anatomical scope from it.
- General assertions about fairness and assessment quality add no separate product behavior.

**Next reading:** Continue with Step 2. Revisit the queued cross-references when supplied; the Step 1 ambiguities do not prevent continuing the reading.

## AMA-NOTE-006 — Key factors and specific individual elements

**Source:** User-pasted “Key Factors” passage, reviewed on 2026-10-11. The passage describes a change in 2024; exact edition/release and section number were not supplied.  
**Verification:** Source-checked against supplied excerpt; surrounding context unverified.  
**Categories:** Examination guidance; impairment classification; diagnosis guidance.  
**Disposition:** Actionable, with repeated context consolidated into earlier notes.  
**Authority:** Methodology description and explicit evidence/consistency language.

The passage describes a shift from broad key factors and grade modifiers toward specific individual elements (SIEs) of PE and relevant CS. It calls for objectively verified anatomical or physiological examination findings and relevant study data. It also states that CH must be consistent with PE, CS, and natural history in the patient's context.

**New product implication:** Preserve the individual findings needed by the applicable criteria, with their source and date, rather than relying only on broad examination/study categories or summary labels. For example, the previously supplied L2 excerpt distinguishes specific sensory findings and muscle-strength grades. The required detail should emerge from the relevant passages; this paragraph does not define a universal SIE checklist or a rating calculation.

**Consolidation:** Objective support and contextual consistency connect to AMA-NOTE-002. The aging, treatment, preexisting-condition, comorbidity, and psychosocial context repeats AMA-NOTE-003 and needs no separate rule.

**Open interpretation:** The categorical CH-consistency wording must be read alongside 17.01d's explicit allowance for row assignment when CH is inconsistent but PE and CS substantiate impairment (AMA-NOTE-004). A general principle with a specific exception is a possible reconciliation; do not encode a blanket rejection rule from this paragraph alone.

**Method boundary:** The reference to 2024 is a clue to verify, not proof of the exact source release. This passage alone does not establish that every grade/modifier step has been eliminated or define how SIEs map to rows, classes, grades, or values. Keep the older-method walkthrough separate pending the detailed methodology.

## AMA-NOTE-007 — Spine SIE evaluation worksheet

**Source:** User-supplied description of the DBI-table identification step, quoted introduction to Table 17-01g, and paraphrased column/options list; reviewed on 2026-10-11. Full table, legend, and footnotes not supplied.  
**Verification:** Checked against supplied text and table description only.  
**Categories:** Examination guidance; impairment classification.  
**Disposition:** Actionable.  
**Potential use:** Diagnosis-specific evidence worksheet or reference card.

The supplied text says a relevant DBI table uses CH, PE, and CS elements to determine the diagnostic row, class, grade, and impairment value. This expands the PE/CS emphasis in AMA-NOTE-006: CH also contributes relevant SIEs in this description.

The described Table 17-01g organizes diagnostic rows with a prefilled root and fields for study confirmation, sensory findings, tension signs, strength, atrophy, reflexes (DTR), and vertebral fracture. The introduction describes more detailed clinical distinctions behind those compact headings.

**Working interpretation:** This appears to be an evidence-collection/checking worksheet organized by diagnostic row. Start from the confirmed diagnosis and candidate applicable row/root, then document the relevant findings and compare them against the actual DBI criteria. Findings may require revisiting the candidate row. Completing the worksheet is not itself proof that a row or class qualifies, and the described columns do not show the full class/grade/value mapping.

**Description-to-field questions to resolve from the full table:**

| Field | Detail in the introduction | Unresolved representation |
| --- | --- | --- |
| Sensory | Subjective symptoms without objective loss; diminished pinprick; loss of sharp/dull discrimination, in a plausible dermatomal distribution | Do the abbreviated options capture findings or name tests? How are symptoms without objective loss recorded? |
| Tension | Signs specific to the nerve root | Where are the applicable test and root correlation specified? |
| Strength | Graded relative to normal 5/5 strength | Where are the muscle/action and root relationship specified? |
| Atrophy | Measurement in centimeters | What measurement and comparison does the table require? |
| DTR | Clinically relevant diminished or absent reflexes | What exactly does yes/no mean: an abnormality, its relevance, or another defined condition? |
| Fracture | Identification with percentage of vertebral height loss | Where is height-loss percentage recorded if the column is only yes/no? |
| Clinical studies | Confirmation of the applicable diagnosis | Which qualifying studies and corroborating details are required by each row? |

**Possible product behavior:** Use the diagnosis/row to show relevant findings and their definitions, reuse documented evidence where available, and retain source/date and unresolved findings for physician review. Keep not applicable, not assessed, undocumented, and negative distinct. This is a worksheet design candidate, not a finalized form or classification algorithm.

**Next source check:** Inspect the full table and its legend/footnotes to resolve the abbreviated options, then compare one completed example with its DBI row criteria. Do not infer missing field semantics or a universal SIE checklist from the column labels alone.

## AMA-NOTE-008 — Surgery and impairment assessment

**Source:** User-pasted “The Determination of Impairment Is Not Contingent Upon the Type of Surgery Performed,” reviewed on 2026-10-11. The passage references Sixth Edition 2008 p. 562 and 2024 terminology; exact source release/section and cited originals not independently checked.  
**Verification:** Source-checked against supplied excerpt only.  
**Categories:** Impairment classification; diagnosis guidance; special rules / reporting.  
**Disposition:** Actionable principles with substantial redundant explanatory prose.  
**Potential use:** Rating reference guidance; operative-evidence retrieval; complication review prompts.

Useful points to retain from this passage:

1. **Surgery alone does not establish greater impairment.** The operation's name or expected anatomical changes should not independently trigger an added impairment value. Apply the relevant DBI criteria to the patient's condition at rating/MMI; verify any procedure-specific instructions in those criteria.
2. **Treatment response matters.** Resolved symptoms or improved findings can affect the supported classification. Do not carry preoperative severity forward as if it necessarily describes the residual condition.
3. **Operative findings can supply diagnostic evidence.** Some SIEs expressly use findings at surgery consistent with the diagnosis. Preserve the actual finding and its source/date separately from the fact that a procedure occurred. Historical operative confirmation is not proof that the same deficit persists at rating.
4. **Residual effects of complications belong in the assessment.** Review the patient's resulting condition at MMI, including persistent functional consequences of complications. A complication label alone does not establish an automatic increment or separate rating; the applicable criteria and overlap rules remain to be read.

**Possible product behavior:** Retrieve relevant operative findings for diagnostic support, show postoperative/current findings for severity, and surface documented complications and their residual effects for review. This may reuse existing extraction and trajectory data; no new AI pass or dedicated surgery-scoring module is established by this passage.

**Wording to treat cautiously:**

- The closing slogan that surgery does not create impairment is too absolute to encode: the same passage acknowledges complications that increase functional loss.
- The opening emphasis on anatomical loss before surgery should not displace the passage's explicit instruction to assess the condition at rating, including improvement and complications.
- Routine scarring is described as generally noncontributory, while scar tissue is also listed among possible complications. Preserve the distinction between expected postoperative change and a documented consequential complication; do not automatically include or exclude all scarring.
- Statements attributing impairment primarily to the original condition do not by themselves establish legal causation or apportionment rules.

**Consolidation:** Operative diagnostic support connects to AMA-NOTE-002 and the L2 study alternatives in AMA-NOTE-001. Treatment response reinforces the plan's distinction between trajectory and current impairment findings. The repeated fairness/evidence-based language and broad ICF explanation add no separate executable rule here.

**Next source check:** When reviewing applicable DBI rows, identify any operative-confirmation criteria, procedure-related instructions, and complication/combination exceptions. No need to interrupt the reading sequence for a separate surgery algorithm.

## AMA-NOTE-009 — Impairment versus disability and work restrictions

**Source:** User's summary of a passage distinguishing impairment from disability, discussed on 2026-10-11. Exact passage, section, and release not supplied.  
**Verification:** User-summary-derived; source wording not checked.  
**Categories:** Special rules / reporting.  
**Disposition:** Informational distinction with an actionable report-design implication.

As summarized, the Guides address medically based loss of function or structure; broader disability determinations involve external factors and lie outside the impairment rating's scope.

**User-proposed report behavior:** Explain the scope of an impairment rating in the final report. The IME may separately address work restrictions or capacity when requested; that opinion should not be inferred from an impairment percentage or omitted merely because it lies outside the rating method.

**Draft wording for later review:** “The impairment rating addresses medically assessed loss of function or structure under the selected AMA Guides method. It does not itself determine disability, ability to perform a particular job, or entitlement to benefits. Any work-capacity or restriction opinions are addressed separately.”

**Implementation implication:** Keep the rating explanation separate from physician-approved work opinions. Where work restrictions are requested, capture their functional basis and relevant job demands, along with duration or reassessment when appropriate. Generate the report from those opinions rather than converting WPI into a work-capacity conclusion. Use the draft wording only when applicable to the report's actual contents.

**Next source check:** Retain the exact source locator when available. This note records a product/reporting distinction, not a jurisdiction-specific definition of disability or a benefits rule.

## AMA-NOTE-010 — DBI row identity and rating references

**Source:** User-pasted “Tables,” 17.02c “Diagnostic Rows,” and 17.02d “Diagnostic Row, Class, and Grade Label,” reviewed on 2026-10-11.  
**Verification:** Source-checked against supplied excerpt; full linked DBI table and exact release not independently checked.  
**Categories:** Impairment classification; special rules / reporting.  
**Disposition:** Actionable identifiers and reporting instruction; informational naming convention.

- Table references use a dash after the chapter number, unlike section references, which use a period. Preserve the source's exact identifiers rather than treating them as numbers or normalizing their punctuation.
- A diagnostic row has an identifier and diagnosis description. The supplied example is `17-19-05` — `Cervical Radiculopathy Involving the C3 Nerve Root`, within cervical DBI Table `17-19`.
- Diagnostic rows align CH, PE, and CS elements to support diagnostic confirmation and classification. This reinforces AMA-NOTE-002 and AMA-NOTE-007 rather than adding a separate evidence framework.
- The passage requires a specific diagnosis reference including the diagnostic row and class/grade label. Its example selects `1A` and reports `2%` whole person impairment. This value belongs to the illustrated selection, not to the row independently of class/grade. The excerpt does not supply the complete row's criteria or other values.

**Product implication:** The canonical diagnosis's proposed `ama_dx_rows` mapping links to AMA row definitions with their own `id` and `description`. A patient's rating selection separately references the row, selected class/grade, and result. Retain the source table and method/release so report generation can produce an unambiguous reference.

**Example report reference from the supplied passage:** Diagnostic row 17-19-05, Cervical Radiculopathy Involving the C3 Nerve Root, class 1A — 2% whole person impairment. This illustrates reference formatting, not an assessed patient result or a validated rating rule.

**Next source check:** Read the actual row criteria and general class/grade instructions before defining the selection logic. Keep the full `1A` label available; this passage alone does not establish a separate grade-adjustment algorithm.

## AMA-NOTE-011 — No direct DBI row: analogous diagnosis

**Source:** User-pasted paragraph on diagnoses without a direct DBI-row match, plus the user's summary of repeated SIE guidance, reviewed on 2026-10-11. Exact section/release not supplied.  
**Verification:** Source-checked against supplied paragraph; repeated introductory material is user-summary-derived.  
**Categories:** Impairment classification; special rules / reporting.  
**Disposition:** Actionable new selection pathway and documentation requirement.  
**Authority:** Explicit instruction to exercise professional judgment and document the choice.

When the diagnosis cannot be directly matched to a DBI row, the evaluator is instructed to identify the closest analogous listed diagnosis. The comparison uses CH, mechanism of injury, PE, and relevant CS elements, with natural-history consistency and accurate representation of resultant functional impairment. The impairment report must explain and justify using an unlisted diagnosis's analogue and reference the specific selected row.

**Possible product behavior:** Keep the patient's actual diagnosis distinct from the AMA row used by analogy. Allow the physician to identify an analogous selection and document its evidence and rationale; carry that distinction and row reference into the report. Candidate retrieval could assist review, but the passage delegates the choice to professional judgment and supplies no automated similarity score or selection algorithm.

**Boundaries:**

- No mapping in our `ama_dx_rows` data may be a data gap; it is not proof that no direct row exists in the applicable Guides table.
- An unlisted diagnosis is different from a listed diagnosis with partially satisfied class criteria. This passage does not settle AMA-NOTE-001's mixed-findings question.
- Choosing an analogous row does not replace the clinical diagnosis with the analogue or establish unsupported findings.

**Consolidation and product insight:** Repeated CH/PE/CS and natural-history framing adds no new confirmation rule beyond AMA-NOTE-002/003/006. The user highlights its examination-preparation value: diagnosis-specific SIE guidance can teach what to assess and why, even in cases without a rating. Keep this as an actionable use of existing notes, while distinguishing transferable clinical guidance from rating-only requirements.

**Next source check:** Capture the section locator when supplied and look for any limitations or worked examples of analogous ratings. Continue to review class-selection guidance separately.

## AMA-NOTE-012 — Root-specific radiculopathy guidance and T1 handling

**Source:** User-pasted introduction to forthcoming root-specific radiculopathy criteria, reviewed on 2026-10-11. Exact section/release not supplied.  
**Verification:** Source-checked against supplied excerpt; cited research and full rating tables not reviewed.  
**Categories:** Diagnosis guidance; examination guidance; impairment classification; special rules / reporting.  
**Disposition:** Informational preview plus an actionable rating-routing exception to investigate.

The excerpt previews PE/CS criteria for C3–C8, T1 and T2–T12, and L2–L5/S1 radiculopathy. It describes using a cluster of physical and diagnostic findings to diagnose radiculopathy; retain that as the passage's stated approach, not an independently verified claim about the current research consensus or a checklist supplied here.

**T1 exception:** The passage says T1 pathology is rated similarly to cervical spine pathology because of its effects on upper-limb function, while T2–T12 is rated separately in the DBI table. This reinforces that the app's anatomical regions and the applicable rating guidance may not align one-to-one. Preserve T1 anatomy; do not reassign its clinical region or infer a particular table ID from “similarly.” Read the actual T1 instructions before deciding routing behavior.

**Educational context, separate from the Guides excerpt:** Radiculopathy describes a nerve-root disorder that can arise from different underlying conditions, including disc herniation or degenerative narrowing. The affected root helps explain the pattern of findings. It is not a universal label for spine pain. See [AAOS cervical radiculopathy](https://www.orthoinfo.org/diseases--conditions/cervical-radiculopathy-pinched-nerve/) and [AAPM&R lumbar radiculopathy](https://now.aapmr.org/lumbar-radiculopathy/).

**Product implication:** Preserve the distinction between underlying pathology, the associated nerve-root syndrome, and its specific level/findings. The many root-specific rating rows do not alone justify replacing all spine diagnoses with radiculopathy or splitting every care-taxonomy concept by root.

**Next source check:** Read root-specific criteria and T1 table/routing instructions. Treat the listed roots as the scope of this preview, not an exhaustive claim about possible clinical diagnoses.

## AMA-NOTE-013 — Lumbar diagnostic patterns and combination/routing instructions

**Source:** User-pasted “Instructions for Lumbar Spine” within “Diagnostic Patterns in the Spine,” plus the user's description of the following lumbar impairment-combinations summary; reviewed on 2026-10-11. Exact section/release not supplied.  
**Verification:** Lumbar instructions checked against supplied excerpt. The combinations subsection has not yet been supplied in full; its cauda equina example is user-reported.  
**Categories:** Diagnosis guidance; examination guidance; impairment classification; special rules / reporting.  
**Disposition:** Actionable evidence requirements, rating-basis instructions, and combination/routing rules.

From the supplied lumbar instructions:

- Sensory/motor deficits must follow a neuroanatomically plausible dermatomal/myotomal distribution, supported by objective anatomical and/or physiological clinical studies. The text expressly allows some overlap between patterns; do not encode rigid, non-overlapping anatomical boundaries.
- Lumbar disc herniation, foraminal or lateral-recess spinal stenosis, and degenerative spondylolisthesis are described as rated based on radiculopathy. This is a rating-basis instruction, not a statement that every patient with those diagnoses necessarily has radiculopathy. The passage does not explain the no-radiculopathy case.
- For fracture or AOMSI with radiculopathy or myelopathy, the supplied text directs combining radiculopathy WPI with fracture/AOMSI WPI. Preserve that wording for review: its reference to myelopathy followed by a radiculopathy component needs context from the following summary. No combination formula is supplied; do not assume ordinary addition.

**Following subsection, awaiting full text:** “Summary of Possible Impairment Combinations for Lumbar Spine Based on the SIEs [in] the DBI table for Lumbar Spine Impairment.” The user describes diagnosis-specific routing between the spine and CNS chapters and gives the example that lumbar cauda equina syndrome is rated only in Chapter 13. Retain that as a reported routing instruction pending the complete passage and exceptions.

**Product implication:** The canonical-diagnosis-to-AMA-row mapping will not by itself express all rating behavior. Guidance may also identify the rating basis, direct the evaluator to another chapter, or permit/require combinations. First capture these instructions as a readable matrix: clinical condition, qualifying findings, destination chapter/table, components to combine or exclude, and source/exception. Defer the executable representation until the subsection is reviewed.

**Next reading:** Obtain the full combinations subsection with headings, notes, footnotes, and cross-references. Resolve the myelopathy wording, no-radiculopathy cases, and combination method from applicable instructions rather than inference.

## AMA-NOTE-014 — Lumbar impairment routing and combinations: first rows

**Source:** User-supplied first rows of the lumbar combinations summary, reviewed on 2026-10-11. Full original table layout, section locator, footnotes, and remaining rows not supplied.  
**Verification:** Checked against supplied rows; potentially ambiguous wording retained below.  
**Categories:** Impairment classification; special rules / reporting.  
**Disposition:** Actionable routing, combination permissions, and exclusions. Myelopathy/structural routing subsequently clarified in AMA-NOTE-019; cauda equina/structural routing still needs clarification.

The following matrix transcribes the supplied directions without resolving ambiguities by inference. “Combined” does not establish the mathematical combination method or calculation order.

| Condition / combination | Direction supplied | Status / limits |
| --- | --- | --- |
| Lumbar radiculopathy | Chapter 17 only | Explicit |
| Lumbar spinal fracture | Chapter 17 only | Explicit |
| Lumbar AOMSI | Chapter 17 only | Explicit |
| Lumbar myelopathy | Chapter 13 only | Explicit for myelopathy alone |
| Radiculopathy + fracture OR AOMSI | Chapter 17 | Fracture and AOMSI cannot both be included in this stated combination |
| Radiculopathy + myelopathy | Chapter 17 radiculopathy may be combined with myelopathy | Myelopathy is assigned Chapter 13 elsewhere in the supplied rows |
| Myelopathy + fracture OR AOMSI | Myelopathy uses Chapter 13; fracture/AOMSI uses Chapter 17 | Resolved by later detailed description (AMA-NOTE-019): select the higher supported fracture/AOMSI value, then combine with myelopathy |
| Radiculopathy + fracture OR AOMSI + myelopathy | Chapter 17 radiculopathy/structural components may also be combined with Chapter 13 myelopathy | Fracture OR AOMSI, not both |
| Lumbar stenosis with neurogenic claudication | Diagnostic row `17-21-10` | Explicit; inspect row criteria before use |
| Lumbar cauda equina syndrome | Chapter 13 only | Explicit for syndrome alone |
| Cauda equina syndrome + fracture OR AOMSI | Cauda equina residuals remain in Chapter 13 in the later description; structural combination refers to Chapter 17 | Later description introduces unexplained radiculopathy components; exact composition unresolved (AMA-NOTE-021) |
| Lumbar plexus injury | Heading specifies DBI Table `16-23j`, Lumbosacral Plexus Impairment | May combine with Chapter 17 fracture OR AOMSI and Chapter 13 myelopathy if not duplicative; later body contradicts the heading's routing (AMA-NOTE-021) |

**Rules to preserve:**

- In the stated structural combinations, fracture and AOMSI are alternatives, not two components to include together. This is a rating-combination exclusion, not a claim that both conditions cannot coexist clinically.
- Preserve “may combine” as permission; do not turn it into a requirement to produce every component.
- The plexus row explicitly conditions the additional myelopathy combination on avoiding duplication. Retain that condition and obtain any broader overlap rules from the source rather than inventing them.
- Stenosis with neurogenic claudication has its own explicit row here. Read this alongside AMA-NOTE-013's radiculopathy-based instruction for foraminal/lateral-recess stenosis; preserve the clinical presentation and subtype rather than flattening all stenosis into one rating pathway.

**Subsequent clarification:** AMA-NOTE-019 resolves myelopathy/structural routing and supplies the sequence for radiculopathy + structural impairment + myelopathy. It also specifies choosing the higher fracture/AOMSI value in these described combinations.

**Unresolved source checks:** Cauda equina + structural injury instructions; mathematical combination operation and rounding; scope of exclusions across multiple lesions/levels; remaining rows and general duplication rules. The broad wording in AMA-NOTE-013 should now be read alongside the explicit component rules in AMA-NOTE-019.

**Product implication:** Region-scoped care analysis can lead to rating references in Chapters 13, 16, or 17. Keep anatomical diagnosis, rating destination, and approved components distinguishable. This matrix is reference planning data; the ambiguous entries are not executable routing rules.

## AMA-NOTE-015 — Lumbar combinations involving chronic spinal infection

**Source:** User-supplied continuation of lumbar combination rows, reviewed on 2026-10-11; exact row locators not supplied.  
**Verification:** Checked against supplied text; full table context and referenced criteria not reviewed.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable, with duplicates consolidated.

For brevity only within this note, **qualifying infection** means the full condition stated in the passage: deep spinal wound infection due to chronic osteomyelitis requiring chronic suppressive antibiotic therapy for six months or longer. Do not reduce this to any postoperative infection or assume the text requires six months of therapy already completed.

| Combination | Direction supplied | Limits / unresolved interpretation |
| --- | --- | --- |
| Radiculopathy + qualifying infection | Chapter 17 | Appears twice identically; retained once |
| Myelopathy + qualifying infection | Myelopathy labeled Chapter 13, followed by “is rated in Chapter 17” | Component-versus-whole ambiguity remains for this infection combination. AMA-NOTE-019 resolves the analogous structural combination, but the infection-specific description is still needed |
| Radiculopathy + fracture OR AOMSI | May also combine with qualifying infection (Chapter 17) and myelopathy (Chapter 13) | Fracture OR AOMSI, not both; preserve permission rather than automatically adding components |
| Cauda equina syndrome + fracture OR AOMSI + qualifying infection | Cauda equina described as Chapter 13 only, then “use Chapter 17” for the combination | Scope of Chapter 17 instruction unresolved; fracture OR AOMSI, not both |
| Plexus injury | Table `16-23j`; may combine with fracture OR AOMSI, qualifying infection (Chapter 17), and myelopathy (Chapter 13) if not duplicative | Preserve nonduplication condition and structural exclusion; this is not blanket permission for every conceivable subset |

The repeated standalone Chapter 17 statements for radiculopathy and fracture add nothing to AMA-NOTE-014. Infection combinations extend AMA-NOTE-008's complication review, but provide no standalone infection percentage or calculation order. Obtain the actual infection criteria and resolve the ambiguous chapter directions before implementation.

## AMA-NOTE-016 — Bilateral and multiple-root lumbar radiculopathy

**Source:** User-supplied paragraph following “Lumbar Radiculopathy is only rated in Chapter 17,” reviewed on 2026-10-11. Exact paragraph locator not supplied.  
**Verification:** Checked against supplied text; combination method and surrounding limits not reviewed.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable calculation instructions with remaining boundary questions.

- **Bilateral involvement:** The paragraph accounts for each side's nerve-root impairment at 100% of its assigned value and combines the values. This means retaining the full assigned value, not assigning 100% WPI.
- **Two or more roots on one side:** Retain the largest impairment at 100% of its assigned value; adjust each additional root impairment to 50% of its assigned value, then combine with the higher value.
- **Limit:** This paragraph introduces 33% WPI in the same-side multi-root discussion. Later additional instructions expressly describe it as the lumbar spine maximum (AMA-NOTE-022), broadening the stated scope beyond this paragraph. Application to cross-chapter components, conversion, and intermediate calculation stages still needs clarification.

**Open calculation details:** Confirm the combination operation and rounding, ordering of additional roots, how the 33% limit applies in bilateral multi-root cases, and the sequence for combining other permitted components. Do not use ordinary addition or invent a grouping order from this paragraph.

**Product implication:** A single selected AMA row/value for the whole region will not represent every permitted result. Retain each root, side, supported row/class/value, applied weighting, and calculation provenance as a planning requirement. The final data shape remains undecided.

## AMA-NOTE-017 — Fracture selection within and across spine regions

**Source:** User-supplied `17-21b02` paragraph, reviewed on 2026-10-11.  
**Verification:** Checked against supplied text; region-specific SIE criteria not supplied.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable selection and combination instructions.

The paragraph addresses fractures **without associated radiculopathy or myelopathy**. Rate using the applicable region's SIE criteria. When multiple fractures are present, select only the highest fracture impairment within each spinal region. Ratings from different spinal regions may then be combined if necessary, proceeding from the highest to the next highest.

**Product implication:** Preserve all clinical fracture findings, but select one highest supported fracture rating per region for this described pathway. Cross-region combination follows regional selection; it must not sum every fracture or discard all but the single highest fracture across the whole spine.

**Boundary:** Do not assume this paragraph alone resolves selection behavior for fractures accompanied by neurological impairment. Read with AMA-NOTE-014/015 and relevant general instructions. The combination operation and rounding remain to be sourced.

## AMA-NOTE-018 — Lumbar AOMSI evidence and measurement thresholds

**Source:** User-numbered item 1, detailed lumbar AOMSI instructions, reviewed on 2026-10-11. References figures `17f03a2m2` (translation) and `17f03a2m3` (angular motion). User item numbers are not source identifiers.  
**Verification:** Checked against supplied excerpt; figures and full measurement protocols not reviewed.  
**Categories / disposition:** Diagnosis guidance; examination/clinical-study guidance; impairment classification. Actionable criteria requiring measurement context.

AOMSI is assigned to Chapter 17. Subsequent methodology explicitly clarifies that AOMSI includes both fusion and qualifying instability (AMA-NOTE-031); the detailed lumbar section also identifies developmental fusion, arthrodesis attempts including dynamic stabilization, and preserved motion with arthroplasty as alternatives (AMA-NOTE-032). Do not require abnormal motion for all pathways. Applicable DBI SIEs still govern class/value.

Translation thresholds in the supplied text use **relative percentages**, not millimeters:

| Location | Anterior translation on flexion | Posterior translation on extension |
| --- | --- | --- |
| Lumbar L1–L5 | Greater than 8% | Greater than 9% |
| L5–S1 (L5 on S1) | Greater than 6% | Greater than 9% |

The paragraph presents anterior or posterior translation as alternatives. Preserve strict “greater than” comparisons, not greater-than-or-equal. The denominator, landmarks, and measurement method must come from the referenced figure/protocol.

| Motion segment | Angular threshold stated |
| --- | --- |
| L1–L2, L2–L3, L3–L4 | Greater than 15° |
| L4–L5 | Greater than 20° |
| L5–S1 | Greater than 25° |

Preserve the text's qualification **“compared with adjacent level angular motion.”** The full protocol must clarify how the measured angle and adjacent-level comparison determine qualification; do not implement these numbers as an isolated absolute-angle check. Lumbar angular assessment uses both flexion and extension films and explicitly differs from the cervical method.

**Product implication:** Relevant guidance may prompt review of level-specific dynamic imaging measurements and their technique, units, and source. This can support evidence review without generating a blanket recommendation for new imaging. Do not reuse these thresholds or measurement methods for cervical/thoracic regions.

**Next source checks:** Referenced figures; relationship between translation/angular and postoperative pathways; applicable row/class criteria. These thresholds identify candidate diagnostic evidence, not a WPI value by themselves.

## AMA-NOTE-019 — Clarified component routing, structural selection, and sequence

**Source:** User-numbered items 2–6 with detailed descriptions, reviewed on 2026-10-11; exact source locators not supplied except myelopathy's cross-reference to Chapter 13, Section `13.4e-2`, “Spinal Cord Injury.”  
**Verification:** Checked against supplied descriptions; Chapter 13 criteria and combination mathematics not reviewed.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable; resolves part of AMA-NOTE-014.

Use `R` for supported radiculopathy impairment from Chapter 17, `M` for supported myelopathy impairment from Chapter 13, and `S` for the higher supported fracture or AOMSI impairment from Chapter 17 when those alternatives apply. This notation summarizes the passages; it is not a production schema. Preserve both clinical diagnoses when present even though only the higher structural impairment is used.

| Supplied item | Component rule |
| --- | --- |
| 2. Myelopathy | Chapter 13, Section 13.4e-2 |
| 3. Radiculopathy + structural impairment | Determine components separately; combine `R` with `S`, higher value first |
| 4. Radiculopathy + myelopathy | Determine `R` and `M` under their respective chapters, then combine higher value first |
| 5. Myelopathy + structural impairment | Determine `M` under Chapter 13 and `S` under Chapter 17, then combine higher value first |
| 6. Radiculopathy + structural impairment + myelopathy | First combine `R` with `S`; then combine that result with `M`, using the higher value first at each step |

**Resolved:** “Whichever is highest” selects between fracture and AOMSI; it does not choose between radiculopathy and the structural impairment. The myelopathy/structural headline does not move myelopathy into Chapter 17: its description explicitly retains Chapter 13 for that component. Item 6's detailed ordering retains the radiculopathy/structural grouping before adding myelopathy; do not replace it with an assumed global sort.

**Still open:** Mathematical combination operation, intermediate rounding, equal-value structural selection/documentation, and interaction with multiple-root weighting/caps. This clarification does not itself resolve cauda equina or infection combinations. The prose's phrase about additive effects does not supply an ordinary-addition formula.

**Consolidation:** Apply these descriptions to the relevant earlier matrix entries. Retain the component provenance and calculation sequence in the proposed rating design; no new AI pass is implied.

## AMA-NOTE-020 — Stenosis/claudication overlap and WPI combination units

**Source:** User's final lumbar combination excerpts, item 1 and paragraph following item 4, reviewed on 2026-10-11.  
**Verification:** Checked against supplied text; actual row criteria not reviewed.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable.

- Row `17-21-10`, Lumbar Stenosis and Neurogenic Claudication, may combine with row `17-21-09`, Lumbar Spine Fracture, if appropriate.
- The example compares qualifying multilevel stenosis/claudication (`17-21-10`, class 1B, 4% WPI) with qualifying single unilateral L5 radiculopathy (class 1A, 2% WPI). Select the larger impairment that represents functional loss without duplication; only one impairment may be used for those overlapping alternatives. Do not read that last sentence as prohibiting the separately permitted fracture combination or as a general maximum-only rule for all diagnoses.
- The excerpt explicitly states that all DBI Table `17-21` values are WPI. It also permits combining multiple nonduplicative DBI impairments in one spine region at the whole-person level. This is not blanket permission to combine every diagnosis; preserve specific exclusions and eligibility rules.

**Product implication:** Record units and overlapping functional effects alongside component values. For this example, retain the selected alternative and reason for excluding the other. The mathematical combination method/rounding is still not supplied.

## AMA-NOTE-021 — Cauda equina and plexus descriptions with conflicting text

**Source:** User's final lumbar combination excerpts, items 2–4, reviewed on 2026-10-11.  
**Verification:** Checked against supplied wording; no silent corrections.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable intent, with internally inconsistent instructions unresolved.

**Cauda equina:** The standalone and combination descriptions both explicitly assign residuals from a lumbar lesion to Chapter 13. The combination description says that when the syndrome results from fracture/AOMSI, values for “radiculopathy and fractures or radiculopathy and lumbar AOMSI” are combined, with the higher alternative used with cauda equina. Radiculopathy appears without an explanation of its eligibility or overlap with the cauda equina residuals. Preserve the stated causal condition and flag the composition; do not automatically add a radiculopathy component or silently reduce the instruction to cauda equina plus structural impairment.

**Plexus:** The heading routes lumbar plexus injury to Table `16-23j`; the body instead says lumbar plexus impairment is evaluated under Chapter 17. The main sequence describes combining plexus with fracture OR lumbar AOMSI (not both), then with Chapter 13 myelopathy, higher value first at each step, if not duplicative. A later sentence abruptly substitutes radiculopathy and **cervical** AOMSI. These are apparent editorial/template errors, but the intended correction is not verified.

**Retain pending source review:** Heading's table reference; conditional combination permissions; structural exclusion; nonduplication requirement; provisional main sequence. Do not treat the conflicting chapter reference, added radiculopathy, or cervical wording as executable rules. The body does not cleanly establish a highest-fracture/AOMSI selection rule for plexus, despite the contaminated sentence.

**Next source checks:** Actual table/row definitions, original layout and any errata; eligibility and overlap of cauda equina/radiculopathy; plexus units and any necessary conversion before WPI combination. Chapter 17's WPI statement does not establish the units of Table `16-23j` or every Chapter 13 result.

## AMA-NOTE-022 — Lumbar maximum, standalone nonspecific rating, and suspect references

**Source:** User's final lumbar combination excerpts, item 5 “Additional Instructions,” reviewed on 2026-10-11.  
**Verification:** Checked against supplied text; cited 2008 table and current row/section references not independently reviewed.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable limits with reference/scope conflicts.

- **Lumbar maximum:** The passage expressly states a 33% WPI maximum for the lumbar spine, retained from the prior edition. Update AMA-NOTE-016's earlier uncertainty accordingly: the wording here is regional, not confined to same-side nerve roots. Still establish how it applies to components rated in other chapters, conversion, and calculation stages; do not impose it on the whole case or other regions.
- **Nonspecific rating:** The passage describes a one-time, once-in-a-lifetime 1% rating that must stand alone and cannot be added, combined, reapplied, or reconsidered in later evaluations. It names `17-20-02 Nonspecific Lumbar Spine` but then prohibits combining with **cervical** ratings. Preserve the intended standalone/lifetime restriction as a candidate rule; correct row identity and exact regional scope require verification.
- **Lumbar/pelvic eligibility:** The next sentence limits the lumbar/pelvic option to lumbar or pelvic nonspecific pain. It does not settle whether the lifetime restriction is shared across regions, whether lumbar and pelvic are mutually exclusive, or how prior awards are established.
- **Electrodiagnostic reference:** The text describes criteria for spinal radiculopathy but points to `17.06f Electrodiagnostic Verification of Lumbosacral Plexopathy`. Flag the mismatch between the condition and the section title; do not substitute a guessed reference.

**Product implication:** Eventually represent the verified regional cap and a separately constrained nonspecific-rating pathway. A lifetime rule would need prior-rating information beyond the current case; unknown history must not silently establish eligibility. Defer detailed implementation until the row, scope, and instructions are confirmed.

## AMA-NOTE-023 — Jurisdiction-specific extremity conversion

**Source:** User's final lumbar combination excerpts, item 6 “FECA Converting a Spine Impairment Rating to an Extremity Impairment,” reviewed on 2026-10-11.  
**Verification:** Checked against supplied excerpt only; current FECA requirements not researched or established here.  
**Categories / disposition:** Special rules / reporting; impairment classification. Actionable routing to conversion guidance, not a conversion formula.

The passage identifies FECA as a context for expressing spinal radiculopathy impairment in extremity terms and refers to Section `17.14h Regional Spine Impairment for Radiculopathy` for method and maximum upper/lower-limb values.

**Product implication:** Applicable reporting regime may affect output units and conversion steps. Preserve the source rating, conversion basis, and final unit distinctly; do not relabel WPI as extremity impairment or assume a numerical conversion. Review the cited method and applicable requirements if FECA enters implementation scope. This is a source-derived planning note, not independently verified legal guidance.

## AMA-NOTE-024 — Cervical and thoracic AOMSI: shared thresholds, regional scope

**Source:** User-pasted thoracic and cervical AOMSI instructions, reviewed on 2026-10-11. Cervical text cites Figure `17f03a2m1`, Loss of Motion Segment Integrity; thoracic text mentions a figure without an identifier.  
**Verification:** Checked against supplied excerpts; figures and full diagnostic-row criteria not reviewed.  
**Categories / disposition:** Diagnosis guidance; examination/clinical-study guidance; impairment classification. Actionable criteria, consolidated across these two supplied regions only.

Both excerpts assign AOMSI to Chapter 17 and give the following identical measurement criteria. **Subsequent review:** The detailed thoracic section supplies materially different criteria (AMA-NOTE-032). The shared numbers below remain a record of the earlier excerpts, not usable thoracic thresholds. Cervical criteria are reinforced by the detailed cervical section.

| Element | Supplied criterion for cervical and thoracic AOMSI |
| --- | --- |
| Translation | Greater than 20% relative translation, anteriorly OR posteriorly, on static/resting, flexion, OR extension radiographs |
| Relative translation calculation | `100 × measured translation / superior mid-vertebral body diameter` |
| Angular motion | Difference greater than 11° in angular motion at adjacent levels on the flexion radiograph |

Preserve strict greater-than comparisons: exactly 20% or exactly 11° does not exceed the stated threshold. The angular criterion concerns an adjacent-level difference on a flexion image; do not substitute a standalone segment angle or a flexion-to-extension difference. Confirm landmarks and technique from the figure before implementing measurement evaluation. The later cervical section explicitly makes translation and angular motion alternatives and specifies comparison with each adjacent level (AMA-NOTE-032); do not transfer that clarification to the conflicting thoracic excerpt.

**Surgical-status wording differs:**

- Thoracic: diagnosis consistent with fusion at one or multiple levels.
- Cervical: diagnosis consistent with fusion or arthroplasty at one or multiple levels.

Subsequent methodology clarifies that fusion and qualifying instability both fall under AOMSI (AMA-NOTE-031); do not require postoperative hypermobility for the fusion pathway. The detailed cervical section also explicitly includes preserved motion with arthroplasty (AMA-NOTE-032). Applicable DBI SIEs still govern class/value. The absence of thoracic arthroplasty from these passages is not an explicit prohibition.

**Regional comparison:** These cervical/thoracic thresholds differ from the lumbar level-specific translation percentages and angular thresholds in AMA-NOTE-018. Lumbar angular assessment expressly uses both flexion and extension films; the supplied cervical/thoracic angular criterion specifies adjacent-level comparison on flexion. Do not import lumbar thresholds or substitute its measurement method. The percentage denominator supplied here is verified for these excerpts only; do not silently fill the missing lumbar protocol from it.

**Next source checks:** Measurement figures, relationship of surgical status to measured instability, translation/angular qualification logic, and applicable row/class values. The rest of the cervical/thoracic combination sections remains deferred rather than treated as reviewed or identical to lumbar.

## AMA-NOTE-025 — General spine concepts: imaging and clinical relevance

**Source:** User-pasted “Spine Considerations (all regions included),” subsection “General Concepts for Spine,” reviewed on 2026-10-11. Exact section/release not supplied.  
**Verification:** Checked against supplied passage; epidemiological claims not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; impairment classification. Informational background plus actionable rating guidance.

The passage characterizes disc herniation, stenosis, degenerative spondylolisthesis, spondylolysis, and isthmic spondylolisthesis as most often aging-related with genetic predisposition, and notes their occurrence in asymptomatic adults. Its explicit rating implication is that imaging findings alone are insufficient to establish impairment or a rating.

**Possible product behavior:** Show structural imaging findings alongside the clinical presentation and relevant functional effects. Prompt review of whether a finding explains the presentation; do not infer impairment, symptoms, individual aging/genetic causation, or incident attribution from imaging alone. Preserve these as the source's background claims, not a patient-specific conclusion or verified current research consensus.

**Scope qualification:** The general paragraph broadly associates symptomatic spinal conditions (apart from some fractures) with radiculopathy/myelopathy. The more specific stenosis subsection below describes central canal stenosis with neurogenic claudication, potentially without reliable objective PE findings and explicitly without radiculopathy. Use the specific guidance for that pathway; do not turn the general sentence into a universal diagnosis or rating gate. This is an example of clarifying material elsewhere limiting a broad statement, rather than automatically discarding the entire paragraph.

## AMA-NOTE-026 — Disc herniation: background, diagnostic correlation, and causation

**Source:** Same user-supplied batch, subsection “Disc Herniation,” reviewed on 2026-10-11. Reference 22 and exact section not supplied.  
**Verification:** Checked against supplied text; referenced research not reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; causation/apportionment; impairment classification. Informational claims with actionable correlation guidance.

- The passage says most adult disc herniations are degenerative, are common in asymptomatic imaging, and cannot be tied to a specific traumatic episode. These are population-level claims, not a determination of causation in any individual case.
- It describes traumatic herniation as occurring with a traumatic event and says most are diagnosed by MRI in the acute post-traumatic setting. This does not by itself make MRI timing a definitive causal test, prove that a newly imaged lesion is newly caused, or exclude trauma when acute imaging is absent.
- For associated impairment, the passage requires accompanying neurologic findings rather than the imaging finding alone. Preserve this diagnosis-specific instruction; it does not specify all qualifying findings or their class/value mapping here.

**Possible product behavior:** Retrieve the guidance during diagnosis review and exam preparation; show symptom/event chronology, available earlier and later imaging, and relevant neurologic findings for physician interpretation. Distinguish reported symptoms, objective findings, and unassessed items. Do not auto-label the case degenerative/nontraumatic or derive an apportionment percentage from these background statements.

**Next source checks:** Reference 22 if needed to substantiate the background claims, plus diagnosis/root-specific criteria for the actual impairment assessment.

## AMA-NOTE-027 — Stenosis subtypes, course, and rating conditions

**Source:** Same user-supplied batch, subsection “Spinal Stenosis,” reviewed on 2026-10-11. Exact section/release not supplied.  
**Verification:** Checked against supplied excerpt; quoted natural-history proportions and underlying studies not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; examination guidance; causation/apportionment; impairment classification. Actionable subtype distinctions and rating conditions plus informational natural history.

| Subtype / presentation | Guidance in the supplied passage |
| --- | --- |
| Cervical central stenosis with myelopathy | Myelopathy rated in Chapter 13 |
| Symptomatic cervical foraminal/lateral-recess stenosis | Chapter 17 according to radiculopathy |
| Lumbar central canal stenosis with neurogenic claudication | Imaging must explain consistently reported symptoms; reliable objective PE findings may be absent. A without-radiculopathy pathway is explicitly described |
| Symptomatic lumbar foraminal/lateral-recess stenosis | Chapter 17 according to radiculopathy |

**Clinical background:** The passage describes degenerative narrowing, with cervical disease often spreading from lower levels and lumbar degeneration predominating at the lower three levels. It describes lumbar stenosis natural history as poorly understood: about half stable and about a quarter each worsening or improving, with unpredictable individual flares and stable periods. Retain as source-reported background; do not use these proportions to predict a patient's course or establish MMI from one stable interval.

**Explicit rating conditions to retain:** The lumbar discussion states that a medically documented injury is necessary for impairment rating. It then specifically requires a discrete event precipitating symptoms for rating symptomatic lumbar central canal stenosis, with CH, PE, and relevant CS judged consistent with the diagnosis and natural history at the current evaluation, with or without surgery. These are rating conditions stated by this passage, not universal prerequisites for diagnosing stenosis, acknowledging symptoms, or evaluating care. Preserve the wording and scope rather than expanding it to all spinal diagnoses or substituting an independently verified legal rule. Absence of reliable objective PE findings is not, by itself, the same as an inconsistent examination.

**Reference conflict:** This excerpt names `17-21-s09` for lumbar stenosis with neurogenic claudication without radiculopathy. Earlier excerpts name `17-21-10` for stenosis/claudication and `17-21-09` for fracture (AMA-NOTE-020). The source has not established whether `17-21-s09` is an error or a distinct identifier. Under the editorial exclusion policy, this disputed identifier provides no usable routing instruction pending clarification; retain the otherwise clear clinical pathway. Check the actual DBI table before settling the authoritative mapping, and do not silently normalize or guess the ID.

**Possible product behavior:** Ask which anatomical narrowing and clinical syndrome are present; surface the relevant symptom history, imaging correlation, and neurologic examination guidance. For the claudication pathway, distinguish absent reliable objective signs from missing assessment and from contrary evidence. If rating is requested, separately surface the documented injury/precipitating-event criteria and supporting history for physician review. This is a candidate for existing preparation/decision workflows, not a new AI pass.

**Next source checks:** Actual claudication DBI row, qualifying symptom/history criteria, scope of the injury/event requirement and any exceptions. The full cervical/thoracic combinations remain deferred; these supplied cervical stenosis instructions are reviewed in their own right.

## AMA-NOTE-028 — Cervical degenerative spondylolisthesis

**Source:** User-pasted “Degenerative Spondylolisthesis (Cervical Spine),” reviewed on 2026-10-11; exact section/release not supplied.  
**Verification:** Checked against supplied text; natural-history claims not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; impairment classification. Informational background plus actionable rating basis.

The passage describes anterior/posterior vertebral slippage as an aging-associated radiographic finding related to advanced lower-cervical disc degeneration, usually stable over time. It directs rating based on neurologic findings of radiculopathy or myelopathy.

**Possible product behavior:** Present the radiographic finding with relevant neurologic evidence and retrieve the applicable pathway. The reported tendency toward stability is context, not proof of this patient's MMI or stable symptoms. Do not infer clinical impairment or incident attribution from the slip alone. This cervical passage contains no discrete-event requirement; do not copy the lumbar requirement into it.

## AMA-NOTE-029 — Lumbar degenerative spondylolisthesis and alternative rating pathways

**Source:** User-pasted “Degenerative Spondylolisthesis (Lumbar Spine),” reviewed on 2026-10-11; exact section/release not supplied.  
**Verification:** Checked against supplied text; epidemiology and natural-history claims not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; examination guidance; impairment classification. Informational background plus actionable rating conditions/pathways.

**Background:** The passage attributes the slip to longstanding instability, associates it with disc degeneration, facet osteoarthritis, and stenosis, and describes L4–L5 and women as more commonly affected. These describe source-reported patterns, not eligibility restrictions, individual causation, or proof of current AOMSI.

**Explicit rating condition:** A discrete event precipitating symptoms is required to rate symptomatic lumbar degenerative spondylolisthesis. At evaluation, CH, PE, and relevant CS should be consistent with the diagnosis and its natural history, with or without surgery. Keep this a source-stated rating condition, separate from diagnosis, treatment assessment, and a conclusion that the event caused the underlying structural slip.

| Presentation / evidence | Rating pathway described |
| --- | --- |
| Neurogenic claudication associated with central canal stenosis | Neurogenic-claudication impairment |
| Radiculopathy | Lumbar-radiculopathy impairment |
| Documented instability meeting the defined AOMSI criteria | AOMSI section |

**Possible product behavior:** For the same canonical diagnosis, surface the clinical syndrome, relevant neurologic evidence, and any documented qualifying instability. The description of longstanding instability does not automatically satisfy AOMSI measurement criteria. Use the actual source findings and the AOMSI instructions (AMA-NOTE-018).

**Consolidation:** This specific passage expands AMA-NOTE-013's broad radiculopathy-based statement for degenerative spondylolisthesis. Preserve the claudication and qualifying-AOMSI pathways. It does not itself authorize combining all three, prescribe highest-value selection among them, or define their priority; apply separately established combination/overlap rules only within their verified scope. The claudication row identifier conflict in AMA-NOTE-027 remains unresolved.

## AMA-NOTE-030 — Spondylolysis and isthmic spondylolisthesis

**Source:** User-pasted “Spondylolysis and Isthmic Spondylolisthesis,” reviewed on 2026-10-11; exact section/release not supplied.  
**Verification:** Checked against supplied text; prevalence and association claims not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; impairment classification. Informational definitions plus actionable rating basis.

The passage defines spondylolysis as a pars interarticularis defect, most often in the lowest lumbar vertebrae, and spondylolisthesis as displacement of one vertebral body relative to the one below. It identifies both pars defects and degenerative changes as common etiologies of spondylolisthesis. These names distinguish a defect, displacement, and its underlying type; do not collapse them into synonyms.

The passage emphasizes asymptomatic occurrence and says their relationship to clinically significant low-back pain has not been established. Preserve that statement as general background; it does not establish that a particular patient's finding is irrelevant or could never contribute to symptoms.

**Explicit rating basis:** Impairment associated with spondylolysis and isthmic spondylolisthesis is determined by radiculopathy. The paragraph does not provide percentages, new combination permissions, or an independent rating for the imaging finding alone.

**Possible product behavior:** Clarify the diagnosed subtype and supporting clinical findings; use root-specific guidance when radiculopathy is being assessed. Do not silently transfer lumbar degenerative spondylolisthesis's discrete-event requirement or alternative AOMSI/claudication pathways to this subsection.

## AMA-NOTE-031 — AOMSI methodology: fusion, instability, and acceptable evidence

**Source:** User-pasted “AOMSI—Methodology for Measuring AOMSI,” including flattened Table `17-03a2m`, reviewed on 2026-10-11. Passage references Sections `17.03a2m1` through `17.03a2n`.  
**Verification:** Checked against supplied text; original table layout, measurement figures, and cited studies not independently reviewed.  
**Categories / disposition:** Diagnosis guidance; examination/clinical-study guidance; causation/apportionment; impairment classification. Actionable methodology with several unclear or conflicting details excluded pending clarification.

### Clarified definition and pathways

AOMSI includes **fusion and instability that meets the specified criteria**. Single- and multiple-level surgical fusions are rated using the DBI AOMSI SIEs. Instability qualifies only when it meets all applicable SIE criteria; clinical labels such as instability or micromotion alone do not establish this. This resolves the fusion-versus-hypermobility question in AMA-NOTE-018/024, but does not establish an automatic fusion percentage or the detailed arthroplasty pathway.

### Evidence requirements stated in this passage

- For permanent impairment attributable to **instability**, use flexion and extension radiographs performed **at or after confirmed MMI**. Earlier films may remain historical evidence but do not satisfy this stated timing requirement by themselves. Do not apply this instruction automatically to fusion rating or all diagnostic imaging.
- Measure consistent vertebral-body landmarks on focused segment films centered on the abnormal segment. Whole-spine films used for sagittal balance/alignment assessment are expressly unsuitable for establishing instability for impairment.
- Exclude poor-quality films from measurement-based qualification. The passage also expressly disallows videofluoroscopy, digital fluoroscopy, and upright/motion MRI for establishing AOMSI permanent impairment. Preserve the named modalities and scope; do not extend the exclusion to ordinary digital radiographs or other clinical uses.
- Qualification requires exceeding the applicable stable-motion limits, not merely equaling them. Relevant regional criteria and measurement technique must both be established.

**Clinical context:** The discussion distinguishes loss of sagittal balance/alignment (LOSA) from AOMSI instability and describes standing whole-spine lateral imaging in that context. It also mentions normal multilevel motion in younger individuals, ligamentous laxity, and preexisting/compensatory motion as interpretive context. It distinguishes potentially rateable preexisting findings from impairment caused by a minor trauma. These statements do not supply a patient-specific causation conclusion.

### Source conflicts and missing measurement context

| Issue | What to preserve / how to handle it |
| --- | --- |
| Introductory list says its bullets are required criteria, but includes normal motion patterns and preexisting changes | Retain the readable contextual cautions; exclude the malformed implication that every patient must have these patterns to qualify. No invented positive/negative diagnostic rule |
| Thoracic stable-motion table lists 2.5 mm anterior, 2.5 mm posterior, 5.0 mm total; earlier thoracic criteria use >20% relative translation | Different units and no supplied reconciliation. Do not equate them, choose one silently, or derive a percentage without the defined measurement/reference context. Keep earlier thresholds source-recorded, but hold automated thoracic translation qualification pending clarification |
| Flattened table has an additional lumbar 15% entry alongside 8% anterior, 9% posterior, and bracketed 17% total | Column placement/application of the extra entry is unclear; retain it only as a source issue, not a threshold |
| Cervical table includes 20% anterior, 20% posterior, and bracketed 40% total; L5–S1 includes 6%, 9%, and 15% total | Preserve as reported stable limits. The total column does not by itself establish that directional measurements should be summed or how totals govern qualification |
| Earlier cervical/thoracic translation text allows static, flexion, or extension images; this methodology requires flexion and extension at/after MMI for instability rating | These may address the individual measurement versus the complete rating evidence set. Retain both scopes; a static image alone is not established as sufficient for final instability rating by the combined excerpts |

**Product implication:** An instability-evidence review can surface modality, date relative to MMI, region/level, image adequacy, landmarks, units, and the applicable verified criterion. It should distinguish fusion from instability pathways and avoid blanket imaging orders. Missing or unqualified rating evidence need not erase a clinical diagnosis or prevent other case analysis.

**Next source checks:** Original Table 17-03a2m layout and regional measurement figures/sections, particularly thoracic mm versus percentage criteria and total-motion meaning. Apply the editorial exclusion policy to any defective statement that remains unclarified; do not discard independently clear timing, modality, or pathway instructions.

## AMA-NOTE-032 — Detailed regional AOMSI instructions and reconciliation

**Source:** User-pasted Sections `17.03a2m1` Cervical Spine, `17.03a2m2` Thoracic Spine, and `17.03a2m3` Lumbar Spine, reviewed on 2026-10-11.  
**Verification:** Checked against supplied excerpts; referenced figures, older editions, and current errata not independently reviewed.  
**Categories / disposition:** Diagnosis guidance; examination/clinical-study guidance; impairment classification. Actionable clarifications with unresolved thoracic criteria excluded from usable rules.

### Cervical clarification

The section explicitly permits translation **or** angular-motion qualification. Translation is greater than 20% anterior/posterior; angular motion is more than 11° greater than **each adjacent level** on flexion. The later numbered instructions repeat the relative-translation formula and allow measurements on static, flexion, or extension films. Retain the general requirement for flexion/extension evidence at or after MMI for permanent impairment attributable to instability (AMA-NOTE-031); measurement on one image does not establish the complete evidence requirement.

The section also explicitly identifies alternatives involving developmental fusion, successful or unsuccessful surgical arthrodesis attempts (including dynamic stabilization), or preserved motion with disc arthroplasty. Arthroplasty therefore does not require loss of motion merely to fall within this described AOMSI framework. Applicable DBI SIEs still determine the actual class/value; an intervention label alone does not supply a percentage.

### Thoracic conflict: partial corroboration, no resolved threshold rule

The detailed thoracic section uses **millimeters**, consistent with the stable-motion table in AMA-NOTE-031, and mentions a **5° maximal-angulation threshold**. This conflicts with the earlier thoracic summary's 20% translation and >11° adjacent-level difference (AMA-NOTE-024). The earlier summary's repetition of cervical numbers may be an editorial error, but that correction is not established by the supplied text.

Within the detailed section itself, one sentence says **at least 2.5 mm**, while another says **greater than 2.5 mm**. These differ at equality. The 5° statement does not fully define its comparator or measurement protocol. Under the editorial exclusion policy, do not implement the conflicting earlier thresholds, invent a >=/> choice, or transfer the cervical angular protocol to thoracic. Preserve the source statements and seek clarification from the figures, row criteria, or authoritative correction; missing usable thresholds are not permission to rate by any chosen threshold.

**Clear thoracic material to retain:** Flexion/extension imaging; an explicit alternative for successful or unsuccessful arthrodesis attempts including dynamic stabilization; and source-reported background that instability is usually associated with vertebral/posterior-element fractures and isolated ligamentous instability is rare. Rarity is not a categorical exclusion or a requirement that every case include a fracture.

### Lumbar clarification

The lumbar translation and angular values repeat AMA-NOTE-018 without changing them. The angular-motion protocol and adjacent-level comparison still require the figure. The section explicitly identifies alternative developmental-fusion, surgical-arthrodesis/dynamic-stabilization, and motion-preserving arthroplasty circumstances, clarifying the earlier postoperative ambiguity. Preserve those pathways separately from measured excess motion; do not infer the exact DBI class or impairment value from the procedure alone.

**Figure references:** The prose associates figure IDs with different measurement descriptions, including an angular statement linked to a figure titled Translation. Inspect the actual images and captions before treating a figure link as a verified protocol. Do not silently correct identifiers.

**Consolidation:** This note updates AMA-NOTE-018/024/031: cervical alternative criteria and cervical/lumbar arthroplasty pathways are clarified; thoracic millimeter criteria gain corroboration but conflicts and boundary semantics remain unresolved. Avoid introducing a separate rule for every repeated paragraph.

## AMA-NOTE-033 — Technical quality of AOMSI measurements

**Source:** User-supplied [Technical Factors and adjacent-segment passage](</Users/andrewzelinski/.codex/attachments/6d37a193-644e-45b4-aa07-7c45df0805f0/Pasted text.txt>), “Technical Factors,” reviewed on 2026-10-11. Exact section/release not supplied.  
**Verification:** Checked against supplied excerpt; measurement-performance claims not independently reviewed.  
**Categories / disposition:** Examination/clinical-study guidance; diagnosis guidance; impairment classification. Actionable measurement-quality requirements and informational technique advice.

This expands AMA-NOTE-031's general image-quality requirement:

| Technical issue | Source instruction |
| --- | --- |
| Pronounced poor centering / off-lateral projection, angulation, or parallax | Do not use affected images for motion-segment-integrity evaluation; duplicated margins/endplates are a described warning sign |
| Artifacts materially obscuring endplate identification | Do not use for measurement; poor-quality copies are also unsuitable |
| Endplates cannot be accurately defined on both flexion and extension images | Do not perform the measurements |
| Curvature, spurring, uncinate hypertrophy, or projection effects | Use the identical visible endplate landmark on both images; when visible, use the vertebral endplate rather than the uncinate process |

The digital/PACS discussion describes electronic measurements as potentially more reproducible and accurate than manual submillimeter estimation, while explicitly acknowledging limited study. Preserve it as technique advice, not a requirement to use digital images or a reason to reject every analog study. Electronic-caliper resolution of 0.2–0.3 mm is mentioned, not a universal precision guarantee or qualification tolerance.

**Possible product behavior:** Surface whether a measurement has an adequate study and documented method, identifiable consistent landmarks, source/date, and any reviewer-reported quality limitations. Do not infer radiographic adequacy automatically from a report, file type, or a numerical measurement alone. This is guidance for interpreting evidence, not a commitment to build image analysis or measurement tools.

## AMA-NOTE-034 — Adjacent-segment degeneration versus symptomatic disease

**Source:** Same user-supplied file, “AOMSI and Potential Adjacent Segment Degeneration,” reviewed on 2026-10-11. Exact section/release and supporting study references not supplied.  
**Verification:** Checked against supplied text; epidemiology and causal claims not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; diagnosis guidance; causation/apportionment; impairment classification. Actionable distinctions and rating context, with unsupported or incoherent generalizations excluded from case rules.

**Definitions in the passage:**

- **ASDeg:** Adjacent-level radiographic degeneration described as asymptomatic, or radiographic changes without radiculopathy, myelopathy, or instability. Do not simplify this second formulation into proof that the patient has no symptoms of any kind.
- **ASDis:** Adjacent-level degeneration associated with a clinical syndrome. The passage lists radiculopathy, stenosis, and instability, then emphasizes new radicular/myelopathic symptoms referable to the level next to prior surgery. It says axial pain alone, spasms, or numbness that are sequelae of the original arthrodesis are not the classic presentation. Preserve timing, level, and symptom attribution rather than turning “not classically” into an absolute exclusion.

**Rating context:** The passage states that Chapter 17 impairment values already account for potential adjacent-segment stress/degeneration. Do not add an increment merely for the possibility of future degeneration. It does not establish that actual new symptomatic disease is always already covered, never separately rateable, or automatically an additional component; review the current findings and applicable DBI/overlap rules.

**Possible product behavior:** Distinguish prior procedure level/date, adjacent imaging changes, new versus residual symptoms, and supporting neurologic/instability findings. This could guide preparation and record review without assuming every adjacent imaging change explains the patient's symptoms.

**Clinical background:** The passage discusses competing natural-history and altered-mechanics explanations, age, genetics, preexisting disease, and occurrence after arthroplasty. Retain these as source-reported context. It acknowledges uncertainty about causation, so its later assertions of no trauma relationship and proof of preexisting progression from occurrence after arthroplasty must not become automatic patient-specific causal conclusions. Record the categorical assertions as source claims needing support, not independent clinical rules.

**Editorial/evidence exclusions:** The phrase “annual incidence is 25.6% at 10 years” conflates a time horizon and annual rate; it provides no usable numerical guidance under the exclusion policy. The broad prevalence ranges, genetic variance percentages, age associations, and reoperation estimates lack their study context here. Keep them out of predictive or apportionment logic; do not convert population variance into a patient's causal percentage or interpret mixed age findings as a universal age rule. No precise epidemiological model is needed for this reading note.

**Next source checks:** Actual DBI treatment of clinically established adjacent-level disease if needed, and original research if the background or causal claims are to be presented as evidence-based guidance. Measurement-quality guidance in AMA-NOTE-033 does not resolve the thoracic threshold conflicts in AMA-NOTE-032.

## AMA-NOTE-035 — Discectomy and potential adjacent-segment degeneration

**Source:** User-pasted “Discectomy and Potential Adjacent Segment Degeneration,” reviewed on 2026-10-11; exact section/release not supplied.  
**Verification:** Checked against supplied excerpt; scientific-evidence claim not independently reviewed.  
**Categories / disposition:** Clinical patterns / evidence; impairment classification. Informational, largely consolidated with AMA-NOTE-034.

The passage says evidence is insufficient to support the assumption that discectomy increases adjacent-segment degeneration risk, while stating that current spine impairment assessments already consider that possibility. Retain the explicit uncertainty; absence of sufficient evidence is not proof of no risk or a finding about individual causation.

**Rating implication:** Extends AMA-NOTE-034's distinction between anticipated degeneration already considered in assessment and actual new symptomatic disease. No new standalone percentage, prediction, or automatic increment follows from this paragraph.

## AMA-NOTE-036 — Reported recovery after posterolateral lumbar fusion

**Source:** User-pasted “Reported Functional Recovery After Posterolateral Lumbar Fusion,” reviewed on 2026-10-11. Describes 42 patients at nine US centers, enrolled October 2015–June 2017; full study citation not supplied.  
**Verification:** Summary checked against supplied text; original study and methods not reviewed.  
**Categories / disposition:** Clinical patterns / evidence; care/MMI guidance. Informational background only.

The reported study followed radiologic outcomes, pain VAS, ODI, and SF-36v2 at six weeks and 3, 6, 12, and 24 months. The passage reports better function and satisfaction after single-level than two-level posterolateral fusion, with similar fusion rates, pain, and generic quality-of-life outcomes; both groups improved across pain, function, and quality of life.

**Use and limits:** Potential background on outcome domains and differing group outcomes, not an individual prognosis, causal comparison, recovery deadline, MMI criterion, or impairment percentage. The follow-up schedule does not establish when recovery is complete. Do not treat all patient questionnaires as interchangeable with these named instruments or infer a new data-collection requirement from a study summary. A precise citation and review of methods would be needed before presenting the findings as validated evidence guidance. No new workflow or executable rule is warranted by this paragraph.

## AMA-NOTE-037 — Cervical and lumbar arthroplasty rating references

**Source:** User-pasted “Cervical Arthroplasty (CA)” and “Lumbar Arthroplasty (LA),” reviewed on 2026-10-11; exact enclosing section/release not supplied.  
**Verification:** Checked against supplied excerpts; referenced table criteria not reviewed.  
**Categories / disposition:** Diagnosis/procedure terminology; impairment classification; special rules / reporting. Actionable reference routing plus informational procedure descriptions.

| Region | Names listed in the passage | Rating reference supplied |
| --- | --- | --- |
| Cervical | Cervical arthroplasty (CA), cervical disc replacement (CDR), cervical total disc arthroplasty (TDA), anterior cervical disc replacement (ACDR) | Table `17-19`, section `17-19b03`; cervical AOMSI in Chapter 17 |
| Lumbar | Lumbar arthroplasty (LA), lumbar total disc replacement (TDR), lumbar artificial disc replacement (ADR) | Table `17-21`, section `17-21b03`; lumbar AOMSI in Chapter 17 |

Both procedures are described as disc replacement intended to preserve motion while relieving symptoms. The passage considers post-arthroplasty functional loss comparable to fusion for the stated rating guidance. This reinforces AMA-NOTE-032's explicit motion-preserving arthroplasty pathway; it does not make the procedures clinically identical or assign every arthroplasty the same class/value as every fusion.

**Possible product behavior:** Recognize these procedure terms during record review, retain region/level and actual procedure identity, and retrieve the relevant AOMSI guidance. Keep procedure aliases distinct from canonical diagnosis aliases. Abbreviations such as TDA/TDR/ADR need anatomical context. Preserve `17-19b03` and `17-21b03` as supplied section references, not assumed diagnostic-row IDs or new entries in `ama_dx_rows` without checking the tables.

**Consolidation:** Basic procedure descriptions and claims of extensive study add no separate rating rule. Retrieve the referenced criteria before selecting a class or calculating a value; no additional AI pass is implied.

## AMA-NOTE-038 — Class, grade, and value: conceptual guidance

**Source:** User-supplied class definitions, prose introducing the class-range table, and “DBI Impairment Value Range by Class/Grade,” reviewed on 2026-10-11. Exact source release not supplied.  
**Verification:** Checked against supplied passages and user-described table; original table layout not inspected.  
**Categories / disposition:** Impairment classification. Actionable conceptual structure with ambiguous summary wording and largely redundant grade explanation.

- **Class 0:** Prose describes no residual symptoms/signs, no functional loss/interference, or being asymptomatic. The described table instead labels the column “No Objective findings.” These are not interchangeable clinical states. Do not reduce Class 0 to absence of objective findings, use any one loosely joined phrase as a sufficient logical condition, or infer that absent documentation establishes zero impairment. Read the actual diagnostic-row criteria.
- **Classes 1–4:** The passage describes residual symptoms together with PE and relevant CS SIEs specified in the diagnostic row's class/grade criteria. Summary labels are minimal, mild, moderate, and severe. These labels are not standalone clinical thresholds from which software can infer a class.
- **Grade:** The table says no grade for Class 0 and that grades for Classes 1–4 are based on SIEs. The passage provides no generic grade-adjustment algorithm. Preserve complete source labels such as 1A/1B when reviewing actual rows.
- **Value:** The grade-value prose says values may progress nonlinearly. Retain that as a reason to use the values explicitly assigned by the applicable row/class/grade rather than evenly subdividing a range, interpolating missing values, or importing an older modifier formula. The explanatory claims about nuance add no executable rule.

**Working interpretation:** Confirmed diagnosis and supported SIEs identify the applicable class/grade, whose table entry supplies the WPI value. This is the intended structure in the supplied text, not proof that every possible set of findings has a unique match. Mixed/partial findings remain unresolved by these paragraphs.

**Consolidation:** Repeated diagnosis/natural-history framing adds no new confirmation rule. Numerical summary ranges need separate treatment because of conflicts documented in AMA-NOTE-039.

## AMA-NOTE-039 — Reported class ranges and regional caps: conflicting lumbar data

**Source:** User's transcription of “Definition of DBI Classes and Ranges,” referenced in the prose as Table `17.03c`, plus stated caps and reference to Section `17.16`, reviewed on 2026-10-11. Preserve supplied reference punctuation pending original-source review.  
**Verification:** Checked against supplied transcription, not the original table image.  
**Categories / disposition:** Impairment classification; special rules / reporting. Source-recorded ranges; lumbar range mapping excluded from usable rules pending clarification.

| Region | Class 0 | Class 1 (minimal) | Class 2 (mild) | Class 3 (moderate) | Class 4 (severe) | Maximum stated in prose |
| --- | --- | --- | --- | --- | --- | --- |
| Cervical | 0% | 1–8% | 9–14% | 15–24% | 25–33% | 33% WPI |
| Thoracic | 0% | 1–6% | 7–12% | 13–16% | 17–22% | 22% WPI |
| Lumbar | 0% | 1–3% | 4–6% | 7–11% | 12–16% | 33% WPI |

**Concrete conflicts:**

- The lumbar row ends at 16%, while the same prose gives a 33% regional maximum. Combining components could potentially explain a row-range versus regional-cap difference, but this excerpt does not establish that explanation.
- More decisively, the earlier user-pasted L2 diagnostic row `17-21-04` assigns class 1B = 4%, class 2A = 12%, and class 3B = 18%; these fall outside the respective lumbar summary bands above (see the original excerpt referenced by AMA-NOTE-001). The earlier stenosis example also assigns class 1B = 4% (AMA-NOTE-020). The summary therefore cannot be used to validate those detailed selections as supplied.
- The prose calls the class ranges universal, yet the transcribed regional rows differ. Do not implement a cross-region universal range mapping from that statement.

**Editorial policy:** Retain this table as a source discrepancy, not a corrected specification. Do not invent replacement lumbar numbers, reclassify the previously supplied examples to fit the bands, or silently choose which source wins. The unaffected conceptual class/grade structure in AMA-NOTE-038 remains useful. The cervical/thoracic ranges have no conflict established in these notes, but still do not replace diagnostic-row criteria.

**Caps:** Record the explicit regional maxima as source-stated values: cervical 33%, thoracic 22%, lumbar 33% WPI. The lumbar statement reinforces AMA-NOTE-022. Section 17.16 is the next source for calculation scope, exceptions, and interaction with cross-chapter components; these are not a single whole-case cap or permission to add percentages.

**Next source checks:** Original class-range table and applicable release, detailed DBI rows, Section 17.16, and any correction that reconciles the lumbar bands with the cited class/value examples. Do not block continued reading while this source issue is unresolved.

## AMA-NOTE-040 — General record review and PE: retain only new instructions

**Source:** User-pasted examples on impairment-report record review, asymptomatic degeneration (termed “latency period of senescence”), and Physical Examination, reviewed on 2026-10-11; section identifiers not supplied.  
**Verification:** Checked against supplied excerpts only.  
**Categories / disposition:** Examination guidance; special rules / reporting. Mostly redundant/background; a few actionable documentation instructions.

- **Record review / imaging:** Consistent with the existing workflow. Retain the instruction to address relevant available imaging studies or reports in the report's clinical context; no separate pass or broad new history-collection requirement is established here.
- **Asymptomatic degeneration:** Already covered by AMA-NOTE-025/026/034. No new concept or data field is needed for the terminology. Imaging alone does not establish symptom onset or patient-specific causation.
- **New PE instructions:** Examine bilaterally where feasible; document relevant supporting and conflicting findings; include pertinent positives and negatives in the report. Compare relevant prior examinations when useful, preserving date, side, and measurement context.
- **Interpretation boundary:** Positive and negative findings contribute to diagnostic reasoning; the generic “rule in/rule out” definitions do not establish that any single finding conclusively confirms or excludes a diagnosis. Missing documentation is not a negative finding. Relate this guidance to the specific claudication exception in AMA-NOTE-027 rather than reinstating a universal objective-deficit gate.
- **Generic examination inventory:** Background, not a mandatory checklist for every case. Surface items only when the relevant diagnosis, evidence gap, or rating criterion makes them useful. The permission to remove external devices “as appropriate” remains clinical judgment, not an automatic product instruction.

**Reading approach:** Skim further general prose for new required observations, measurement methods, exclusions, evidence-quality requirements, and reporting instructions. Link repeated concepts instead of expanding the log. Physician review should focus on diagnosis-specific guidance and consequential interpretations; familiarity with basic examination principles does not establish familiarity with this Guides version's rating rules.

## AMA-NOTE-041 — Step 4 pathway summary: residual impairment and consistency

**Source:** User-pasted introductory paragraph for “Determine the Diagnostic Row, Class, Grade, and Impairment Value,” followed by the user's four-branch summary; reviewed on 2026-10-11. The full branch instructions were not supplied. User cites `17.13b4a2` for evolved conditions.  
**Verification:** Introduction checked against supplied text; branch details are user-summary-derived, not source-verified rules.  
**Categories / disposition:** Impairment classification; special rules / reporting. Useful candidate triage structure; qualifications remain to be checked before implementation.

| Neutral pathway label | Routing reported in the user's summary | Scope / qualification |
| --- | --- | --- |
| No residual symptoms or functional loss | Row suffix `-00`, 0% | Do not yet encode “regardless of surgery” as a universal rule. Reconcile complete eligibility wording with fusion/AOMSI and residual structural impairment instructions in AMA-NOTE-031/032 |
| Confirmed diagnosis with consistent presentation | Standard diagnostic rows `-03` and above | Compare relevant CH/PE/CS SIEs with the actual row criteria. Do not turn the summary's “perfectly matches” into a requirement for perfect agreement |
| Confirmed diagnosis with inconsistent history | Standard diagnostic rows `-03` and above, with explanation | Consistent with the earlier explicit professional-judgment allowance (AMA-NOTE-004). Document the specific discrepancy, supporting evidence, and reasoning; do not infer intentional exaggeration or apply a blanket credibility label. Exact documentation/weighting instructions await the full text |
| Diagnosis cannot be confirmed because presentation is incongruent | Exclude `-03` and above; consider `-01` (reported 0%) or `-02` (reported 1% nonspecific-pain pathway) | The `-03` exclusion has earlier excerpt support. The precise fallback eligibility and values here are summary-derived. Neither row is an automatic default for unexplained symptoms, missing evidence, or an alleged invalid claim |

**Evolved condition:** The user summarizes `17.13b4a2` as permitting/requiring rating the evolved condition when it produces a higher medically supported result. Retain as a source-check item: obtain the actual scope, causal relationship, and selection language before making a general highest-rating rule. An impairment value is not itself a benefit payment.

**Interpretation boundaries:**

- This is rating-method triage, not a claim-validity or malingering classifier. A 0% rating does not itself determine benefit denial; a 1% rating does not itself establish entitlement.
- Distinguish inconsistency in a reported history from inability to confirm a clinically relevant diagnosis. The physician must interpret the evidence and document the basis, rather than the software labelling a person unreliable.
- The introduction still says row/class/grade/value are assigned using diagnostic SIE criteria. These pathways do not resolve the earlier question of how to select a class when only some of its criteria match. Physician selection plus rationale is a possible interaction, not proof that unmet explicit criteria can be bypassed.
- Missing evidence and contradictory evidence remain distinct. The previously recorded lifetime and standalone limits for nonspecific pain still need their exact scope/reference clarified (AMA-NOTE-022).

**Reading status:** User skipped the generic examination section after reviewing examples. It remains skimmed/skipped, not fully reviewed. Optional physician-reference digest remains a V2 idea; no detailed examination checklist or training document is being created now.

**Next source checks:** Full `-00` eligibility, especially structural/postoperative findings; `-01`/`-02` eligibility and scope; `17.13b4a2`; inconsistent-history documentation instructions; general class selection for mixed findings. Continue reading without treating the summary as an executable specification.

## AMA-NOTE-042 — Causation analysis and documentation

**Source:** User-pasted Section `17.15a`, including `17.15a1–a4`, reviewed on 2026-10-11. References the second edition of Guides to the Evaluation of Disease and Injury Causation, citation 171 (the “Blue Book”); that referenced work was not supplied or reviewed.  
**Verification:** Checked against supplied excerpt only. The named six-step framework's attribution and wording are not independently verified, and no jurisdiction's legal standard is established by this note.  
**Categories / disposition:** Causation/apportionment; special rules / reporting. Actionable reasoning/documentation framework, with overbroad wording excluded from automatic rules.

**Core instruction:** Assess and document the relationship between the confirmed diagnosis and the reported mechanism/event/exposure. Causation is a separate analysis from impairment calculation. Understanding the mechanism is part of evaluating whether it plausibly accounts for the condition.

**Reasoning topics listed in the passage:** Diagnosis; temporal relationship; causal plausibility/consistency; alternative explanations; strength of scientific evidence; conclusion under the applicable evidentiary standard. Retain these as a candidate physician-facing structure rather than describing our implementation as a verified NIOSH/ACOEM/AMA six-step method before checking the cited source.

**Problematic wording and limits:**

- `17.15a2` says to ensure the diagnosis is not related to preexisting conditions. Do not implement this as “preexisting condition present = incident causation excluded,” or require that the incident be the only conceivable cause. The useful assessment task is to examine preexisting conditions and alternative explanations and document their relevance. If the absolute exclusion statement is not clarified elsewhere, it provides no usable exclusion rule under our editorial policy.
- Distinguish the condition's existence before an event, onset/change of symptoms afterward, and any claimed aggravation or contribution. These are questions for evidence review and physician reasoning, not conclusions established by timing or this passage. Their legal treatment requires the applicable jurisdictional standard.
- The passage uses “reasonable degree of medical probability” and later “reasonable degree of medical certainty.” Do not treat these phrases as interchangeable, assign a numeric threshold, or hardcode either as the universal reporting standard. It explicitly acknowledges jurisdictional differences.
- A plausible mechanism or temporal association alone does not complete the described analysis; alternative explanations and evidence still need consideration.
- Despite the broader heading mentioning apportionment, the supplied subsection gives no method for dividing causal shares or calculating percentages. Do not derive apportionment from impairment values or from the mere presence of preexisting findings.

**Possible product behavior:** Present a source-linked causation evidence summary per diagnosis: reported mechanism/exposure, chronology, pre-event baseline, relevant changes/findings, alternative explanations, and material uncertainty. Let the physician provide the causal conclusion and rationale under the requested standard. AI may organize evidence or draft from that approved reasoning; do not let the impairment lookup determine causation or claim entitlement. This is a candidate use of the existing physician-opinion workflow, not a decision to add a new AI pass.

**Next source checks:** Any actual apportionment subsection; the cited causation framework if adopted; clarification of preexisting-condition wording; governing case-specific standards. Generic introductory claims about fairness and justice add no separate product requirement.

## AMA-NOTE-043 — Transition to actual DBI row review

**Source / status:** User's description of the recurring row format and decision to end broad prose review for this phase, 2026-10-11. This is a planning summary, not a newly supplied full diagnostic row.

Expected structure: `17-XX-XX` row identifier, diagnosis name, description, followed by discrete entries such as Class 1A, Class 1B, or Class 2A. Each entry carries a listed WPI value and its own evidence criteria. Keep each complete class/grade label and value together; do not derive values from the inconsistent summary ranges.

**Next extraction focus:** Exact source criteria and nested logical relationships among CH/PE/CS findings, thresholds, exclusions, and cross-references. The same clinical finding may support several entries; do not assume the listed entries are mutually exclusive, exhaustive, or governed by a highest-match rule unless the source establishes that behavior.

**Reading scope:** Stop the general prose walkthrough here. Consult further narrative only to interpret actual rows, apply external combination/cap rules, or resolve consequential ambiguity. Prior deferred sections remain deferred. The actual rows are the next substantive content layer, not proof that all surrounding rules are complete.

## AMA-NOTE-044 — Cervical rows 17-19-00 through 17-19-02 and proposed service scope

**Source:** User-pasted cervical diagnostic-row headings, 2026-10-11. Full descriptions and class/value criteria not supplied in this batch.  
**Verification:** Exact headings recorded; similarities across regions are user-reported, not independently established from all regional rows.  
**Categories / disposition:** Impairment classification; special rules / reporting. Actionable row identity; proposed business policy remains under consideration.

| Row ID | Supplied diagnosis/row name |
| --- | --- |
| `17-19-00` | Confirmed Diagnosis Corroborated by the Clinical History (Presentation) With No Residual Symptoms |
| `17-19-01` | Incongruent Clinical Presentation With Residual Symptoms |
| `17-19-02` | Incongruent Clinical Presentation With Residual Symptoms (Nonspecific Pain) |

These headings connect to the provisional pathway summary in AMA-NOTE-041. They do not by themselves establish complete eligibility, percentages, or the lifetime restrictions discussed earlier; no new class/value data is supplied here.

**User-proposed policy:** Consider declining to provide numerical impairment ratings for cases that the physician determines fall into the `-01`/`-02` pathways. This is a service-scope choice to evaluate, not a decision to erase those rows from source data, declare such patients invalid, assign 0%, or treat the entire IME as unsupported.

**Possible product behavior if adopted:** Keep “rating not provided” distinct from 0% impairment, not at MMI, or a completed rating. Preserve the physician's assessment and reason for non-rating. Other requested opinions may still be addressed where supported. A final policy needs case-specific engagement and jurisdictional requirements considered; it is not implemented by this note.

## AMA-NOTE-045 — Cervical radiculopathy rows C1, C2, and C3

**Source:** User-supplied [C1–C3 diagnostic-row excerpt](</Users/andrewzelinski/.codex/attachments/779f88b7-9f2c-4283-99cc-c5133d2b334d/Pasted text.txt>), reviewed on 2026-10-12. Row IDs `17-19-03`, `17-19-04`, and `17-19-05`. Exact Guides release and completeness of the source rows remain unverified.  
**Verification:** Values and logical relationships checked against supplied excerpt; neuroanatomical descriptions and electrodiagnostic assertions recorded as source guidance, not independently clinically validated.  
**Categories / disposition:** Impairment classification; diagnosis guidance; examination guidance. Actionable row/class/value reference data with study-interpretation cautions.

### Row identity and supplied entries

| Row ID | Diagnosis name | Class/grade | WPI | Distinguishing PE criterion |
| --- | --- | --- | --- | --- |
| `17-19-03` | Cervical Radiculopathy Involving the C1 Nerve Root (Very Rare) | 1A | 2% | Residual radicular pain or subjectively altered sensation without objectively verifiable pinprick dullness or loss of sharp/dull perception, in the source-described root-compatible distribution |
| `17-19-04` | Cervical Radiculopathy Involving the C2 Nerve Root (Very Rare) | 1A | 2% | Same sensory category, with C2-specific distribution |
| `17-19-05` | Cervical Radiculopathy Involving the C3 Nerve Root | 1A | 2% | Same sensory category, with C3-specific distribution |
| `17-19-05` | Cervical Radiculopathy Involving the C3 Nerve Root | 1B | 4% | Diminished pinprick sensation in the C3-compatible distribution, with sharp/dull perception intact |
| `17-19-05` | Cervical Radiculopathy Involving the C3 Nerve Root | 1C | 5% | Loss of sharp/dull perception (decreased protective sensibility) in the C3-compatible distribution |

Only these entries were supplied. Do not generate missing grades/classes for C1/C2 or assume every row has the same set of entries. No separate descriptive paragraph was supplied for C3. The C1/C2 descriptions characterize these conditions as very rare with overlap with upper-cervical/occipital conditions; C2 explicitly mentions occipital neuralgia.

### Required logic shared by every supplied entry

**CH AND PE AND CS**, where:

- **CH:** Residual symptoms and mechanism of injury consistent with the diagnosis.
- **PE:** The entry-specific findings above in a neuroanatomically plausible, root-compatible distribution; preserve the additional C1/C2 wording below.
- **CS:** At least one root-specific alternative: (1) MRI or CT demonstrating injury/lesion of that root; (2) electrodiagnostic findings confirming pathology of that root under the referenced Section 17.06 definitions; OR (3) clear objective intraoperative verification of a lesion involving that root by the surgeon.

The alternatives apply within CS; they do not make CH or PE optional. A generic abnormal scan or record that a procedure occurred does not supply the stated root-specific finding. Preserve the evidence source/date and actual findings.

### Root-specific descriptive guidance in the excerpt

| Root | Distribution / additional wording supplied |
| --- | --- |
| C1 | Occipital or upper neck region, radiating from the back of the head toward the crown or forehead; no significant limb symptoms |
| C2 | Back of head or upper neck, radiating toward the temples or behind the eyes; no significant limb symptoms. Tapping over the occipital nerve may reproduce symptoms |
| C3 | Ear, anterior neck, occiput, posterior temporal area |

Keep these as source-described clinical guidance for physician review. The C2 tapping observation uses “may”: it is not an additional required positive test, and the excerpt alone does not establish its diagnostic specificity. Do not turn the descriptive regions into rigid anatomical polygons or independent automated diagnoses.

### Electrodiagnostic caveat and consolidation

Each entry requires **confirming** electrodiagnostic evidence if that CS alternative is used, but cautions that testing at these roots is technically difficult, rarely performed, and often not definitive. Preserve both: inconclusive testing does not automatically satisfy the confirmation branch, while qualifying imaging or operative evidence remain alternatives. Clinical interpretation and the referenced study definitions are still needed; the caveat does not mandate ordering the test or establish an automatic exclusion when it is inconclusive.

Class 1A expressly permits symptoms without objective sensory loss when the other stated requirements are met. This supplies another concrete reason not to convert “no objective findings” in the generic Class 0 summary into a rule based on sensory examination alone (AMA-NOTE-038). It does not eliminate the required CS corroboration.

**Product implication:** One row has a variable list of class/grade entries, each with a fixed listed value and evidence conditions. Shared CH/CS language can be represented once for display or reference preparation while preserving each entry's complete requirements. Source content must remain distinguishable from physician-confirmed patient evidence. The excerpt supports a criteria-comparison worksheet; it still gives no general selection rule for conflicting or partially satisfied findings.

## Reusable note template

Copy this section for each meaningful passage. These are reading fields; they do not prescribe a database design.

### AMA-NOTE-XXX — Short topic

- **Source:** Edition/release, chapter, section/table/row, page or stable link.
- **Context:** Relevant definitions, footnotes, exceptions, and cross-references.
- **Paraphrase:** What the passage actually says.
- **Categories:** One or more categories from the integration plan.
- **Applies to:** Region, diagnosis, workflow stage, and any stated scope limits.
- **Authority:** Explicit requirement / recommendation / descriptive statement / ambiguous.
- **Potential use:** Reference / contextual suggestion / candidate structured rule.
- **Evidence needed:** Findings or facts the physician/system would need, with required specificity.
- **Possible product behavior:** What the physician would see or do; separate interpretation from source content.
- **Questions or conflicts:** Missing context, contradictions, unclear terms, and related note IDs.
- **Disposition:** Actionable / informational / redundant or incoherent. For a duplicate, link the retained note; for unclear requirements, record the unresolved question above.
- **Verification:** Conversation-derived / source-checked / physician-reviewed; reviewer and date when available.
- **Next action:** A concrete source check, review, or design question.

## Promotion to implementation

Before a note becomes product guidance, confirm its source/version, scope, clinical interpretation, and intended use. Before it becomes an executable rule, also resolve required inputs, conjunctions/alternatives, exceptions, missing-evidence behavior, and physician decision boundaries. Apply the editorial exclusion policy to defective statements that remain unclarified; keep their source/issue notes outside usable guidance rather than silently resolving them in code.
