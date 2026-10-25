# Indpendent Medical Exam Agent for Physicain.

## High-level Flow and concepts

Medical Record Extraction --> AI Summarization of case (mostly for UI) --> AI analysis of case,
comparing treatments found in records to an offline Taxonomy for the diagnosis. This is part of determining
if patient is at MMI, has pleateaued etc. --> Physician can prune and steer that analysis (human in loop) -->
refined analysis to help prepare for exam, what to focus on, etc. --> EXAM: we design the optimal exam UI, asking
the exact questions needed for all downstream needs and answering any upstream questions. --> Exam inputs + AI pass results
in suggested MMI status, related data. --> The workflow then splits on whether MMI was reached. If no, then recommended next steps,
re-evaluation timeline is decided, and the IME will not include impairment rating. If yes, then we need to follow the AMA guides for impairment calculation, e.g. for spine, determine most important diagnosis (we desgined canonical diagnosis), find in Grid, choose level, then use exam, patient functional history imagine to modify grid score.

The typical set of referral questions we get from attorneys (~20 questions) can mostly be answered by artifacts of the above workflow;
especially after desiging physicians exam and post exam forms. A typical IME report is basically the physicians exam note + answers to referral questions. Ours can improve the product with data-driven references, standardization of information deliverables, etc.

## Detailed Flow:

1. Raw single medical record document extractions per document type:

Postgres table:

```typescript
export const Records = pgTable("record", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => PatientCase.id),
  url: text("url"),
  summary: jsonb("summary"),
  summaryStatus: text("summary_status").notNull().default("pending"),
  name: text("name"),
  providerId: uuid("provider_id").references(() => CaseProviders.id),
  documentType: text("document_type").$type<DocumentType>().notNull(),
  eventDate: date("event_date"),
  metadata: jsonb("metadata").$type<RecordDocumentMetadata>(),
});
```

- summary types listed in `/src/gemini/extraction/compactTypes.ts`

2. Results from AI summary pass

```typescript
type StoredCaseClinicalSummary = {
  incidentNarrative: string;
  statusTimeline: {
    recordId: string;
    subjective: string;
    objective: string | null;
    functional: string | null;
  }[];
  caseWideSummary: string;
  psychosocialFactors: string | null;
  schemaVersion: "v2";
  sourceMetadata: {
    provider: "gemini" | "openai";
    model: string;
    sourceRecordCount: number;
  };
};
```

3. some queries help shape data for an analysis AI pass.

- in src/queries/preExamInputShapshotQueries.ts

- results from AI pass for exam prep:

```typescript
type StoredPreExamAnalysis = {
  treatmentAnalysis: {
    id: string;
    suggestionReasoning: string;
    suggestionReason:
      | "patient_factor"
      | "record_finding"
      | "variant_of_tried"
      | "multimodal"
      | null;
    treatmentId: string | null;
    treatment: string;
    source: "taxonomy" | "ai" | "record_only";
    recordDetail: string | null;
    recordStatus:
      | "To Be Started"
      | "Ongoing"
      | "Completed"
      | "Not Documented"
      | "Unclear";
    episodeIds: string[];
    assessments: {
      canonicalDx: string;
      aiApplicabilityRationale: string;
      aiApplicability:
        | "applicable"
        | "not_applicable"
        | "contraIndicated"
        | "unclear";
      aiAdequacyRationale: string;
      aiAdequacy:
        | "adequately_trialed"
        | "inadequately_trialed"
        | "not_tried"
        | "unclear";
    }[];
  }[];
  evidenceGaps: {
    id: string;
    gap: string;
    significance: string;
  }[];
  inconsistencies: {
    id: string;
    description: string;
    type: "Record" | "Clinical";
  }[];
  schemaVersion: "draft-v2";
  sourceMetadata: {
    provider: "gemini" | "openai";
    model: string;
  };
};
```

4. Physician may add, prune that analysis. Next AI pass produces:
   _Note_ We also can input the referral questions we get from attorneys into this pass, as it will inform type VisitPriority if
   AI determines we don't yet have enough data

```typescript
type RefinedAnalysis = {
  trajectoryAnalysis: {
    subjective: Trajectory;
    functional: Trajectory;
    objective: Trajectory;
  };
  visitPriority: VisitPriority[];
};

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
  focus: string; // thing to address in exam
  whyItMatters: string;
  suggestedApproach: string | null;
};
```

5. Physician Exam Inputs

- Exam - Subjective, Objective, Functional Sections
- VisitPriority answers
- Note
- \**- *Any other questions we design into a form to gather info\*
- Pain Disability Questionnaire given to patient

6. Still in progress: Post visit AI analysis in combination with Queries or physician inputs produces:

```typescript
type PostExamAnalysis = {
  updatedTrajectoryAnalysis: {
    subjective: Trajectory;
    functional: Trajectory;
    objective: Trajectory;
  };
  plateauEvidence: PlateauEvidence;
  MMIPosture: MMIPosture;
  unresolvedQs: UnresolvedQuestions;
  remainingCare: RemainingCare[];
  recommendedDiagnostics: Orders[];
  reEvalTimeline?: { weeks: number; rationle: string };
};
```

where:

```typescript
type PlateauEvidence = {
    supporting: string;
    opposing: string;
}
type MMIPosture = {
    direction: "Leans toward MMI" | "Leans Against MMI" | "Indeterminate",
    rationale: string;
}
type UnresolvedQuestions = ?;
type RemainingCare = {
    treatmentRowId: string;
    basis: "Not tried" | "Inadequately Tried",
    canonicalDx: CanonicalDx[];
    rationale: string,
}
type Orders = {study: string, rationale: string}
```

7. Prune, finalize the above. Initialize Regional Grids Per AMA?

...

9. Draft IME
