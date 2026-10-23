// Fixture data for the cockpit mockups. Shapes for 3A and steering come from
// @azime/contracts so the mockup stays honest about what the backend returns.
import type {
  PhysicianSteering,
  Region,
  StoredPreExamAnalysis,
  StoredRefinedAnalysis,
} from "@azime/contracts";

export type EventKind =
  | "incident"
  | "er"
  | "visit"
  | "imaging"
  | "therapy"
  | "injection"
  | "work";

export type TimelineEvent = {
  id: string;
  kind: EventKind;
  date: string; // display string; ranges allowed for courses
  sortDate: string;
  name: string;
  detail: string;
  provider: string;
  fields: [label: string, value: string][];
};

export type MockCase = {
  id: string;
  patient: string;
  claim: string;
  dateOfInjury: string;
  examDate: string;
  recordCount: number;
  regions: Region[];
};

export type CaseSummary = {
  generatedAt: string;
  prose: { text: string; recordId?: string }[];
  diagnoses: { code: string; label: string; canonicalDx: string; note?: string }[];
  currentStatus: [label: string, value: string][];
  pain: { date: string; score: number; label: string }[];
  workStatus: { from: string; to: string; label: string; tone: "off" | "modified" }[];
  treatments: { from: string; to?: string; label: string }[];
};

export type ProviderSummary = {
  name: string;
  specialty: string;
  visits: number;
  span: string;
  summary: { text: string; recordId?: string }[];
};

export type PreExamSetup = {
  region: Region;
  availableDiagnoses: CaseSummary["diagnoses"];
  snapshot: { takenAt: string; selectedDiagnoses: string[]; summaryDate: string } | null;
  analysis: StoredPreExamAnalysis | null;
  analysisRanAt: string | null;
  steering: PhysicianSteering | null;
  steeringRevision: number;
};

export const mockCase: MockCase = {
  id: "demo",
  patient: "Martinez, Rosa",
  claim: "WC-2024-0187",
  dateOfInjury: "03/14/2024",
  examDate: "10/08/2026",
  recordCount: 42,
  regions: ["lumbar_spine", "cervical_spine", "thoracic_spine"],
};

