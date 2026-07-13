# Adversarial Review — Extraction & Summary Passes (as built, 2026-07-11)

Scope reviewed:

- **Pass 1 (per-provider extraction):** `backend/src/gemini/prompts.ts` (`extractionSystemPrompt`), `summarizeRecord.ts`, `recordSummarySchema.ts`, `schemas.ts` (`geminiRecordSummaryResponseSchema`), invoked from `recordsController.ts`.
- **Pass 2 (case aggregate summary):** `synthesisSystemPrompt`, `synthesizeCaseSummary.ts`, `aggregateSummarySchema.ts`, invoked from `caseAggregateSummaryController.ts`.
- Prompt docs at repo root (`geminiExtractionPrompt.md`, `secondPassExtractionPrompt.md`, `drafterPrompt.md`) — note `secondPassExtractionPrompt.md` is **not wired into any code**; the live second pass is the aggregate synthesis, which is a different design than the doc describes.

Verdict up front: the prompts say the right words ("strict grounding", "no external knowledge", "cite pages"), but **nothing in the system enforces any of it**. Every anti-fabrication control is a polite request to the model. For a document that ends up in litigation, that's the core architectural gap — not any single prompt wording issue.

---

## Ranked failure modes

### SEV-0 — Fabrication that will reach a signed report

#### 1. Citations are unverifiable decoration — and they make fabrication *more* dangerous

The prompt demands `[p. 14]` on every clinical claim, but:

- No code ever checks that page 14 exists, let alone that it says what the extraction claims.
- Page-number hallucination is one of the most common LLM failure modes on long PDFs; Gemini does not have reliable page awareness inside a 300-page packet.
- There is no stored text layer to check against — the pipeline goes PDF → JSON with no intermediate ground truth.
- Citations are embedded inside markdown strings, so they can't even be parsed out reliably for a future verification step or a click-to-source UI.

The perverse effect: a fabricated fact **with a confident citation** is far more likely to survive doctor review than a fabricated fact without one. Your current design manufactures false confidence. This is the single most important thing to fix.

#### 2. Zero grounding verification: wrong dose / wrong side / wrong level flows straight through

Nothing compares output to source. The classic, high-frequency LLM medical-record errors are exactly the ones that are catastrophic in an IME:

- **Laterality swaps** (left/right radiculopathy) — determines which extremity gets rated.
- **Level swaps** (C5-6 vs C6-7; L4-5 vs L5-S1) — determines DRE category and surgical opinion defensibility.
- **Dose transposition** ("Oxycodone 50mg" for 5mg) — misstates the opioid picture that feeds MMI reasoning.
- **Date drift** — a shifted injury date changes causation.

On cross-examination, one demonstrably wrong extracted fact in a report impeaches the whole report and the doctor. Current pipeline has no defense.

#### 3. The structured-output schema actively pressures the model to fabricate

`geminiRecordSummaryResponseSchema` marks **every field of every array item as `required`** with plain string types (no nullable). So every diagnosis MUST have an `icd`, every medication MUST have `dose` and `frequency`. When the source doesn't state them, the schema and the prompt fight each other — and the most likely "compromise" the model finds is autocompleting from its training data. ICD codes are the worst case: the model knows M54.50, M47.812, S13.4XXA by heart and will happily supply the "correct" code for a diagnosis the chart named without coding. That is fabrication indistinguishable from extraction, in a field that reads as maximally authoritative.

Same mechanism applies to `treatmentsTried.status`, `functionalLimitations.status`, `workStatus.status` — free strings the model will normalize into plausible-sounding clinical judgments ("completed", "resolved") that the record never stated.

#### 4. Whole-packet, single-call extraction guarantees silent omission on real packets

Real IME packets run hundreds to thousands of pages. One `generateContent` over the entire PDF means:

- Attention dilution / "lost in the middle" — facts from the middle of the packet drop out with no signal that anything was missed.
- The **omission failure is invisible**: `datesOfService` is the model's own list, so there's nothing independent to reconcile against. You cannot distinguish "packet had 4 visits" from "model noticed 4 of 19 visits."
- Omission is as legally dangerous as fabrication. Dropping the 2019 prior lumbar injury changes causation and apportionment; dropping a failed injection series changes the MMI recommendation; dropping preexisting degenerative imaging findings is the first thing opposing counsel will find.

#### 5. `findings` as one cumulative SOAP object destroys the data MMI actually needs

