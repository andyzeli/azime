We are building an AI-assisted IME workflow centered on Maximum Medical Improvement (MMI).

## Pipeline so far

**Pass 1 — Document Extraction**

- Each medical document processed independently.

- Strict factual extraction according to the type of document.

- Low-temperature / no independent medical reasoning.

- Stored with source metadata and citations.

**Pass 2A — Case Synthesis**

- Consumes Pass 1 outputs.

- Produces brief case summary prose (primarily for ui)

**Pass 2B — Per-provider summaries**

- Consumes Pass 1 outputs for single provider.

- Produces succinct summary of what this provider has tried and where things stand (primarily for ui)

## Pass 3A — Pre-Exam Decision Surface

3A output goal is the generation of that cockpit decision object, that the doctor then prunes to send back to a model in pass 3B to get a refined analysis (see below).

Its job is **not to determine MMI**. It prepares a physician's cockpit by interpreting the existing record.

Current top-level output is approximately:

```json
{
  "diagnosis": "",

  "treatmentAnalysis": [],

  "trajectoryAnalysis": {},

  "inconsistencies": [],

  "evidenceGaps": [],

  "activeCareBlockers": []
}
```

### treatmentAnalysis

The input includes a lightweight treatment taxonomy for the diagnosis - the base standard of care. Pass 3A creates the union of:

1. treatments from the taxonomy,

2. additional case-specific treatments suggested by the AI,

3. treatments actually found in the record that aren't otherwise represented.

Equivalent treatments are semantically deduplicated.

Each treatment becomes one cockpit list component:

```json
{
  "category": "",

  "treatment": "",

  "source": "Taxonomy | AI Suggested | Record Only",

  "recordStatus": "Planned | Ongoing | Completed | Unclear | Not Documented",

  "aiExhaustionAssessment": "Exhausted | Not Exhausted | Unclear",

  "aiExhaustionRationale": "",

  "physicianExhaustionAssessment": null,

  "physicianExhaustionRationale": ""
}
```

`source` controls UI provenance:

- Blue = Taxonomy

- Green = AI Suggested

- White = Record Only

`recordStatus` says what actually happened.

`exhaustion` is a different, clinical question: **"Was enough of this treatment avenue tried that meaningful therapeutic runway is probably spent?"**

Completion does not imply exhaustion.

### trajectoryAnalysis

Three evidence domains:

```json
{
  "subjective": {
    "direction": "",

    "evidenceQuality": "",

    "interpretation": ""
  },

  "functional": {
    "direction": "",

    "evidenceQuality": "",

    "interpretation": ""
  },

  "objective": {
    "direction": "",

    "evidenceQuality": "",

    "interpretation": ""
  }
}
```

These are **evidence lenses**, not three separate definitions/tests for MMI.

Typical directions:

`Improving | Stable | Worsening | Fluctuating | Insufficient Data`

Evidence quality captures whether longitudinal evidence is strong, moderate, sparse, conflicting, absent, etc.

We removed `clinicalSignificance`; the physician can decide how much a trajectory matters.

### Other 3A fields

**inconsistencies**

- Clinically meaningful conflicts or evidence that does not fit together cleanly.

- Pass 2 factual conflicts can be used as input, but 3A can interpret why they matter clinically.

**evidenceGaps**

Kept simple:

```json
{
  "gap": "",

  "whyItMatters": ""
}
```

Only surface missing/sparse information that actually limits interpretation. Don't inventory every missing measurement.

## What we deliberately moved OUT of 3A

These belong in Pass 3B after physician steering:

- `plateauEvidence`

- `mmiPosture`

- `decisionCriticalQuestions`

- `visitGuidance`

We also removed various redundant significance/impact/confidence fields. The design principle became:

> 3A should surface and organize the evidence, not repeatedly synthesize its own synthesis.

## Physician Cockpit / Steering Flow

3A is persisted as an AI artifact, probably a JSONB column in a `pre_exam_analyses` table.

The UI loads:

- `preExamAnalysis`

- any existing `physicianSteering`

If no steering exists yet, `getPhysicianSteering()` simply returns null. The UI initializes an empty local steering object. We do **not** create meaningless blank DB rows.