export const timeline: TimelineEvent[] = [
  { id: "r1", kind: "incident", date: "03/14/2024", sortDate: "2024-03-14", name: "Lifting injury", detail: "Warehouse, 40 lb box · employer report", provider: "Employer", fields: [["Mechanism", "Lifting 40 lb box from floor"], ["Reported", "Same day to supervisor"]] },
  { id: "r2", kind: "er", date: "03/14/2024", sortDate: "2024-03-14", name: "ER visit", detail: "Acute LBP, no neuro deficits · St. Mary's", provider: "St. Mary's ED", fields: [["Chief complaint", "Low back pain after lifting"], ["Neuro exam", "Intact, SLR negative"], ["Disposition", "Discharged, NSAIDs"]] },
  { id: "r3", kind: "visit", date: "03/21/2024", sortDate: "2024-03-21", name: "PCP visit", detail: "NSAIDs, muscle relaxant · Dr. Kim", provider: "Dr. J. Kim", fields: [["Pain", "7/10"], ["Plan", "Ibuprofen 800 mg, cyclobenzaprine; MRI if no improvement"]] },
  { id: "r4", kind: "imaging", date: "04/02/2024", sortDate: "2024-04-02", name: "MRI Lumbar", detail: "L4-5 protrusion, mild L foraminal narrowing", provider: "Valley Imaging", fields: [["Impression", "Moderate L4-5 broad-based protrusion with mild left foraminal narrowing. No central stenosis."], ["Other levels", "L3-4 mild desiccation; L5-S1 normal"]] },
  { id: "r5", kind: "therapy", date: "04/10 – 06/20/2024", sortDate: "2024-04-10", name: "PT course · 12 visits", detail: "Gains through visit 8, then plateau; ODI 38%", provider: "ProMotion PT", fields: [["Visits", "12 of 12 authorized"], ["Modalities", "Therapeutic exercise, manual therapy"], ["Discharge", "Plateau; HEP; ODI 38%"]] },
  { id: "r6", kind: "injection", date: "07/18/2024", sortDate: "2024-07-18", name: "ESI · L4-5 TFESI", detail: "7/10 → 3/10; ~40% relief for 6 wks", provider: "Dr. A. Okafor", fields: [["Procedure", "Left L4-5 transforaminal ESI under fluoro"], ["Pre/post pain", "7/10 → 3/10"], ["Plan", "f/u 4–6 wks, consider repeat if <50% sustained relief"]] },
  { id: "r7", kind: "work", date: "07/30/2024", sortDate: "2024-07-30", name: "Work status", detail: "Modified duty, 20 lb limit · Dr. Okafor", provider: "Dr. A. Okafor", fields: [["Status", "Modified duty"], ["Restrictions", "20 lb lifting, no repetitive bending"]] },
  { id: "r8", kind: "visit", date: "08/29/2024", sortDate: "2024-08-29", name: "Pain mgmt follow-up", detail: "~40% relief from ESI, wearing off", provider: "Dr. A. Okafor", fields: [["Pain", "4/10"], ["Plan", "Consider repeat ESI"]] },
  { id: "r9", kind: "visit", date: "01/09/2025", sortDate: "2025-01-09", name: "Ortho spine consult", detail: "Not surgical; continue conservative care", provider: "Dr. R. Patel", fields: [["Exam", "Full lumbar ROM, SLR negative"], ["Assessment", "Not a surgical candidate"]] },
  { id: "r10", kind: "visit", date: "06/12/2025", sortDate: "2025-06-12", name: "Ortho follow-up", detail: "Pain 5/10, stable · Dr. Patel", provider: "Dr. R. Patel", fields: [["Pain", "5/10"], ["Plan", "Continue HEP, follow up PRN"]] },
  { id: "r11", kind: "visit", date: "08/12/2026", sortDate: "2026-08-12", name: "Pain mgmt follow-up", detail: "Pain 6/10; \"consider repeat ESI\"", provider: "Dr. A. Okafor", fields: [["Pain", "6/10"], ["Plan", "Consider repeat ESI; continue modified duty"]] },
];

export const caseSummary: CaseSummary = {
  generatedAt: "Sep 28",
  prose: [
    { text: "48-year-old warehouse worker with a lifting injury on 03/14/2024 resulting in low back pain with left L5 radicular symptoms. MRI " },
    { text: "04/02", recordId: "r4" },
    { text: " shows a moderate L4-5 protrusion with mild left foraminal narrowing. Completed 12 PT visits " },
    { text: "Apr–Jun", recordId: "r5" },
    { text: " with early functional gains that plateaued. A single L4-5 TFESI " },
    { text: "07/18", recordId: "r6" },
    { text: " gave ~40% relief lasting six weeks; a repeat injection was discussed but not documented as performed. Ortho spine consult " },
    { text: "01/09/25", recordId: "r9" },
    { text: " recommended continued conservative care. Pain has been stable at 5–6/10 since mid-2025 on modified duty." },
  ],
  diagnoses: [
    { code: "M51.16", label: "L4-5 disc herniation w/ radiculopathy", canonicalDx: "disc_herniation" },
    { code: "S39.012", label: "Lumbar strain", canonicalDx: "lumbar_strain" },
    { code: "M51.36", label: "L3-4 degeneration", canonicalDx: "degenerative_disc", note: "pre-existing?" },
  ],
  currentStatus: [
    ["Work", "Modified duty, 20 lb"],
    ["Pain", "5–6 / 10, stable"],
    ["Last visit", "08/12/2026 · Okafor"],
  ],
  pain: [
    { date: "2024-03-14", score: 8, label: "ED" },
    { date: "2024-04-10", score: 7, label: "PT eval" },
    { date: "2024-06-20", score: 6, label: "PT d/c" },
    { date: "2024-07-18", score: 7, label: "Pre-TFESI" },
    { date: "2024-08-29", score: 4, label: "Okafor f/u" },
    { date: "2024-11-05", score: 6, label: "Okafor" },
    { date: "2025-01-09", score: 6, label: "Patel" },
    { date: "2025-06-12", score: 5, label: "Patel" },
    { date: "2025-11-20", score: 6, label: "Okafor" },
    { date: "2026-03-10", score: 5, label: "Okafor" },
    { date: "2026-08-12", score: 6, label: "Okafor" },
  ],
  workStatus: [
    { from: "2024-03-14", to: "2024-07-30", label: "TTD · off work", tone: "off" },
    { from: "2024-07-30", to: "2026-10-01", label: "Modified duty · 20 lb", tone: "modified" },
  ],
  treatments: [
    { from: "2024-04-10", to: "2024-06-20", label: "PT ×12" },
    { from: "2024-07-18", label: "TFESI" },
    { from: "2025-01-09", label: "Ortho consult" },
  ],
};

