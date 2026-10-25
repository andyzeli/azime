THIS FILE MAY BE OUT-OF-DATE: if reading this part of this file for context, ask user if that part is still current.

# Pipeline details

Types below summarize the shared contracts in `packages/contracts/src/`. Visit documentation and pass 4 (post-exam analysis) are implemented. Persistence metadata is omitted unless relevant.

## Pass 1 and Pass 2 — Record facts

- **Pass 1:** Extract each document independently, retaining source references.
- **Pass 2A:** Produce `incidentNarrative`, `caseWideSummary`, `psychosocialFactors`, and a factual `statusTimeline`. Each timeline entry contains `recordId`, `subjective`, nullable `objective`, and nullable `functional`; server queries add nullable `date`, `providerName`, and `providerType`. Trajectory interpretation belongs in 3B.
- **Pass 2B:** Produce per-provider summaries for the UI.

## Pass 3A — Pre-exam analysis

Compare diagnosis-specific treatment taxonomy entries with documented care, including additional AI suggestions and record-only treatments. Assess applicability separately for each diagnosis, and exhaustion once per treatment across its applicable diagnoses. The taxonomy's adequacy criteria stay as the rubric for judging the documented trial (sent to the model as `trialBenchmark`); they inform exhaustion but don't decide it. Completion alone does not establish exhaustion, an incomplete or undocumented trial does not automatically mean not exhausted, and inapplicability does not mean exhausted. 3A does not determine MMI.

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
// every listed diagnosis: 3A scope, treatment review (not_supported greyed)
// current = working | supported: AMA exam tasks and 3B
// pass 4: supported only (it runs once none is left working)
```

- `GET /cases/:caseId/diagnoses/:region` returns the saved list, or (revision 0) one derived from the 3A scope. Record diagnoses missing from the list are always appended as working.
- `PUT` with `{ diagnoses, expectedRevision }`. Entries are record diagnoses or any `canonical_diagnoses` entry for the region. There is no "leave out of scope": a wrong diagnosis is not supported with a reason; only added entries can be removed.
- Marking a diagnosis not supported needs no AI. Its treatment assessments stay in the review (greyed), because the report must still give a necessity opinion on treatment given for it, but it leaves 3B and AMA tasks. Adding a diagnosis needs 3A for it: "Analyze diagnosis" runs 3A for that diagnosis only against the frozen snapshot (`POST /cases/:id/pre-exam-analysis/:region/diagnoses {canonicalDx}`) and merges it into the existing rows. Each existing row gains an applicability assessment for it, ladder entries no row covers become new rows (or upgrade a record-only row whose episodes they share), and AI suggestions become new rows. Where the new diagnosis is applicable or unclear, the row's exhaustion is re-judged and the physician's exhaustion review is cleared (not carried forward); where it is not applicable, exhaustion and its review stand. Row ids and the rest of saved steering are kept; rows that gained an assessment or lost their exhaustion review show as unreviewed again. A new snapshot and run remains the full redo, which resets steering.

```typescript
type Applicability =
  | "applicable"
  | "not_applicable"
  | "contraIndicated"
  | "unclear";
// Once per treatment, across its applicable diagnoses.
type Exhaustion =
  | "exhausted" // further use is unlikely to provide meaningful additional improvement
  | "not_exhausted" // a relevant, feasible opportunity remains insufficiently explored
  | "unclear"; // the evidence cannot establish either
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
  aiExhaustion: Exhaustion;
  aiExhaustionRationale: string; // one rationale; explains diagnosis-specific differences
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
        }
      >;
      exhaustion?: AssessmentReview<Exhaustion>;
      note?: string;
    }
  >;
  addedTreatments: PhysicianAddedTreatment[];
  inconsistencies: Record<string, FindingDisposition>; // Finding ID
  evidenceGaps: Record<string, FindingDisposition>;
  notes: string | null;
};
```

`PhysicianAddedTreatment` contains `id`, nullable `treatmentId`, `treatment`, `category`, optional `note`, assessments keyed by diagnosis with `applicability` and `rationale`, and one `exhaustion` with `exhaustionRationale`. Category is `conservative | medication | injection | surgical | multimodal`.

The Analysis tab's "+ Add treatment" creates one. The physician picks a ladder treatment that no row covers yet, which sets `treatmentId` and category, or types free text (`treatmentId: null`) and picks a category. Assessments default to applicable for each analyzed diagnosis that isn't not supported, and exhaustion to not exhausted. Rationales are optional (`""` allowed); the report infers it. Added rows count as reviewed, edit in place, and flow into 3B and pass 4 as `source: "physician"`. Add them before pass 4: an untried applicable treatment is evidence against a plateau. Added treatments aren't linked to record episodes: records are uploaded individually, so the analysis rarely misses documented care.

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
    }[];
    exhaustion: EffectiveAssessment<Exhaustion>; // one per treatment
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
    field: "treatment" | "applicability" | "exhaustion";
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

Projection uses the effective applicability for each treatment/diagnosis pair and the treatment's effective exhaustion:

- **Issues:** unclear applicability, or applicable with exhaustion `not_exhausted` or `unclear`.
- **Context:** applicable and exhausted, in compact form.
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

Capture new evidence, rather than adding another analysis-steering flow. There is one visit per case, covering every region; each region continues into its own pass 4. 3B visit priorities are read-only suggestions (at most three, each grounded in a specific conflict, gap or finding; often none). Nothing is recorded against them: whatever they prompt goes in the note, which pass 4 reads.

```typescript
// AMA history prerequisite per diagnosis. Missing = not asked; false stops rating, findings are kept.
type VisitAmaHistory = { region: Region; canonicalDx: string; confirmed: boolean };

