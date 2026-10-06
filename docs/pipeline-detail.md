THIS FILE MAY BE OUT-OF-DATE: if reading this part of this file for context, ask user if that part is still current.

# Pipeline details

Types below summarize the shared contracts in `packages/contracts/src/`. Visit documentation and post-exam input snapshots are scaffolded; pass 4 generation is scaffolded and gated pending final prompt/output definitions. Persistence metadata is omitted unless relevant.

## Pass 1 and Pass 2 — Record facts

- **Pass 1:** Extract each document independently, retaining source references.
- **Pass 2A:** Produce `incidentNarrative`, `caseWideSummary`, `psychosocialFactors`, and a factual `statusTimeline`. Each timeline entry contains `recordId`, `subjective`, nullable `objective`, and nullable `functional`; server queries add nullable `date`, `providerName`, and `providerType`. Trajectory interpretation belongs in 3B.
- **Pass 2B:** Produce per-provider summaries for the UI.

## Pass 3A — Pre-exam analysis

Compare diagnosis-specific treatment taxonomy entries with documented care, including additional AI suggestions and record-only treatments. Assess applicability and adequacy separately for each diagnosis. Completion alone does not establish treatment exhaustion; 3A does not determine MMI.

Diagnosis selection belongs upstream in the server input snapshot: effective diagnoses determine the taxonomy ladder before 3A runs. It is not part of physician steering.

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

The server resolves saved steering against 3A, then projects a reduced review into a new snapshot. The model receives that snapshot's `input`, not raw steering, taxonomy, or full record extractions.

```typescript
type RefinedAnalysisInput = {
  caseContext: {
    caseType: string | null;
    injuryType: "specific" | "cumulative" | "undetermined";
    dateOfInjury: string | null;
  };
  scope: { region: Region; diagnoses: string[] };
  referralQuestions: string[]; // May be empty
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

Capture new evidence, rather than adding another analysis-steering flow. Stored 3B priorities have server-stamped UUIDs; the model output has no IDs. Keep the original priorities and optionally record responses.

```typescript
type VisitPriorityResponse = {
  priorityId: string;
  status: "addressed" | "unresolved" | "not_relevant";
  note: string | null;
};

type VisitDocumentation = {
  refinedAnalysisId: number;
  exam: { findings: string }; // Free text for now
  physicianNote: string;
  priorityResponses: VisitPriorityResponse[];
};

type PostExamInput = {
  caseContext: RefinedAnalysisInput["caseContext"];
  scope: RefinedAnalysisInput["scope"];
  referralQuestions: string[];
  caseSummary: RefinedAnalysisInput["caseSummary"];
  reviewedTreatmentAnalysis: FullReviewedPreExamAnalysis; // Retained treatments with all effective assessments
  refinedAnalysis: {
    trajectoryAnalysis: RefinedAnalysisOutput["trajectoryAnalysis"];
    visitPriority: (VisitPriority & { id: string })[];
  };
  visit: {
    exam: { findings: string };
    pdq: PostExamPDQ | null; // Instrument version, questions/options, answers, scores, completion time
    physicianNote: string;
    priorityResponses: VisitPriorityResponse[];
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

Visit GET returns the saved document or null. `initializeVisitDocumentation(refinedAnalysisId)` creates an empty local draft; PUT saves `{ documentation, expectedRevision }`. Responses start as `[]`; omission means unaddressed, not resolved. Answers may already be documented in the exam or note, so duplicate entry is unnecessary. Pass 4 considers both, preserves unresolved uncertainty, and treats questions as questions rather than evidence. The physician makes the final MMI decision separately.

## Persistence and downstream recall

Each `case_refined_pre_exam_analysis` row holds a case/region, frozen `inputSnapshot`, and nullable `analysis`. The snapshot contains model `input`, server-only `fullReviewedAnalysis`, and `basedOn`: case summary ID, 3A ID/timestamp, and steering ID/revision. Generation and recall use the specific snapshot ID. Older snapshots need to be recreated to include the full review.

`case_visit_documentation` stores one revisioned document per case/region, linked to the exact 3B artifact. `case_post_exam_analysis` stores frozen `inputSnapshot` and nullable `analysis` for each run, with creation/update timestamps. Inputs are assembled from that artifact, the saved visit, and an explicitly selected completed PDQ. Its `basedOn` records the 3B ID, visit ID/revision, and PDQ ID/update time. It never reconstructs prior treatment judgments from current mutable 3A/steering rows.

- `GET/PUT /cases/:caseId/visit-documentation/:region`
- `POST /cases/:caseId/post-exam-analysis/:region/snapshot` with `{ pdqId: number | null }`
- `POST /cases/:caseId/post-exam-analysis/:region` with `{ snapshotId }` to generate and save output
- `GET /cases/:caseId/post-exam-analysis/:region`, optionally `?snapshotId=...`, to recall input and output

PDQ collection keeps its separate endpoints. The Exam panel provides a basic JSON editor and snapshot preview. The migration renames the snapshot table and adds output storage; it is generated, not applied. `makePostExamAnalysis` has Gemini/OpenAI calls and validates output before persistence, but returns 501 until its prompt and output descriptions are finalized. Completed outputs cannot be overwritten; take a new snapshot to run again.

Report drafting should retrieve these frozen artifacts and the physician's separate MMI decision, including 3B trajectory interpretations and pass 4 supporting/opposing plateau evidence.