export const providerSummaries: ProviderSummary[] = [
  { name: "Dr. A. Okafor", specialty: "Pain management", visits: 9, span: "07/2024 – 08/2026", summary: [{ text: "Primary treating physician after PT. Performed one L4-5 TFESI " }, { text: "07/18", recordId: "r6" }, { text: "; documented 40% transient relief. Has kept patient on 20 lb modified duty since 07/2024 and repeatedly noted \"consider repeat ESI\" without scheduling." }] },
  { name: "Dr. R. Patel", specialty: "Orthopedic spine", visits: 2, span: "01/2025 – 06/2025", summary: [{ text: "Not a surgical candidate at this time; recommends continued conservative care. Reports full lumbar ROM " }, { text: "01/09", recordId: "r9" }, { text: ", conflicting with same-week PT measurement." }] },
  { name: "ProMotion PT", specialty: "Physical therapy", visits: 12, span: "04/2024 – 06/2024", summary: [{ text: "Gains in flexion and lifting tolerance through visit 8, then plateau. Discharged to HEP with ODI 38%." }] },
  { name: "Dr. J. Kim", specialty: "Primary care", visits: 3, span: "03/2024 – 04/2024", summary: [{ text: "Initial management with NSAIDs and muscle relaxants; ordered MRI and PT referral." }] },
  { name: "St. Mary's ED", specialty: "Emergency", visits: 1, span: "03/14/2024", summary: [{ text: "Acute LBP after lifting; no neuro deficits; discharged with NSAIDs." }] },
];

const aRow = (
  id: string,
  treatment: string,
  source: "taxonomy" | "ai" | "record_only",
  recordStatus: StoredPreExamAnalysis["treatmentAnalysis"][number]["recordStatus"],
  recordDetail: string | null,
  episodeIds: string[],
  assessments: [dx: string, app: "applicable" | "not_applicable" | "contraIndicated" | "unclear"][],
  aiExhaustion: "exhausted" | "not_exhausted" | "unclear",
  suggestionReasoning = "",
): StoredPreExamAnalysis["treatmentAnalysis"][number] => ({
  id,
  treatmentId: source === "taxonomy" ? id : null,
  treatment,
  source,
  suggestionReasoning,
  suggestionReason: source === "ai" ? "record_finding" : null,
  recordStatus,
  recordDetail,
  episodeIds,
  assessments: assessments.map(([canonicalDx, aiApplicability]) => ({
    canonicalDx,
    aiApplicability,
    aiApplicabilityRationale:
      aiApplicability === "applicable"
        ? "Targets symptoms attributable to this diagnosis."
        : aiApplicability === "contraIndicated"
          ? "Not indicated without failed surgical options and psychological screening."
          : "Does not address the pain generator for this diagnosis.",
  })),
  aiExhaustion,
  aiExhaustionRationale:
    aiExhaustion === "unclear"
      ? "One procedure documented; magnitude and duration of response not quantified, so exhaustion cannot be determined."
      : aiExhaustion === "exhausted"
        ? "Multi-visit course with documented plateau despite completion."
        : "A relevant, feasible trial has not been documented.",
});