The doctor then interacts with the cockpit:

- prune/add treatments,

- override AI treatment exhaustion judgments,

- correct diagnostic framing if necessary,

- agree/disagree/correct trajectory interpretations,

- dismiss irrelevant gaps, inconsistencies, or blockers,

- add physician reasoning as needed.

`physicianSteering` remains separate from `preExamAnalysis`.

Do **not** mutate 3A with the physician responses.

Conceptually:

```text
preExamAnalysis = immutable AI proposal
physicianSteering = human corrections / dispositions / additions

```

The UI can merge them in memory for display.

On first physician interaction, autosave/upsert `physicianSteering` into Postgres.

This separation preserves:

- AI provenance,

- physician authority,

- auditability,

- disagreement data,

- ability to change one's mind,

- clean input to later AI passes.

## Pass 3B — Physician-Steered Pre-Visit Synthesis

3B is still **pre-visit**.

It should NOT receive only 3A + physician steering. That would be lossy because 3A is only an interpretation artifact.

3B should have access to the underlying factual substrate again.

Conceptual input:

```json
{
  "diagnosis": "",

  "caseClinicalSummary": {},

  "preExamAnalysis": {},

  "physicianSteering": {},

  "taxonomy": {},

  "deterministicSignals": {}
}
```

Pass 2 (`caseClinicalSummary`) is definitely included.

Pass 1 raw extractions may be supplied if necessary for source-level detail, but ideally Pass 2 is sufficiently rich/source-linked that we don't dump every raw extraction into every call.

The hierarchy for 3B is:

- Pass 1 / Pass 2 = factual evidence

- taxonomy = external candidate treatment knowledge

- Pass 3A = previous AI interpretation

- physicianSteering = authoritative physician correction/judgment

3B should **reconsider the evidence using the physician's framing**, not merely edit the text of 3A.

If the physician changes the diagnosis, 3B can use a newly selected taxonomy corresponding to that diagnosis rather than rerunning 3A.

## Expected Pass 3B output

3B is the first real MMI synthesis pass.

It should generate roughly:

```json
{
  "plateauEvidence": {
    "supporting": [],

    "opposing": []
  },

  "decisionCriticalQuestions": [],

  "mmiPosture": {
    "direction": "Leans Toward MMI | Leans Against MMI | Indeterminate",

    "rationale": ""
  },

  "visitGuidance": []
}
```

Conceptually:

**plateauEvidence**

- Given the physician-reviewed treatment universe and trajectories, what now argues that recovery has plateaued, and what argues that meaningful improvement remains possible?

**decisionCriticalQuestions**

- What consequential clinical questions still remain unresolved after physician steering?

**mmiPosture**

- AI's advisory pre-visit synthesis, not the physician's final decision.

**visitGuidance**

- What today's IME should specifically clarify: examination targets, history questions, functional testing priorities, etc.

- This is intentionally generated only after physician steering so the visit is targeted rather than based on an unreviewed AI analysis.

## Overall flow

```text



Pass 1



Document facts



   ↓



Pass 2



Longitudinal factual case model



   ↓



Pass 3A + treatment taxonomy + deterministic signals



Construct pre-exam decision surface



   ↓



COCKPIT



Doctor prunes / corrects / adds / overrides



   ↓



Persist physicianSteering separately



   ↓



Pass 3B



Underlying facts + 3A + physician steering + taxonomy



   ↓



Plateau synthesis



MMI posture



Decision-critical questions



Targeted visit guidance



   ↓



IME VISIT



Doctor obtains new evidence:



exam + PDQ + functional testing + history + physician note



   ↓



Pass 4



Post-visit MMI synthesis using the now-complete evidence



   ↓



Physician makes authoritative MMI decision



```

Core philosophy:

> **3A = What does the existing evidence surface?**

> **Physician cockpit = Which of those things actually matter clinically?**

> **3B = Given the doctor's framing, what does the case suggest and what should today's exam resolve?**

> **Pass 4 = Given the exam too, what does the complete case now suggest?**

> **Physician = decides MMI.**