Collapsing every date of service into four freeform strings (`subjective/objective/plan/outcome`) with "use bullets to show progression" is a lossy, unauditable design. For MMI, the **trajectory is the finding**: pain scores over time, exam plateau, treatment exhaustion. That trajectory currently exists only as markdown prose the model chose to write, which can't be diffed, sorted, verified, or fed to an MMI-suggestion pass as data. You will end up re-extracting from your own extraction (which is exactly what the unwired `secondPassExtractionPrompt.md` does — extraction over an already-lossy summary, compounding error instead of returning to source).

---

### SEV-1 — Distortion and structural blindness

#### 6. Pass 1 has no channel for contradictions or gaps — so the model silently resolves them

Real packets contradict themselves constantly: intake form says DOI 3/12, treating note says 3/21; PT notes say right side, ortho note says left; attorney summary disagrees with the underlying chart. Pass 1's schema has **no `inconsistencies` field**, so the model's only options are pick-one or merge — both are silent distortion. (The aggregate pass has `backgroundConflicts`, but only for background, and only for cross-*provider* conflicts; intra-packet conflicts are already gone by then.) The doc-file second pass has `inconsistencies_or_gaps` — the one good idea in it — but it isn't wired in and it's positioned at the wrong stage.

#### 7. Attorney summaries are ingested at the same trust tier as treating records

The prompt mentions "legal" documents may be attorney summaries, then extracts from them identically. There is no per-fact provenance (which document, which type, which page). A report whose "extracted facts" silently trace to the plaintiff attorney's demand-package summary is a credibility bomb: *"Doctor, isn't it true this 'fact' in your report comes from opposing counsel's letter, not any medical record?"* Every fact needs `{docId, documentType, page}` provenance, and the drafter should be able to say "per records" vs "per attorney summary."

#### 8. One `incidentDate` / one `incidentDescription` cannot represent multi-incident cases

Prior MVAs, prior workers' comp claims to the same body region, and subsequent re-injuries are the *center of gravity* of causation and apportionment analysis — and they're common, not edge cases. The schema forces a single incident, so the model must merge or drop additional ones. This is a schema-level inability to represent the most legally contested facts in the case.

#### 9. Dates are free strings in two conflicting formats, with no normalization

`prompts.ts` says `mm/dd/yy` (two-digit year!); the .md doc says `MM/DD/YYYY`; imaging/workStatus dates are unconstrained strings; nothing converts to ISO or validates. Downstream timeline assembly will mis-sort, and "01/05/24 vs 1/5/2024 vs Jan 2024" will read as three different dates. Also: no patient-identity check per document — misfiled pages from another patient (routine in real record productions) will be extracted as this patient's facts with no defense.

#### 10. The aggregate pass is second-generation drift with no citations and model-adjudicated conflicts

- "Do not... resolve conflicts **unless the provider summaries clearly support the resolution**" — that clause hands conflict resolution to the model's judgment, exactly what you said the doctor owns.
- The citation requirement isn't restated, so `mainSummary` is uncited narrative synthesized from already-lossy JSON. Two generations from source with no tether.
- Page citations that do survive into it are meaningless anyway: `[p. 14]` of *which record*? Cross-record citation needs `{recordId, page}`.

#### 11. Confirmed pipeline bug: the aggregate pass fails schema validation as built

`geminiAggregateSummaryResponseSchema` (sent to Gemini) **omits `currentStatus`** and lists `backgroundConflicts` as optional — but the Zod `geminiAggregateSummaryPayloadSchema` **requires both**. Under Vertex structured output the model emits only schema fields, so `currentStatus` will be absent and `synthesizeCaseSummary` should throw "did not match the expected payload schema" on every run (and intermittently on `backgroundConflicts`). Related hygiene: `asOfdate` casing (`asOfDate` in the doc), and the root .md prompt files have drifted from `prompts.ts` — two sources of truth, neither versioned into the stored blob.

---

### SEV-2 — Reliability and process gaps

12. **No sampling controls, no determinism.** No `temperature` set (Gemini 2.5 Flash defaults to 1.0). Extraction should run at temperature 0. Re-running the same packet today produces a different fact set, and stored blobs record `schemaVersion: "v1"` but not the prompt version/hash or model version that produced them — you can't audit which prompt generated which legal artifact.
13. **Model choice.** `gemini-2.5-flash` is the cheapest tier doing the highest-stakes step. For legal-grade extraction use Pro-tier (or better, keep Flash and add the verification layer below — verification beats a bigger model, but a bigger model is a cheap incremental win now).
14. **All-or-nothing failure.** One Zod failure throws away the entire extraction; `summaryStatus: "failed"` with no partials, no retry, no error taxonomy. On a 40-record case this will burn hours.
15. **No eval harness.** There is no golden set of packets with known facts measuring recall (omissions) and precision (fabrications). An anti-fabrication policy without measurement is an aspiration. This should exist *before* the MMI/drafter passes are built, since they inherit extraction quality.

