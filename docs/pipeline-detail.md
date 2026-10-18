THIS FILE MAY BE OUT-OF-DATE: if reading this part of this file for context, ask user if that part is still current.

# Pipeline details

Types below summarize the shared contracts in `packages/contracts/src/`. Visit documentation and post-exam input snapshots are implemented; pass 4 generation is scaffolded and gated pending final prompt/output definitions. Persistence metadata is omitted unless relevant.

## Pass 1 and Pass 2 — Record facts

- **Pass 1:** Extract each document independently, retaining source references.
- **Pass 2A:** Produce `incidentNarrative`, `caseWideSummary`, `psychosocialFactors`, and a factual `statusTimeline`. Each timeline entry contains `recordId`, `subjective`, nullable `objective`, and nullable `functional`; server queries add nullable `date`, `providerName`, and `providerType`. Trajectory interpretation belongs in 3B.
- **Pass 2B:** Produce per-provider summaries for the UI.

## Pass 3A — Pre-exam analysis

Compare diagnosis-specific treatment taxonomy entries with documented care, including additional AI suggestions and record-only treatments. Assess applicability and adequacy separately for each diagnosis. Completion alone does not establish treatment exhaustion; 3A does not determine MMI.

Diagnosis selection belongs upstream in the server input snapshot: effective diagnoses determine the taxonomy ladder before 3A runs. It is not part of physician steering. Scope comes from the region's diagnosis list (below); the snapshot request `{ selectedDiagnoses?: string[] }` is only sent by the old cockpit, and omitted means the list's current diagnoses.

## Diagnosis list

One list per case/region (`case_region_diagnoses`, revisioned) holds both the scope and the physician's conclusions. It is separate from steering because steering belongs to one 3A run, while the list exists before any 3A and outlives reruns. It can be edited before or after the exam; there is no confirm step and no return to Analysis.

```typescript
type DiagnosisState = {
  canonicalDx: string;
  source: "records" | "added"; // found by the case summary, or added by the physician
  status: "working" | "supported" | "not_supported"; // every listed diagnosis gets a verdict
  reason: string | null;
};
// every listed diagnosis: 3A scope, treatment review (not_supported greyed), pass 4
// current = working | supported: AMA exam tasks and 3B
```

- `GET /cases/:caseId/diagnoses/:region` returns the saved list, or (revision 0) one derived from the 3A scope. Record diagnoses missing from the list are always appended as working.
- `PUT` with `{ diagnoses, expectedRevision }`. Entries are record diagnoses or any `canonical_diagnoses` entry for the region. There is no "leave out of scope": a wrong diagnosis is not supported with a reason; only added entries can be removed.
- Marking a diagnosis not supported needs no AI. Its treatment assessments stay in the review (greyed), because the report must still give a necessity opinion on treatment given for it, but it leaves 3B and AMA tasks. Adding a diagnosis needs 3A for it; until a new snapshot and run, Analysis shows it as not covered. (Planned: a 3A run for the added diagnosis only, merged without resetting steering.)

```typescript
type Applicability =
  | "applicable"
  | "not_applicable"
  | "contraIndicated"
  | "unclear";
type Adequacy =
  | "adequately_trialed"
  | "inadequately_trialed"
  | "not_tried"
  | "patient_declined" // Offered and declined; the rationale records the basis of the decline
  | "unclear";
type RecordStatus =
  | "To Be Started"
  | "Ongoing"
  | "Completed"
  | "Not Documented"
  | "Unclear";

type TreatmentAssessment = {
  canonicalDx: string;
  aiApplicability: Applicability;
  aiApplicabilityRationale: string;
  aiAdequacy: Adequacy;
  aiAdequacyRationale: string;
};

type TreatmentRow = {
  id: string; // Server-stamped UUID
  treatmentId: string | null;
  treatment: string;
  source: "taxonomy" | "ai" | "record_only";
  suggestionReasoning: string;
  suggestionReason:
    | "patient_factor"
    | "record_finding"
    | "variant_of_tried"
    | "multimodal"
    | null;
  recordStatus: RecordStatus;
  recordDetail: string | null;
  episodeIds: string[];
  assessments: TreatmentAssessment[];
};

type PreExamAnalysis = {
  treatmentAnalysis: TreatmentRow[];
  inconsistencies: {
    id: string;
    description: string;
    type: "Record" | "Clinical";
  }[];
  evidenceGaps: { id: string; gap: string; significance: string }[];
};
```

These are persisted clinical fields; the model does not generate the IDs. Region and diagnosis scope come from the input snapshot, not a `diagnosis` output field.

## Physician steering

Store sparse physician decisions separately from 3A. The UI and server use the same pure `resolvePreExamReview(analysis, steering)` function; neither input is mutated.

