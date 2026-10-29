/**
 * Stored extractions also carry schemaVersion: "v1" (withStoredFields in @azime/contracts).
 * Document date, provider, and other record metadata live outside these payloads.
 */
export type CompactTypes = {
  encounter: encounterSchemaType;
  therapy_note: therapyNoteSchemaType;
  imaging_report: imagingReportSchemaType;
  surgery_report: surgeryReportSchemaType;
  intervention_report: interventionReportSchemaType;
  legal_summary: legalSummarySchemaType;
  workstatus: workstatusSchemaType;
  incident_report: incidentReportSchemaType;
  generic: genericSummarySchemaType;
  job_description: jobDescriptionSchemaType;
};

// Shared items (shared.ts).
export type Evidence = { page: number; quote: string }; // Integer page; direct source quote.

/**
 * Documented diagnosis plus taxonomy mapping. Stored region/canonicalDx are
 * separate strings (e.g. "lumbar" / "stenosis"); unresolved uses "unclear" /
 * "unresolved". Dynamic model schemas omit region and emit "region.diagnosis"
 * in canonicalDx; registry.ts splits that value before storage.
 */
export type Diagnosis = {
  evidence: Evidence;
  name: string;
  icd: string | null;
  region: string;
  canonicalDx: string;
};

export type Medication = {
  evidence: Evidence;
  name: string;
  dose: string;
  frequency: string;
  action: "Ordered" | "Stopped" | "Current";
};

export type ImagingSummary = {
  evidence: Evidence;
  modality: string;
  date: string;
  bodyPart: string;
  impression: string;
  relationshipToVisit:
    | "performed_at_visit"
    | "results_reviewed"
    | "historical_reference"
    | "unclear";
};

export type FunctionalLimitation = {
  evidence: Evidence;
  activity: string;
  status: string;
};

// Region values are case-specific; dynamic procedure/therapy schemas also allow
// "other_body_part" and "unclear". Encounter regions allow case regions + "unclear".
export type ProcedureItem = { name: string; bodySite: string; region: string };

export type TreatmentPerformed = {
  name: string;
  bodySite: string;
  region: string;
  treatmentType:
    | "injection"
    | "ablation"
    | "aspiration"
    | "manipulation"
    | "immobilization"
    | "modality"
    | "Other"
    | "Unknown";
  laterality:
    "left" | "right" | "bilateral" | "midline" | "not_applicable" | "unclear";
  guidanceMethod:
    "fluoroscopy" | "ultrasound" | "CT" | "none" | "other" | "unclear";
  medicationsInjected: { name: string; dose: string }[];
  immediate_response: string;
  complications: string;
};

// Encounter orders and standalone imaging reports share these modality values.
export type DiagnosticModality =
  | "MRI"
  | "CT"
  | "X-ray"
  | "Ultrasound"
  | "EMG/NCV"
  | "bone_scan"
  | "lab"
  | "other";
export type WorkStatus = {
  restrictions: string[];
  status: "full_duty" | "modified_duty" | "off_work" | "unknown";
};
export type DiagnosticOrder = {
  sourceText: string;
  modality: DiagnosticModality;
  bodyPart: string;
};
export type Referral = {
  sourceText: string;
  specialty:
    | "physical_therapy"
    | "occupational_therapy"
    | "chiropractic"
    | "acupuncture"
    | "pain_management"
    | "orthopedic_surgery"
    | "neurosurgery"
    | "neurology"
    | "psychiatry_psychology"
    | "physiatry"
    | "rheumatology"
    | "podiatry"
    | "other";
  bodyPart: string;
  purpose: string;
};

// encounter.ts: clinical visit narrative, evidence-backed items, and care plan.
export type encounterSchemaType = {
  visitType: "initial_visit" | "follow_up";
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: string;
  reportedDateOfInjury: string; // dd/mm/yyyy per schema description.
  pastMedicalHistory: string;
  objective: string;
  assessment: string;
  medications: Medication[];
  diagnoses: Diagnosis[];
  regions: string[];
  imagingFindings: ImagingSummary[];
  treatmentsPerformed: TreatmentPerformed[]; // Performed at this visit, not future plans.
  functionalLimitations: FunctionalLimitation[];
  workStatus: WorkStatus;
  diagnosticOrders: DiagnosticOrder[];
  referrals: Referral[];
  followUpPlan: string;
};

// therapyNote.ts: rehabilitation treatments, significant metrics, and progress.
export type TherapyItem = {
  detail: string;
  type:
    | "active_exercise"
    | "manual_therapy"
    | "passive_modalities"
    | "functional_training"
    | "aquatic_therapy"
    | "home_exercise_program"
    | "other";
};
export type therapyNoteSchemaType = {
  regions: string[];
  historyOfPresentIllness: string;
  therapiesPerformed: TherapyItem[]; // Defaults to [] when omitted during parsing.
  objectiveMetrics: string[];
  functionalLimitations: string[];
  therapistAssessment: string;
  followUpPlan: string;
  noteType:
    | "initial_eval"
    | "progress_note_or_reeval"
    | "daily_note"
    | "discharge_summary"
    | "unspecified";
};

// imaging.ts: standalone study; findings and impressions copied from the report.
export type imagingReportSchemaType = {
  modality: DiagnosticModality;
  bodySite: string;
  clinicalIndication: string;
  comparisonStudies: string;
  detailedFindings: string;
  radiologistImpression: string[];
};

// surgery.ts: completed operations, perioperative diagnoses, and recovery plan.
export type surgeryReportSchemaType = {
  preOpDiagnoses: Diagnosis[];
  postOpDiagnoses: Diagnosis[];
  proceduresPerformed: ProcedureItem[];
  implantsAndHardware: string[];
  operativeFindings: string;
  complications: string;
  postOpPlanAndRestrictions: string;
};

// intervention.ts: standalone non-surgical procedure, extending shared treatment.
export type interventionReportSchemaType = TreatmentPerformed & {
  indication: string;
  followUpPlan: string;
};

// generic.ts: fallback summary; registry.ts uses the same schema for legal_summary.
export type genericSummarySchemaType = {
  evidence: Evidence[];
  summary: string;
};
export type legalSummarySchemaType = genericSummarySchemaType;

// workstatus.ts: standalone work ability/restrictions and optional effective dates.
export type workstatusSchemaType = WorkStatus & {
  effectiveFrom?: string; // dd/mm/yyyy.
  effectiveThrough?: string; // dd/mm/yyyy.
};

// incidentReport.ts: reported accident and alleged injuries, not confirmed diagnoses.
export type incidentReportSchemaType = {
  dateOfIncident: string;
  mechanismOfInjury: string;
  initialReportedInjuries: string[];
};

// jobDescription.ts: occupation demands for comparison with functional capacity.
export type jobDescriptionSchemaType = {
  jobTitle: string;
  requiredPhysicalDemands: string[];
  exertionClassification:
    "Sedentary" | "Light" | "Medium" | "Heavy" | "Very Heavy" | "Unspecified";
};

///