const lumbarAnalysis: StoredPreExamAnalysis = {
  schemaVersion: "draft-v2",
  sourceMetadata: { provider: "gemini", model: "gemini-2.5-pro" },
  addedDiagnoses: [],
  treatmentAnalysis: [
    aRow("physical-therapy", "Physical therapy", "taxonomy", "Completed", "12 visits; gains then plateau", ["r5"], [["disc_herniation", "applicable"], ["lumbar_strain", "applicable"]], "exhausted"),
    aRow("lumbar-esi", "Lumbar epidural steroid injection", "taxonomy", "Completed", "1 TFESI; relief magnitude/duration unclear", ["r6", "r8"], [["disc_herniation", "applicable"], ["lumbar_strain", "not_applicable"]], "unclear"),
    aRow("nsaids", "NSAIDs", "taxonomy", "Completed", "Ibuprofen 800 mg, 6 wks", ["r3"], [["disc_herniation", "applicable"], ["lumbar_strain", "applicable"]], "exhausted"),
    aRow("muscle-relaxants", "Muscle relaxants", "taxonomy", "Completed", "Cyclobenzaprine, 2 wks", ["r3"], [["lumbar_strain", "applicable"]], "not_exhausted"),
    aRow("chiropractic", "Chiropractic", "record_only", "Unclear", "Mentioned in history, no notes", [], [["lumbar_strain", "applicable"]], "unclear"),
    aRow("lumbar-discectomy", "Lumbar discectomy", "taxonomy", "Not Documented", null, [], [["disc_herniation", "unclear"]], "not_exhausted"),
    aRow("gabapentinoids", "Neuropathic agents (gabapentin)", "ai", "Not Documented", null, [], [["disc_herniation", "applicable"]], "not_exhausted", "Persistent radicular symptoms with no neuropathic agent trial."),
    aRow("scs", "Spinal cord stimulator", "taxonomy", "Not Documented", null, [], [["disc_herniation", "contraIndicated"]], "not_exhausted"),
  ],
  inconsistencies: [
    { id: "inc-1", type: "Clinical", description: "Ortho reports full lumbar ROM on 01/09/25; PT measured 50% flexion the same week." },
    { id: "inc-2", type: "Record", description: "Injury date 03/12 on PCP intake vs 03/14 elsewhere." },
  ],
  evidenceGaps: [
    { id: "gap-1", gap: "ESI response not quantified.", significance: "Magnitude and duration of relief are unclear, so exhaustion can't be judged." },
    { id: "gap-2", gap: "No EMG/NCS.", significance: "Radiculopathy is clinical only." },
    { id: "gap-3", gap: "No home-exercise compliance notes", significance: "after PT discharge." },
  ],
};

const lumbarSteering: PhysicianSteering = {
  preExamAnalysisId: 1,
  preExamAnalysisUpdatedAt: "2026-09-29T10:16:00.000Z",
  treatments: {
    "physical-therapy": { disposition: "keep", assessments: { disc_herniation: { applicability: { action: "agree" } }, lumbar_strain: { applicability: { action: "agree" } } }, exhaustion: { action: "agree" } },
    "lumbar-esi": { disposition: "keep", assessments: { disc_herniation: { applicability: { action: "agree" } }, lumbar_strain: { applicability: { action: "agree" } } }, exhaustion: { action: "override", value: "not_exhausted", rationale: "Single injection with 40% relief at 6 wks meets criteria for a repeat; trial not complete." } },
    "muscle-relaxants": { disposition: "keep" },
    chiropractic: { disposition: "prune" },
    gabapentinoids: { disposition: "keep" },
    scs: { disposition: "prune" },
  },
  addedTreatments: [],
  inconsistencies: { "inc-1": { disposition: "keep" }, "inc-2": { disposition: "dismiss", reason: "typo, irrelevant" } },
  evidenceGaps: { "gap-1": { disposition: "keep" } },
  notes: "Focus on whether a 2nd ESI was offered/declined. Pt reportedly afraid of needles — ask.",
};

