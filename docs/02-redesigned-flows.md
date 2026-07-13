# Redesigned Flows & Data Model (succinct)

Core principle: every AI output is either (a) a **claim with verbatim evidence** that code verifies against the source page, or (b) **narrative rendered from already-verified facts**. LLM never assembles the case view; code does. Doctor confirms facts and makes all determinations; drafter writes verbosely from confirmed data only.

Pipeline: `0 upload → 1 extract → 2 verify → 3 assemble → 4 doctor review/MMI → 5 draft`

---

## 0. Upload — add a ground-truth text layer

- On upload, extract per-page text: try PDF text layer first (pdfjs); if a page yields <~50 chars, OCR it (Google Vision / Document AI). *(Assumption: many of these packets are scanned faxes — confirm.)*
- Sanity check patient name/DOB against the case; mismatch → flag on record, block extraction until staff resolves.

**New table**
```
record_pages: { recordId, page, text, ocr: bool }
```

## 1. Initial extraction (per provider record, few pages)

**API call changes:** `temperature: 0`; keep `gemini-2.5-flash` (verification layer carries the safety; env override to Pro stays). Persist `promptVersion` + `model` with output.

**Schema changes (structured output):**
- Every array-item gets `evidence: [{ page: int, quote: string }]` — quote is verbatim, ≤30 words.
- All value fields **nullable** in the Gemini schema (kills ICD/dose autocomplete pressure). Enums as real schema enums, never prompt-enforced strings.
- Dates: ISO `YYYY-MM-DD`, partials allowed (`YYYY-MM`), empty if unstated.
- Replace cumulative `findings` SOAP-blob with **`encounters[]`** (the pain/exam trajectory becomes data for the MMI pass).
- Replace single `incidentDate/Description` with **`incidents[]`** (multi-incident = causation/apportionment).
- Add `inconsistencies[]`, `validityObservations[]`, `priorInjuriesSameRegion[]`, `pagesWithoutClinicalContent[]`.
- Split EMG/NCS etc. out of imaging via `studyType` enum.

```jsonc
{
  "incidents":   [{ "date", "description", "evidence": [] }],
  "encounters":  [{ "date", "visitType", "subjective", "painScore",        // painScore: number|null
                    "objective": { "rom": [{ "region","plane","degrees" }], // numeric, for AMA ROM method
                                   "neuro": [{ "finding","side","level" }], // for DRE radiculopathy
                                   "other" },
                    "assessment", "plan", "evidence": [] }],
  "diagnoses":   [{ "name", "icd", "dateNoted", "status": "active|resolved|historical|null", "evidence": [] }],
  "studies":     [{ "studyType": "MRI|CT|XR|EMG_NCS|other", "region", "date", "findings": [], "impression", "evidence": [] }],
  "treatments":  [{ "modality", "dateRange", "status": "planned|ongoing|completed|discontinued|denied|null", "response", "evidence": [] }],
  "medications": [{ "name", "dose", "frequency", "dateNoted", "evidence": [] }],
  "functionalLimitations": [{ "limitation", "source": "patient_reported|provider_imposed", "status", "evidence": [] }],
  "workStatus":  [{ "asOfDate", "status", "restrictions", "evidence": [] }],
  "history":     { "pastMedicalHistory", "priorInjuriesSameRegion": [], "allergies", "evidence": [] },
  "validityObservations": [{ "observation", "evidence": [] }],   // Waddell signs, effort, symptom magnification
  "inconsistencies": [{ "description", "evidence": [] }],
  "pagesWithoutClinicalContent": []                              // page numbers; enables coverage check
}
```

**Prompt (replaces `extractionSystemPrompt`):**

> You are a medical-records data extractor for Independent Medical Exams. Extract facts from the attached single-provider record packet into the provided JSON schema.
>
> Rules:
> - Extract only what the document states. Never use outside medical knowledge to complete a field: if the document names a diagnosis but no ICD code, `icd` is null. If a dose is not stated, `dose` is null. Null/empty is always the correct answer for unstated data.
> - Every item must include `evidence`: one or more verbatim quotes (≤30 words, copied exactly, no paraphrase) with the page number they appear on. An item you cannot quote is an item you must not output.
> - Create one `encounters` entry per date of service. Copy pain scores, ROM degrees, and neuro findings as stated; do not normalize or interpret.
> - Record every contradiction within the packet (dates, sides, levels, histories) in `inconsistencies` — do not pick a winner.
> - Record any provider comments on symptom validity, effort, or magnification in `validityObservations`.
> - List any page with no extractable clinical content in `pagesWithoutClinicalContent`.
> - Dates: ISO `YYYY-MM-DD`; use `YYYY-MM` if only month is known; null if unstated.
> - This is extraction, not judgment: no diagnoses, causation, MMI, or work-capacity conclusions of your own. If the document itself states such a conclusion, extract it with evidence like any other fact.
> - If the document type is an attorney/legal summary, extract normally; provenance is handled downstream.