```typescript
type AssessmentReview<T> =
  | { action: "agree"; note?: string }
  | { action: "override"; value: T; rationale: string };

type FindingDisposition = { disposition: "keep" | "dismiss"; reason?: string };

type PhysicianSteering = {
  preExamAnalysisId: number;
  preExamAnalysisUpdatedAt: string;
  treatments: Record<
    string,
    {
      // Treatment row ID
      disposition?: "keep" | "prune";
      assessments?: Record<
        string,
        {
          // canonicalDx
          applicability?: AssessmentReview<Applicability>;
          adequacy?: AssessmentReview<Adequacy>;
        }
      >;
      note?: string;
    }
  >;
  addedTreatments: PhysicianAddedTreatment[];
  inconsistencies: Record<string, FindingDisposition>; // Finding ID
  evidenceGaps: Record<string, FindingDisposition>;
  notes: string | null;
};
```

`PhysicianAddedTreatment` contains `id`, nullable `treatmentId`, `treatment`, `category`, `episodeIds`, optional `note`, and assessments keyed by diagnosis with `applicability`, `adequacy`, and `rationale`. Category is `conservative | medication | injection | surgical | multimodal`.

GET by case/region returns matching saved steering or an initialized, unsaved draft (`id: null`, `revision: 0`); no 3A means no draft. Initialization copies the 3A ID/timestamp, sets maps to `{}`, additions to `[]`, and notes to `null`. Missing decisions mean unreviewed, not agreement. Save explicitly with `{ steering, expectedRevision }`.

## Pass 3B — Refined Analysis

**Goal:** Given the physician's framing, what does the case suggest and what should today's encounter clarify?

The server resolves saved steering against 3A, then projects a reduced review into the input snapshot stored with the result. The model receives that snapshot's `input`, not raw steering, taxonomy, or full record extractions.

```typescript
type RefinedAnalysisInput = {
  caseContext: {
    caseType: string | null;
    injuryType: "specific" | "cumulative" | "undetermined";
    dateOfInjury: string | null;
  };
  scope: { region: Region; diagnoses: string[] };
  caseSummary: CaseClinicalSummaryWithEnrichedTimeline; // Pass 2A
  reviewedAnalysis: ReviewedPreExamAnalysis;
};

type EffectiveAssessment<T> = {
  value: T;
  rationale: string;
  source: "ai" | "physician";
  reviewStatus: "unreviewed" | "agree" | "override" | "provided";
  note: string | null;
};

type ReviewedPreExamAnalysis = {
  treatmentIssues: {
    id: string;
    treatmentId: string | null;
    treatment: string;
    source: "taxonomy" | "ai" | "record_only" | "physician";
    category:
      | "conservative"
      | "medication"
      | "injection"
      | "surgical"
      | "multimodal"
      | null;
    recordStatus: RecordStatus | null;
    recordDetail: string | null;
    episodeIds: string[];
    assessments: {
      canonicalDx: string;
      applicability: EffectiveAssessment<Applicability>;
      adequacy: EffectiveAssessment<Adequacy>;
    }[];
    dispositionReviewed: boolean;
    physicianNote: string | null;
  }[];
  treatmentContext: {
    id: string;
    treatment: string;
    canonicalDx: string;
    recordDetail: string | null;
  }[];
  treatmentNotes: {
    id: string;
    treatment: string;
    canonicalDx: string | null;
    field: "treatment" | "applicability" | "adequacy";
    note: string;
  }[];
  inconsistencies: (PreExamAnalysis["inconsistencies"][number] & {
    reviewed: boolean;
    physicianNote: string | null;
  })[];
  evidenceGaps: (PreExamAnalysis["evidenceGaps"][number] & {
    reviewed: boolean;
    physicianNote: string | null;
  })[];
  physicianNotes: string | null;
};
```

Projection uses effective judgments for each treatment/diagnosis pair:

- **Issues:** unclear applicability, or applicable with adequacy other than `adequately_trialed`.
- **Context:** applicable and adequately trialed, in compact form.
- **Omit:** pruned treatments and inapplicable/contraindicated assessments; preserve explicit physician notes from omitted assessments on retained treatments.
- Include retained inconsistencies and gaps. A treatment can appear in both issues and context for different diagnoses.

```typescript
type Trajectory = {
  direction:
    | "Improving"
    | "Stable"
    | "Worsening"
    | "Fluctuating"
    | "Insufficient Data";
  evidenceQuality: "Strong" | "Moderate" | "Sparse" | "Conflicting" | "Absent";
  interpretation: string;
};

type VisitPriority = {
  focus: string;
  whyItMatters: string;
  suggestedApproach: string | null;
};

type RefinedAnalysisOutput = {
  trajectoryAnalysis: {
    subjectiveTrajectory: Trajectory;
    functionalTrajectory: Trajectory;
    objectiveTrajectory: Trajectory;
  };
  visitPriority: VisitPriority[];
};
```

The prompt explains the task and input domain; Zod `.describe()` fields explain output behavior and survive JSON Schema conversion. Plateau evidence and MMI posture belong in pass 4.

## Visit documentation and pass 4