// Cervical fixture; also what "Run analysis" produces for a region with no fixture.
export const cervicalAnalysis: StoredPreExamAnalysis = {
  schemaVersion: "draft-v2",
  sourceMetadata: { provider: "gemini", model: "gemini-2.5-pro" },
  addedDiagnoses: [],
  treatmentAnalysis: [
    aRow("cervical-pt", "Physical therapy (cervical)", "taxonomy", "Not Documented", null, [], [["cervical_strain", "applicable"]], "not_exhausted"),
    aRow("cervical-nsaids", "NSAIDs", "taxonomy", "Completed", "Ibuprofen 800 mg, 6 wks", ["r3"], [["cervical_strain", "applicable"]], "exhausted"),
  ],
  inconsistencies: [],
  evidenceGaps: [{ id: "c-gap-1", gap: "No cervical exam documented after the ED visit.", significance: "Current cervical status is unknown." }],
};

export const preExamByRegion: Record<string, PreExamSetup> = {
  lumbar_spine: {
    region: "lumbar_spine",
    availableDiagnoses: caseSummary.diagnoses,
    snapshot: { takenAt: "Sep 29, 10:14", selectedDiagnoses: ["disc_herniation", "lumbar_strain"], summaryDate: "Sep 28" },
    analysis: lumbarAnalysis,
    analysisRanAt: "Sep 29, 10:16",
    steering: lumbarSteering,
    steeringRevision: 4,
  },
  cervical_spine: {
    region: "cervical_spine",
    availableDiagnoses: [{ code: "S13.4", label: "Cervical sprain", canonicalDx: "cervical_strain" }],
    snapshot: { takenAt: "Sep 29, 11:02", selectedDiagnoses: ["cervical_strain"], summaryDate: "Sep 28" },
    analysis: cervicalAnalysis,
    analysisRanAt: "Sep 29, 11:03",
    steering: {
      preExamAnalysisId: 2,
      preExamAnalysisUpdatedAt: "2026-09-29T11:03:00.000Z",
      treatments: { "cervical-pt": { disposition: "keep" }, "cervical-nsaids": { disposition: "keep" } },
      addedTreatments: [],
      inconsistencies: {},
      evidenceGaps: { "c-gap-1": { disposition: "keep" } },
      notes: null,
    },
    steeringRevision: 2,
  },
  thoracic_spine: {
    region: "thoracic_spine",
    availableDiagnoses: [{ code: "S23.3", label: "Thoracic sprain", canonicalDx: "thoracic_strain" }],
    snapshot: null,
    analysis: null,
    analysisRanAt: null,
    steering: null,
    steeringRevision: 0,
  },
};

// ---- Refined analysis (3B) ----

// Referral questions are case-level (usually entered by staff at intake).
// Each region's snapshot copies them, so editing them makes snapshots stale.
export const referralQuestions: string[] = [
  "Has the claimant reached MMI?",
  "Is a repeat lumbar ESI reasonable and necessary?",
];

export type RefinedSetup = {
  region: Region;
  snapshot: {
    takenAt: string;
    referralQuestions: string[];
    basedOn: { summaryDate: string; preExamRanAt: string; steeringRevision: number };
  } | null;
  analysis: StoredRefinedAnalysis | null;
  generatedAt: string | null;
};

