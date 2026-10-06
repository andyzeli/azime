import type { ProviderDiscipline, ProviderKind } from "@azime/contracts";
import type { AnyStoredExtraction } from "../ai/gemini/registry.js";
import type {
  DocumentType,
  RecordDocumentMetadata,
} from "./documentMetadata.js";

export type TestRecordFixture = {
  id: string;
  label: string;
  description: string;
  name: string;
  eventDate: string;
  documentType: DocumentType;
  metadata: RecordDocumentMetadata;
  provider?: {
    name: string;
    kind: ProviderKind;
    discipline: ProviderDiscipline;
  };
  summary: AnyStoredExtraction;
};

const diagnosis1 = {
  evidence: {
    page: 1,
    quote: "MRI findings are consistent with an L4-5 disc herniation.",
  },
  name: "L4-5 disc herniation",
  icd: "M51.26",
  region: "lumbar_spine",
  canonicalDx: "disc_herniation",
};
const diagnosis2 = {
  evidence: {
    page: 1,
    quote: "Has ridiculopath.",
  },
  name: "Radiculopathy",
  icd: "M51.00",
  region: "lumbar_spine",
  canonicalDx: "radiculopathy",
};

export const testRecordFixtures: TestRecordFixture[] = [
  {
    id: "orthopedic-initial-visit",
    label: "Orthopedic initial visit",
    description:
      "Initial evaluation with diagnosis, medication, and PT referral.",
    name: "TEST - Orthopedic Initial Evaluation.pdf",
    eventDate: "2025-01-08",
    documentType: "encounter",
    metadata: {},
    provider: {
      name: "Dr. Maya Chen (Test)",
      kind: "individual",
      discipline: "orthopedics",
    },
    summary: {
      schemaVersion: "v1",
      visitType: "initial_visit",
      chiefComplaint: "Low back pain radiating into the right leg.",
      historyOfPresentIllness:
        "The patient reports persistent low back pain after lifting a heavy box at work on 12/18/2024. Pain is worse with prolonged sitting and bending.",
      reviewOfSystems: "Positive for intermittent right leg tingling.",
      reportedDateOfInjury: "18/12/2024",
      pastMedicalHistory: "No prior lumbar surgery.",
      objective:
        "Lumbar flexion limited to 45 degrees with pain. Positive right straight-leg raise at 50 degrees. Strength 5/5 bilaterally.",
      assessment: "Lumbar disc herniation with right-sided radicular symptoms.",
      medications: [
        {
          evidence: { page: 2, quote: "Start naproxen 500 mg twice daily." },
          name: "Naproxen",
          dose: "500 mg",
          frequency: "Twice daily",
          action: "Ordered",
        },
      ],
      diagnoses: [diagnosis1, diagnosis2],
      regions: ["lumbar_spine"],
      imagingFindings: [],
      treatmentsPerformed: [],
      functionalLimitations: [
        {
          evidence: {
            page: 1,
            quote:
              "Unable to sit longer than 30 minutes without changing position.",
          },
          activity: "Prolonged sitting",
          status: "Limited to about 30 minutes",
        },
      ],
      workStatus: {
        restrictions: [
          "No lifting over 15 pounds",
          "Alternate sitting and standing",
        ],
        status: "modified_duty",
      },
      diagnosticOrders: [
        {
          sourceText: "Order MRI lumbar spine without contrast.",
          modality: "MRI",
          bodyPart: "Lumbar spine",
        },
      ],
      referrals: [
        {
          sourceText: "Begin physical therapy twice weekly for six weeks.",
          specialty: "physical_therapy",
          bodyPart: "Lumbar spine",
          purpose: "Strengthening and mobility",
        },
      ],
      followUpPlan: "Return after MRI in four weeks.",
    },
  },
  {
    id: "lumbar-mri",
    label: "Lumbar MRI",
    description: "Imaging report confirming an L4-5 disc herniation.",
    name: "TEST - Lumbar MRI.pdf",
    eventDate: "2025-01-20",
    documentType: "imaging_report",
    metadata: { modality: "MRI", region: "Lumbar spine" },
    summary: {
      schemaVersion: "v1",
      modality: "MRI",
      bodySite: "Lumbar spine",
      clinicalIndication:
        "Low back pain with right lower-extremity radiculopathy.",
      comparisonStudies: "None.",
      detailedFindings:
        "L4-5: Right paracentral disc extrusion measuring 6 mm with narrowing of the right lateral recess and contact of the traversing L5 nerve root. Mild bilateral facet arthropathy. Remaining levels show no significant canal stenosis.",
      radiologistImpression: [
        "Right paracentral L4-5 disc extrusion contacting the traversing right L5 nerve root.",
        "No acute osseous abnormality.",
      ],
    },
  },
  {
    id: "physical-therapy-progress",
    label: "Physical therapy progress note",
    description:
      "Mid-course PT note with measurable but incomplete improvement.",
    name: "TEST - Physical Therapy Progress Note.pdf",
    eventDate: "2025-02-14",
    documentType: "therapy_note",
    metadata: {},
    provider: {
      name: "Northside Physical Therapy (Test)",
      kind: "facility",
      discipline: "physical_therapy",
    },
    summary: {
      schemaVersion: "v1",
      regions: ["lumbar_spine"],
      historyOfPresentIllness:
        "Pain improved from 7/10 to 4/10, but prolonged sitting and lifting remain difficult.",
      therapiesPerformed: [
        {
          type: "active_exercise",
          detail:
            "Core stabilization, bridges, and prone press-ups, 3 sets of 10.",
        },
        {
          type: "manual_therapy",
          detail: "Lumbar soft-tissue mobilization for 10 minutes.",
        },
      ],
      objectiveMetrics: [
        "Lumbar flexion improved from 45 to 60 degrees.",
        "Right straight-leg raise remains positive at 60 degrees.",
      ],
      functionalLimitations: [
        "Sitting tolerance remains limited to 45 minutes.",
      ],
      therapistAssessment:
        "The patient is making gradual progress but continues to have radicular symptoms and functional limitations.",
      followUpPlan: "Continue twice weekly for three additional weeks.",
      noteType: "progress_note_or_reeval",
    },
  },
  {
    id: "lumbar-epidural-injection",
    label: "Lumbar epidural injection",
    description: "Fluoroscopic injection with a documented immediate response.",
    name: "TEST - Lumbar Epidural Injection.pdf",
    eventDate: "2025-03-10",
    documentType: "intervention_report",
    metadata: {},
    provider: {
      name: "Dr. Maya Chen (Test)",
      kind: "individual",
      discipline: "orthopedics",
    },
    summary: {
      schemaVersion: "v1",
      name: "Lumbar epidural steroid injection",
      bodySite: "L4-5 epidural space",
      region: "lumbar_spine",
      treatmentType: "injection",
      laterality: "right",
      guidanceMethod: "fluoroscopy",
      medicationsInjected: [
        { name: "Triamcinolone", dose: "40 mg" },
        { name: "Lidocaine", dose: "1 mL of 1%" },
      ],
      immediate_response: "Pain decreased from 6/10 to 2/10 before discharge.",
      complications: "None.",
      indication:
        "Persistent lumbar radicular pain despite medication and physical therapy.",
      followUpPlan: "Follow up in three weeks to assess duration of relief.",
    },
  },
  {
    id: "modified-duty-note",
    label: "Modified-duty note",
    description: "Time-limited work restrictions following treatment.",
    name: "TEST - Work Status Note.pdf",
    eventDate: "2025-03-10",
    documentType: "workstatus",
    metadata: {},
    summary: {
      schemaVersion: "v1",
      restrictions: [
        "No lifting over 20 pounds",
        "No repetitive bending or twisting",
        "May change position every 30 minutes",
      ],
      status: "modified_duty",
      effectiveFrom: "10/03/2025",
      effectiveThrough: "31/03/2025",
    },
  },
];

export type TestRecordFixtureSummary = Pick<
  TestRecordFixture,
  "id" | "label" | "description" | "documentType" | "eventDate"
>;

export const testRecordFixtureSummaries: TestRecordFixtureSummary[] =
  testRecordFixtures.map(
    ({ id, label, description, documentType, eventDate }) => ({
      id,
      label,
      description,
      documentType,
      eventDate,
    })
  );