type VisitDocumentation = {
  note: string; // Optional [LUMBAR SPINE]-style section labels; unlabeled text applies to every region
  pdqId: number | null; // The one PDQ pass 4 uses
  includedQuestionnaireIds: number[]; // Other completed questionnaires, e.g. regional
  amaHistory: VisitAmaHistory[];
  amaAssessments: AmaAssessment[]; // Findings per AMA row + root + side
};

// Built from 3A + saved steering + the diagnosis list + the visit; no dependency on 3B.
type PostExamInput = {
  caseContext: RefinedAnalysisInput["caseContext"];
  region: Region;
  diagnoses: { canonicalDx: string; label: string }[]; // supported only
  caseSummary: RefinedAnalysisInput["caseSummary"];
  reviewedTreatmentAnalysis: FullReviewedPreExamAnalysis; // scoped to the supported diagnoses
  visit: {
    examinationDate: string; // visit document creation date for now; later the office visit date
    note: string; // one free-text field; pass 4 reconciles it with the PDQ and AMA findings
    pdq: PostExamPDQ | null;
    questionnaires: (PostExamPDQ & { type: string; title: string })[];
    amaFindings: PostExamAmaFindings[]; // includes findings whose diagnosis links are gone
  };
};

type Pass4Output = {
  trajectory: { subjective: Trajectory; functional: Trajectory; objective: Trajectory }; // 3B's trajectorySchema
  plateauEvidence: { supporting: string[]; opposing: string[] };
  mmiPosture: { direction: "Leans Toward MMI" | "Leans Against MMI" | "Indeterminate"; rationale: string };
  unresolvedQuestions: { question: string; whyItMatters: string; wouldResolve: string }[];
};
// Not pass 4 outputs (plain queries, shown in Opinions): remaining care, and necessity
// questions for treatments whose linked diagnoses are all not supported.
```

Remaining-care candidates (`remainingCareCandidates` in contracts `opinions.ts`) come from the frozen pass 4 input, per treatment and diagnosis: unclear applicability, an applicable treatment whose exhaustion is not exhausted or unclear, or an applicable, exhausted treatment that is still ongoing (a maintenance question). The physician gives each candidate a disposition; exhaustion never decides care or MMI by itself.

Visit GET returns the saved document or null. `initializeVisitDocumentation()` creates an empty local draft; PUT saves `{ documentation, expectedRevision }`. "Clear visit" saves a blank document. The physician makes the final MMI decision separately.

Diagnosis conclusions are not part of the visit; they live in the diagnosis list. AMA findings can be recorded for any current diagnosis without a confirm step or a history answer.

## Persistence and downstream recall

`case_refined_pre_exam_analysis` holds one current 3B per case/region, with its frozen `inputSnapshot` and `analysis`. The snapshot contains model `input`, server-only `fullReviewedAnalysis`, and `basedOn`: case summary ID, 3A ID/timestamp, steering ID/revision, and diagnosis list revision. Its scope is the 3A scope narrowed to the current diagnoses. `POST /cases/:caseId/refined-analysis/:region` (no body) builds the input from saved steering, runs 3B, and replaces the row only if the run succeeds, so a failed run keeps the previous result. Staleness compares `basedOn` with the current 3A, steering and diagnosis list; it is informational and blocks nothing.

`case_visit_documentation` stores one revisioned document per case. `case_post_exam_analysis` stores a frozen `inputSnapshot` and nullable `analysis` for each run, with creation/update timestamps. Inputs are assembled from the region's 3A and saved steering, the diagnosis list, the case summary, the saved visit, and the PDQ and questionnaires the visit selects. Its `basedOn` records the case summary ID, 3A ID/`updatedAt`, steering ID/revision, diagnosis list revision, visit ID/revision, and PDQ ID/update time. The snapshot is refused (409) until the assessment is finished: no diagnosis left working, at least one supported, every listed diagnosis analyzed, steering saved for the current 3A, and every treatment row reviewed (`isRowReviewed`, across all listed diagnoses). The Analysis footer shows the same checklist once the visit is saved, with "Run post-exam analysis" (snapshot, then generate).

- `GET /cases/:caseId/refined-analysis/:region` (null if none) and `POST` (no body)
- `GET/PUT /cases/:caseId/visit`
- `POST /cases/:caseId/post-exam-analysis/:region/snapshot` (no body; reads the visit)
- `POST /cases/:caseId/post-exam-analysis/:region` with `{ snapshotId }` to generate and save output
- `GET /cases/:caseId/post-exam-analysis/:region`, optionally `?snapshotId=...`, to recall input and output

PDQ collection keeps its separate endpoints. The old cockpit's Refined Analysis and Visit panels remain as raw-JSON debug views. `makePostExamAnalysis` (Gemini/OpenAI, `POST_EXAM_ANALYSIS_PROVIDER`) validates output before persistence. Completed pass 4 outputs cannot be overwritten; each run takes a new snapshot. The MMI & Report tab shows the latest output per region (it becomes Opinions in phase 5).

Report drafting should retrieve these frozen artifacts and the physician's separate MMI decision, including the pass 4 trajectory and supporting/opposing plateau evidence.