const lumbarRefined: StoredRefinedAnalysis = {
  schemaVersion: "draft-v2",
  sourceMetadata: { provider: "gemini", model: "gemini-2.5-pro" },
  trajectoryAnalysis: {
    subjectiveTrajectory: {
      direction: "Stable",
      evidenceQuality: "Moderate",
      interpretation:
        "Pain has held at 5–6/10 across pain-management and ortho visits since mid-2025, after transient ESI relief (7/10 → 3/10 for ~6 weeks). Left-leg radicular complaints are recorded at each Okafor visit.",
    },
    functionalTrajectory: {
      direction: "Stable",
      evidenceQuality: "Sparse",
      interpretation:
        "Modified duty at 20 lb has been unchanged since 07/2024. The last functional measure is ODI 38% at PT discharge (06/2024). The restriction reflects a clinician-imposed limit, not demonstrated capacity.",
    },
    objectiveTrajectory: {
      direction: "Insufficient Data",
      evidenceQuality: "Conflicting",
      interpretation:
        "Ortho documented full lumbar ROM and negative SLR on 01/09/25, while PT measured 50% flexion the same week. No neurologic exam is documented after 06/2025, so current objective status can't be established.",
    },
  },
  visitPriority: [
    {
      id: "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a01",
      focus: "Response to the 07/2024 ESI, and whether a repeat was offered",
      whyItMatters:
        "You marked the injection trial inadequate. Peak relief, duration, and the reason no repeat was performed determine whether the injection avenue is actually exhausted.",
      suggestedApproach:
        "Ask for peak % relief and how many weeks it lasted. Ask directly whether a second injection was offered and, if declined, why (your note flags possible needle aversion).",
    },
    {
      id: "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a02",
      focus: "Current radicular findings",
      whyItMatters:
        "Radiculopathy is clinical only (no EMG/NCS) and prior exams conflict. Current findings anchor the disc-herniation diagnosis and whether surgical options deserve discussion.",
      suggestedApproach:
        "Bilateral SLR and slump, L5 dermatomal sensation, EHL strength, and reflexes, documented in the same terms as the 01/2025 ortho exam so they're comparable.",
    },
    {
      id: "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a03",
      focus: "Actual functional capacity vs. the 20 lb restriction",
      whyItMatters:
        "Function hasn't been measured in over two years. Without it, a stable functional trajectory may just reflect an unchanged restriction.",
      suggestedApproach:
        "Ask what tasks they perform on modified duty and at home, and what they've stopped doing. The PDQ will add a current self-report.",
    },
    {
      id: "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a04",
      focus: "Home exercise since PT discharge",
      whyItMatters:
        "Adherence isn't documented after 06/2024. It bears on whether conservative care was adequately trialed or simply stopped.",
      suggestedApproach: null,
    },
  ],
};

const cervicalRefined: StoredRefinedAnalysis = {
  schemaVersion: "draft-v2",
  sourceMetadata: { provider: "gemini", model: "gemini-2.5-pro" },
  trajectoryAnalysis: {
    subjectiveTrajectory: {
      direction: "Improving",
      evidenceQuality: "Sparse",
      interpretation:
        "Neck pain 4/10 at the ED, 2/10 at the 04/2024 PCP visit, then not mentioned again. Absence from later lumbar-focused visits may reflect resolution or simply not being asked.",
    },
    functionalTrajectory: {
      direction: "Insufficient Data",
      evidenceQuality: "Absent",
      interpretation: "No neck-specific functional limitation is documented at any point.",
    },
    objectiveTrajectory: {
      direction: "Insufficient Data",
      evidenceQuality: "Sparse",
      interpretation: "The only cervical exam is at the ED (paraspinal tenderness, full ROM). Nothing to compare against.",
    },
  },
  visitPriority: [
    {
      id: "6c2f0a90-7d4b-4f0e-9c1d-2a8e5b3c7d01",
      focus: "Whether neck symptoms have resolved",
      whyItMatters:
        "Cervical complaints disappear from the record after 04/2024. Whether they resolved or were never revisited determines if this region needs a rating at all.",
      suggestedApproach:
        "Ask directly about neck pain, headaches, and arm symptoms since 2024. Examine cervical ROM, Spurling, and upper-extremity neuro.",
    },
  ],
};

export const refinedByRegion: Record<string, RefinedSetup> = {
  lumbar_spine: {
    region: "lumbar_spine",
    snapshot: {
      takenAt: "Sep 29, 13:58",
      referralQuestions,
      basedOn: { summaryDate: "Sep 28", preExamRanAt: "Sep 29, 10:16", steeringRevision: 3 },
    },
    analysis: lumbarRefined,
    generatedAt: "Sep 29, 14:02",
  },
  cervical_spine: {
    region: "cervical_spine",
    snapshot: {
      takenAt: "Sep 29, 14:05",
      referralQuestions,
      basedOn: { summaryDate: "Sep 28", preExamRanAt: "Sep 29, 11:03", steeringRevision: 2 },
    },
    analysis: cervicalRefined,
    generatedAt: "Sep 29, 14:07",
  },
  thoracic_spine: {
    region: "thoracic_spine",
    snapshot: null,
    analysis: null,
    generatedAt: null,
  },
};