## 2. Mechanical verification (new; deterministic, no LLM)

- For each item, fuzzy-match each `evidence.quote` against `record_pages.text` for cited page ±1 (normalized similarity ≥0.85). Pass → `verified`; fail → `unverified` (kept, flagged — never dropped).
- Validate dates parse & fall in sane range; dedupe identical facts.
- **Coverage check:** every page must be cited by ≥1 item or listed in `pagesWithoutClinicalContent`; uncovered pages → record-level `coverageGap` flag. (Makes omission visible.)
- Explode the blob into rows — this replaces `Records.summary` as source of truth:

```
facts: { id, caseId, recordId, kind,            // 'encounter'|'diagnosis'|'study'|...
         body: jsonb, page, quote,
         verifyStatus: 'verified'|'unverified',
         doctorStatus: 'pending'|'confirmed'|'edited'|'rejected',
         sourceTier: 'treating_record'|'diagnostic'|'attorney_summary',  // from record.documentType
         promptVersion, model }
```

## 3. Case assembly (replaces LLM aggregate synthesis — deletes the currentStatus bug with it)

- **Code, not LLM:** timeline = all dated facts sorted; treatment rollup, med history, pain-score curve computed from `facts`.
- **Conflict detection:** rules first (incident-date mismatch, laterality/level disagreement, attorney-summary vs treating-record divergence); optional LLM assist may only *point at existing fact IDs*, never assert new content.

```
conflicts: { id, caseId, factIds: [], description,
             resolution: text|null, resolvedBy: userId|null }
```

- **Narrative case summary:** one LLM call, temp 0, input = verified facts only, each tagged `[f123]`; every factual sentence must cite fact IDs. Post-check: strip cites, reject output containing numbers/dates/named findings not present in cited facts; render cites as click-throughs.

## 4. Doctor review + MMI determination (UI)

- Fact review screen grouped by kind: each fact shows quote + click-to-highlighted-PDF-page; one-tap **confirm / edit / reject** (edit creates a doctor-authored fact, `sourceTier: 'doctor'`). Bulk-confirm allowed for `verified` facts; `unverified` and `coverageGap` items require individual action.
- Conflicts panel: each conflict requires an explicit resolution before drafting unlocks.
- **MMI suggestion (AI, advisory):** input = confirmed facts only; output = suggested MMI status + rationale composed of fact-ID citations (plateau evidence, treatment exhaustion, pending modalities). Displayed as "evidence summary," never pre-selected in the form.
- **MMI determination (doctor):** dropdown (Yes / No / Cannot determine) + MMI date picker + rationale chips (plateaued symptoms, treatments exhausted, pending treatment X…) + optional prose. Stored as a guardrail answer like the rest of `questions.json`.

```
guardrail_answers: { caseId, questionId, answerCode, canonicalSentence,
                     rationaleChips: [], doctorProse, answeredBy, answeredAt }
```

## 5. Drafter

- Input: **confirmed facts only** + guardrail answers (canonical sentences) + doctor prose + patient questionnaire scores. Attorney-summary-sourced facts render as "per the attorney's summary of records…".
- Keep `drafterPrompt.md` structure; add: every factual sentence cites `[f123]`.
- **Post-generation lint (deterministic, blocks save):**
  1. every canonical sentence present verbatim, in its assigned section;
  2. every number/date/anatomical level in the draft exists in a cited confirmed fact;
  3. all cited fact IDs exist and are confirmed.
  Failures highlight the sentence for doctor edit — never auto-regenerate silently.
- Branch: not-at-MMI → care-recommendations report; at-MMI → impairment report where **AMA Guides math is a deterministic calculator** (doctor selects method/category inputs in UI; code computes %; LLM only narrates the computed result). *(Impairment calculator = its own design doc, next question candidate.)*

---

## Cleanup checklist (do alongside)

- [ ] `temperature: 0` on all Gemini calls; store `promptVersion`/`model` in every persisted output
- [ ] Delete drifted root prompt .md files (or make them the single source imported by `prompts.ts`)
- [ ] Remove `synthesizeCaseSummary` + aggregate schemas (superseded by §3) — fixes the `currentStatus` required/absent bug
- [ ] `asOfdate` → `asOfDate`
- [ ] Golden-set eval: ~5 real packets with hand-labeled facts; measure recall (omissions) + precision (fabrications) + quote-verification pass-rate on every prompt/model change

## Open questions for you

1. Are uploaded packets typically scanned/faxed (OCR path matters) or digital-text PDFs?
2. Should staff or the doctor resolve patient-identity mismatches and coverage gaps? (Affects whose queue the flags land in.)
3. For impairment: which AMA Guides edition(s) do your jurisdictions require (4th/5th/6th)? Determines the calculator's data model.
