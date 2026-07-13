# Simplified Plan (solo-dev constraints; supersedes doc 02 where they differ)

Constraints honored: solo dev, weeks-per-feature budget, **zero added doctor friction**. The single human gate is one the doctor already performs: reading the draft before signing. Everything here exists to make that one read effective and to keep fabrications out of what he reads.

## Explicitly cut (from doc 02)

- ❌ Per-fact doctor confirmation screen → the draft review is the gate
- ❌ Fuzzy matching → normalized substring match (packets are a few pages)
- ❌ `facts` table / exploding blobs into rows → keep jsonb blob, annotate it
- ❌ Conflict-resolution workflow gate → inconsistencies just render in summary + report
- ❌ Coverage check, per-page text table, OCR pipeline, click-to-highlight PDF viewer
- ❌ Numeric ROM/neuro extraction → **impairment math uses the doctor's own IME exam, not records**; records only need history + trajectory
- ❌ Deterministic case-assembly rewrite → keep the existing aggregate pass (bug-fixed)

## Tier 1 — Prompt & schema hardening (~1 day, do now)

1. `temperature: 0` on both Gemini calls; store `promptVersion` + `model` in stored blobs.
2. Fix the aggregate bug: add `currentStatus` (and `backgroundConflicts`) to `geminiAggregateSummaryResponseSchema`, or relax the Zod side. `asOfdate` → `asOfDate`. Delete/align the drifted root prompt .md files.
3. All Gemini schema value fields **nullable** — kills ICD/dose autocomplete pressure. Prompt line: *"Null is always the correct answer for unstated data; never complete a field from medical knowledge."*
4. Replace `[p. 14]`-in-prose citations with structured evidence per array item:
   `evidence: [{ page: int, quote: string }]` — verbatim, ≤30 words. Prompt line: *"An item you cannot quote is an item you must not output."*
5. Schema edits: `incidents[]` (multi-incident), `encounters[]` replacing the cumulative SOAP blob — but lean: `{ date, summary, painScore?, evidence }`. Add `inconsistencies: [{ description, evidence }]` (prompt: record contradictions, don't pick a winner). Enums (`treatment.status` etc.) as schema enums.

## Tier 2 — Cheap verification (~2–3 days, before drafter ships)

1. At upload, extract packet text with pdftotext/pdfjs into one `Records.sourceText` column. No text extractable (scanned fax) → mark record `unverifiable`.
2. After extraction: for each evidence quote, normalized substring match (lowercase, collapse whitespace/punctuation) against `sourceText`. Write `verified: true|false` back into each blob item. ~50 lines total.
3. UI: summary items get an expandable quote + page number; unverified items get a ⚠ badge; `unverifiable` records get a banner ("scanned — quotes not machine-checked"). No new screens — decorate the existing summary view.

## Tier 3 — Draft-time safety (build with the drafter)

1. Drafter input: extraction blobs (with verified flags) + guardrail answers + doctor prose. Attorney-summary-sourced content phrased "per the attorney's summary of records."
2. Draft keeps per-provider page citations inline — this is what makes the doctor's sign-off read an audit, not a vibe check.
3. Deterministic lint before save (~50–100 lines, highest-value component in the whole plan):
   - every canonical sentence present verbatim in its assigned section;
   - every number and date in the draft must appear in `sourceText` (any record), a guardrail answer, or doctor prose — else highlight the sentence for the doctor;
   - non-empty `inconsistencies` ⇒ "Records Gaps and Inconsistencies" section present.
   Lint failures highlight; never auto-regenerate.
4. MMI: AI suggestion rendered as a short evidence summary (quotes + dates from encounters trajectory), never pre-selected; doctor answers via the existing guardrail form (dropdown + optional prose) — that form already is the minimal-friction design.

## Residual risk accepted (deliberately)

- Unverified facts can reach the draft — but badged, quoted, and cited, under a doctor's signature review.
- Scanned packets get no machine verification — banner tells the doctor exactly that.
- Omission (a fact the model never extracted) has no detector — mitigated by small packets and the doctor's read; revisit only if it shows up in practice.