// ---- Visit (one per case) ----

export type Questionnaire = {
  id: string;
  kind: "pdq" | "other";
  name: string;
  completedAt: string | null; // null = sent, not completed
  administeredBy: string;
  score: string | null;
  interpretation: string | null;
  subscores?: [label: string, value: string][];
};

export const questionnaires: Questionnaire[] = [
  { id: "q1", kind: "pdq", name: "Pain Disability Questionnaire", completedAt: "10/01/2026", administeredBy: "Front desk · tablet", score: "86 / 150", interpretation: "Severe", subscores: [["Functional status", "62 / 100"], ["Psychosocial", "24 / 50"]] },
  { id: "q2", kind: "pdq", name: "Pain Disability Questionnaire", completedAt: "06/12/2025", administeredBy: "Prior IME intake", score: "71 / 150", interpretation: "Moderate", subscores: [["Functional status", "50 / 100"], ["Psychosocial", "21 / 50"]] },
  { id: "q3", kind: "other", name: "Oswestry Disability Index", completedAt: "10/01/2026", administeredBy: "Front desk · tablet", score: "42%", interpretation: "Severe disability" },
  { id: "q4", kind: "other", name: "Neck Disability Index", completedAt: null, administeredBy: "Sent by email 09/30", score: null, interpretation: null },
];

export type PriorityResponse = {
  priorityId: string;
  status: "couldnt_assess" | "declined" | "response";
  text?: string;
};

export type VisitDocument = {
  revision: number;
  note: string;
  selectedPdqId: string | null;
  includedQuestionnaireIds: string[];
  responses: PriorityResponse[]; // empty = everything left to the note
  // One visit, linked to each region's exam prep it was prepared from.
  basedOn: { region: Region; examPrepGeneratedAt: string }[];
};

export const visitDocument: VisitDocument = {
  revision: 2,
  note: `HISTORY
Patient reports the 07/2024 injection gave roughly 60% relief at its best, lasting about five weeks before returning to baseline. Dr. Okafor offered a second injection in fall 2024; patient declined because of anxiety about needles. Currently 6/10 low back pain with intermittent left lateral leg numbness, worse with prolonged sitting.

Neck: occasional stiffness in the morning, no arm symptoms, no headaches. Not limiting activity.

Working modified duty, mostly inventory scanning; avoids lifting over ~15 lb. Stopped mowing the lawn and recreational bowling.

EXAM
Lumbar flexion to mid-shin, extension limited by pain. SLR positive on the left at 45°, negative right. Slump positive left. Decreased light touch over left dorsal foot. EHL 4+/5 left, 5/5 right. Reflexes symmetric.
`,
  selectedPdqId: "q1",
  includedQuestionnaireIds: ["q3"],
  responses: [{ priorityId: "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a04", status: "couldnt_assess" }],
  basedOn: [
    { region: "lumbar_spine", examPrepGeneratedAt: "Sep 29, 14:02" },
    { region: "cervical_spine", examPrepGeneratedAt: "Sep 29, 14:07" },
  ],
};

// What the optional "check note coverage" pass returns for the sample note.
export const noteCoverage: Record<string, { coverage: "covered" | "partial" | "missing"; quote?: string }> = {
  "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a01": { coverage: "covered", quote: "roughly 60% relief at its best, lasting about five weeks… patient declined because of anxiety about needles" },
  "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a02": { coverage: "covered", quote: "SLR positive on the left at 45°… EHL 4+/5 left" },
  "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a03": { coverage: "partial", quote: "avoids lifting over ~15 lb. Stopped mowing the lawn" },
  "0b1a7e52-8f8e-4a37-9b55-1f3f0c2e6a04": { coverage: "missing" },
  "6c2f0a90-7d4b-4f0e-9c1d-2a8e5b3c7d01": { coverage: "partial", quote: "occasional stiffness in the morning, no arm symptoms" },
};

export type PostExamRun = { region: Region; ranAt: string; visitRevision: number } | null;
export const postExamByRegion: Record<string, PostExamRun> = {
  lumbar_spine: null,
  cervical_spine: null,
  thoracic_spine: null,
};