Capture new evidence, rather than adding another analysis-steering flow. There is one visit per case, covering every region; each region continues into its own pass 4. Stored 3B priorities get positional IDs (`priority-0`, …) that are reused when 3B is regenerated, so priority responses are matched by region + `focus` text instead. Keep the original priorities and optionally record responses.

```typescript
type VisitPriorityResponse = {
  region: Region;
  focus: string; // The priority's text at the time of the response
  status: "couldnt_assess" | "declined" | "not_relevant" | "response";
  note: string | null;
};

// AMA history prerequisite per diagnosis. Missing = not asked; false stops rating, findings are kept.
type VisitAmaHistory = { region: Region; canonicalDx: string; confirmed: boolean };

type VisitDocumentation = {
  note: string; // Optional [LUMBAR SPINE]-style section labels; unlabeled text applies to every region
  pdqId: number | null; // The one PDQ pass 4 uses
  includedQuestionnaireIds: number[]; // Other completed questionnaires, e.g. regional
  priorityResponses: VisitPriorityResponse[];
  amaHistory: VisitAmaHistory[];
  amaAssessments: AmaAssessment[]; // Findings per AMA row + root + side
};

type PostExamInput = {
  caseContext: RefinedAnalysisInput["caseContext"];
  scope: RefinedAnalysisInput["scope"];
  caseSummary: RefinedAnalysisInput["caseSummary"];
  reviewedTreatmentAnalysis: FullReviewedPreExamAnalysis; // Retained treatments with all effective assessments
  refinedAnalysis: {
    trajectoryAnalysis: RefinedAnalysisOutput["trajectoryAnalysis"];
    visitPriority: (VisitPriority & { id: string })[];
  };
  visit: {
    note: string;
    priorityResponses: VisitPriorityResponse[]; // This region's only
    pdq: PostExamPDQ | null; // Instrument version, questions/options, answers, scores, completion time
    questionnaires: (PostExamPDQ & { type: string; title: string })[]; // Other included questionnaires, frozen the same way
  };
};

type Pass4Output = {
  // Provisional schema; generation remains gated
  plateauEvidence: { supporting: string[]; opposing: string[] };
  mmiPosture: {
    direction: "Leans Toward MMI" | "Leans Against MMI" | "Indeterminate";
    rationale: string;
  };
};
```

Visit GET returns the saved document or null. `initializeVisitDocumentation()` creates an empty local draft; PUT saves `{ documentation, expectedRevision }`. Responses start as `[]`; omission means unaddressed, not resolved. Responses whose priority no longer exists after 3B is regenerated are kept, never deleted; the visit is not redone. Answers may already be documented in the exam or note, so duplicate entry is unnecessary. Pass 4 considers both, preserves unresolved uncertainty, and treats questions as questions rather than evidence. The physician makes the final MMI decision separately.

Diagnosis conclusions are not part of the visit; they live in the diagnosis list. AMA findings can be recorded for any current diagnosis without a confirm step or a history answer.

## Persistence and downstream recall

`case_refined_pre_exam_analysis` holds one current 3B per case/region, with its frozen `inputSnapshot` and `analysis`. The snapshot contains model `input`, server-only `fullReviewedAnalysis`, and `basedOn`: case summary ID, 3A ID/timestamp, steering ID/revision, and diagnosis list revision. Its scope is the 3A scope narrowed to the current diagnoses. `POST /cases/:caseId/refined-analysis/:region` (no body) builds the input from saved steering, runs 3B, and replaces the row only if the run succeeds, so a failed run keeps the previous result. Staleness compares `basedOn` with the current 3A, steering and diagnosis list; it is informational and blocks nothing.

`case_visit_documentation` stores one revisioned document per case. `case_post_exam_analysis` stores a frozen `inputSnapshot` and nullable `analysis` for each run, with creation/update timestamps. Inputs are assembled from the region's current 3B, the saved visit, and the PDQ and questionnaires the visit selects. Its `basedOn` records the 3B ID and `updatedAt` (the row is overwritten on regeneration, so the ID alone is not a version), visit ID/revision, and PDQ ID/update time. It never reconstructs prior treatment judgments from current mutable 3A/steering rows.

- `GET /cases/:caseId/refined-analysis/:region` (null if none) and `POST` (no body)
- `GET/PUT /cases/:caseId/visit`
- `POST /cases/:caseId/post-exam-analysis/:region/snapshot` (no body; reads the visit)
- `POST /cases/:caseId/post-exam-analysis/:region` with `{ snapshotId }` to generate and save output
- `GET /cases/:caseId/post-exam-analysis/:region`, optionally `?snapshotId=...`, to recall input and output

PDQ collection keeps its separate endpoints. The old cockpit's Refined Analysis and Visit panels remain as raw-JSON debug views. `makePostExamAnalysis` has Gemini/OpenAI calls and validates output before persistence, but returns 501 until its prompt and output descriptions are finalized. Completed pass 4 outputs cannot be overwritten; take a new snapshot to run again.

Report drafting should retrieve these frozen artifacts and the physician's separate MMI decision, including 3B trajectory interpretations and pass 4 supporting/opposing plateau evidence.
