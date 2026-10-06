## Pipeline details

**Pass 1 — Document Extraction**

- Each medical document processed independently.
- Strict factual extraction according to the type of document.
- Low-temperature / no independent medical reasoning.
- Stored with source metadata and citations.

**Pass 2A — Case Synthesis**

- Consumes Pass 1 outputs.
- Produces brief case summary prose (primarily for ui)
- Produces a brief patient status trajectory (how symptoms and findings have progressed)

**Pass 2B — Per-provider summaries**

- Consumes Pass 1 outputs for single provider.
- Produces succinct summary of what this provider has tried and where things stand (primarily for ui)

## Pass 3A — Pre-Exam Decision Surface

3A output goal is the generation of that cockpit UI decision object, that the doctor then prunes to send back to a model in pass 3B to get a refined analysis (see below).

Its job is **not to determine MMI**. It prepares a physician's cockpit by interpreting the existing record.

Current top-level output is approximately:

```json
{
  "diagnosis": "",
  "treatmentAnalysis": [],
  "inconsistencies": [],
  "evidenceGaps": []
}
```

### treatmentAnalysis

The input includes a treatment taxonomy for the diagnosis - the base standard of care. Pass 3A output creates the union of:

1. treatments from the taxonomy,
2. additional case-specific treatments suggested by the AI (should be rare),
3. treatments actually found in the record that aren't otherwise represented.

Equivalent treatments are semantically deduplicated.

Each treatment becomes one cockpit list component:

```typescript
{
    id,                                                   // server-stamped
    treatmentId: string | null,                           // taxonomy id, null for AI Suggested / Record Only
    treatment: string,
    modality,                                             // server-filled for taxonomy rows, model-filled otherwise
    source: "Taxonomy" | "AI Suggested" | "Record Only",
    suggestionReason: "patient_factor" | "record_finding" | "variant_of_tried" | "multimodal" | null,  // AI Suggested only
    recordStatus: "Planned"|"Ongoing"|"Completed"|"Recommended"|"AwaitingAuthorization"|"Declined"|"Unclear"|"NotDocumented",
    recordDetail: string | null,                          // quantity, response, end reason — one line
    episodeIds: string[],                                 // every input episode must appear on some row
    assessments: {
      canonicalDx: string,                         // or enum.
      aiApplicability: "Applicable"|"NotApplicable"|"Contraindicated"|"Unclear",
      aiApplicabilityRationale: string,
      aiAdequacyAssessment: "AdequatelyTrialed"|"InadequatelyTrialed"|"NotTried"|"Unclear",   // vs ladder.adequacy
      aiAdequacyRationale: string,
}[]
```

`source` controls UI provenance:

- Blue = Taxonomy
- Green = AI Suggested
- White = Record Only

`recordStatus` says what actually happened.

`aiAdequacyAssessment` is a different, clinical question: **"Was enough of this treatment avenue tried that meaningful therapeutic runway is probably spent?"**

Completion does not imply exhaustion.

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
physicianSteering = human corrections / dispositions / additions...

PhysicianSteering = {
  preExamAnalysisId,
  scope: { diagnoses: CanonicalDx[] } | null,             // override → 3A re-run
  treatments: {
    [treatmentRowId]: {
      disposition: "keep" | "prune",
      assessments: {                                      // keyed by canonicalDx
        [canonicalDx]: { applicability?: ..., adequacy?: ..., rationale?: string }
      },
      note?: string,
    }
  },
  addedTreatments: { treatment, modality, canonicalDx[], adequacy, rationale }[],
  inconsistencies: { [index]: "keep" | "dismiss" },
  evidenceGaps:    { [index]: "keep" | "dismiss" },
  notes: string | null,
};


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

It should NOT receive only 3A + physician steering. That would be lossy because 3A is only an interpretation artifact.

3B should have access to the underlying factual substrate again.

Conceptual input:

```json
{
  "diagnosis": "",
  "caseClinicalSummary": {},
  "preExamAnalysis": {},
  "physicianSteering": {},
  "taxonomy": {}
}
```

Pass 2 (`caseClinicalSummary`) is included.

Pass 1 raw extractions may be supplied if necessary for source-level detail, but ideally Pass 2 is sufficiently rich/source-linked that we don't dump every raw extraction into every call.

The hierarchy for 3B is:

- Pass 1 / Pass 2 = factual evidence
- taxonomy = external candidate treatment knowledge
- Pass 3A = previous AI interpretation
- physicianSteering = authoritative physician correction/judgment

## Expected Pass 3B output

3B is the first final pre-visit preparation pass.

It should generate roughly:

```json
{
  "trajectoryAnalysis": TrajectoryAnalysis,


  "decisionCriticalQuestions": [],

  "visitGuidance": [],
  "steeringConflicts": [],
}
```

Conceptually:

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

**plateauEvidence**

- Given the physician-reviewed treatment universe and trajectories, what now argues that recovery has plateaued, and what argues that meaningful improvement remains possible?

**decisionCriticalQuestions**

- What consequential clinical questions still remain unresolved after physician steering?

**mmiPosture**

- AI's advisory pre-visit synthesis, not the physician's final decision.

**visitGuidance**

- What today's IME should specifically clarify: examination targets, history questions, functional testing priorities, etc.
- This is intentionally generated only after physician steering so the visit is targeted rather than based on an unreviewed AI analysis.

## Pass 4 — Post-visit analysis and posture

It should generate:

```json
{
  "updatedTrajectory": TrajectoryAnalysis
  "plateauEvidence": {
    "supporting": [],
    "opposing": []
  },

  "mmiPosture": {
    "direction": "Leans Toward MMI | Leans Against MMI | Indeterminate",
    "rationale": ""
  },
  "missingCare": {},//or may have this automatcially from pass 3B
  "impairmentHelpers: {},//per region


}
```

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
Trajectory
Decision-critical questions
Targeted visit guidance
   ↓
IME VISIT
Doctor obtains new evidence:
exam + PDQ + functional testing + history + physician note
   ↓
Pass 4
Plateau synthesis
MMI posture
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