---

## What the schema is missing for the actual downstream goals (MMI suggestion, impairment, IME report)

The current fields were designed for "summarize a chart," not for the three consumers you're about to build. Missing, roughly in order of importance:

| Needed for | Missing structure |
|---|---|
| Causation / apportionment | Prior injuries & claims to same region (multi-incident, see #8); preexisting degenerative findings flagged as such; gaps in treatment |
| MMI suggestion | Per-encounter pain scores and exam findings over time (the plateau curve); treatment exhaustion status per modality; referrals recommended but not completed; compliance signals |
| AMA Guides impairment | **Numeric** ROM by plane (not prose); motor/sensory/reflex findings mapped to root level (DRE radiculopathy criteria); EMG/NCS as its own study type (currently crammed into `imagingFindings`); surgical history with levels/dates |
| Report credibility | Validity observations (Waddell signs, symptom magnification, inconsistent effort notes) — doctors are asked about these on nearly every attorney questionnaire |
| Work capacity | Restriction *details* (lift limits, hours), not just a status string |
| Medication picture | Dates/prescriber per med — a merged timeless med list falsely implies "current medications" |

Also: `diagnoses` need dates and provenance (which provider, when, active vs historical) — a flat merged list can't answer "who diagnosed radiculopathy and when."

---

## Recommended architecture: verified fact ledger instead of one-shot summary

The fix is not better prompt wording. It's making extraction produce **claims that carry their own evidence**, then verifying them mechanically, then letting deterministic code (not an LLM) assemble the case view.

**Stage 0 — Ground-truth text layer (deterministic).** OCR/text-extract every page at upload; store per-page text keyed `{recordId, page}`. This is the substrate every later check needs, and it's the prerequisite for a click-to-source UI. Without it, nothing downstream is verifiable, ever.

**Stage 1 — Segmentation & identity (cheap LLM + rules).** Split each packet into documents/encounters (date, provider, doc type). Check patient identity per document; flag mismatches. Classify trust tier: treating record / diagnostic report / attorney work product.

**Stage 2 — Per-encounter extraction into an event log.** Extract each encounter separately (small context = high recall) into `encounters[]`: date, provider, structured subjective/objective (numeric ROM, neuro by level, pain score), assessment, plan, meds, work status. **Every atomic fact is a claim object: `{value, quote, recordId, page}`** — the model must return the verbatim supporting quote, not just a page number. All value fields nullable; enums enforced in schema, never invented by instruction.

**Stage 3 — Mechanical verification (deterministic, no LLM).** Fuzzy-match each claim's `quote` against the stored text of the cited page. Match → `verified`. No match → `unverified`, kept but flagged — never silently dropped. Validate dates (ISO, sane ranges), enums, and coverage: every segmented encounter/page range must be represented or explicitly marked "no extractable content." This converts both fabrication *and omission* from invisible to enumerable.

**Stage 4 — Deterministic case assembly.** Timeline = sort of the event log. Treatment course, med history, pain curve = code over verified claims. Conflicts (dates, laterality, attorney-vs-chart) detected by rules + an LLM assist pass, written to a first-class **conflicts table the doctor must acknowledge** — this dovetails with the doctor's MMI step and keeps conflict resolution where you said it belongs. Narrative summary is generated *last*, over verified claims only, and is the least trusted artifact rather than the central one.

**Doctor verification UI as the final control.** Each fact renders with its quote and a click-through to the highlighted PDF page; the doctor confirms/edits; **only doctor-confirmed facts are eligible inputs to the drafter.** This is simultaneously your strongest anti-fabrication control and a legal asset: it operationalizes "the physician personally reviewed the records," which the doctor must be able to testify to anyway.

### Sequencing note

Do Stage 0 + claim-level `{quote, page}` + mechanical verification **before** building the MMI suggester or drafter. Those passes inherit whatever the extraction layer feeds them; retrofitting provenance after three more passes consume the current blob shape is the expensive-to-reverse path. The immediate cheap wins, independent of the redesign: fix the `currentStatus` schema bug (#11), set temperature 0, make all Gemini schema fields nullable/optional-with-empty semantics that match the prompt, add an `inconsistencies` array to pass 1, delete or clearly mark the drifted root .md prompt files, and store prompt+model version in every persisted blob.
