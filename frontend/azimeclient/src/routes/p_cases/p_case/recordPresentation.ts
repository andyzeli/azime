import type { RecordWithParsedSummary } from "../../cases/queries";
import type { DocumentType } from "../../../../../../backend/src/records/documentMetadata";
import type { StoredExtraction } from "../../../../../../backend/src/ai/gemini/registry";
import {
  getProviderDisciplineLabel,
  type ProviderDiscipline,
} from "@azime/contracts";
export type EventKind =
  | "incident"
  | "visit"
  | "imaging"
  | "therapy"
  | "injection"
  | "procedure"
  | "work"
  | "surgery"
  | "document";

export type TimelineEvent = {
  id: string;
  recordId: number;
  kind: EventKind;
  date: string | null;
  name: string;
  detail: string;
  provider: string;
  summary: unknown | null;
  summaryMessage: string | null;
};

const documentTypes: Record<DocumentType, { label: string; kind: EventKind }> =
  {
    encounter: { label: "Encounter", kind: "visit" },
    therapy_note: { label: "Therapy note", kind: "therapy" },
    imaging_report: { label: "Imaging report", kind: "imaging" },
    surgery_report: { label: "Surgery report", kind: "surgery" },
    intervention_report: { label: "Intervention report", kind: "procedure" },
    incident_report: { label: "Incident report", kind: "incident" },
    job_description: { label: "Job description", kind: "work" },
    workstatus: { label: "Work status", kind: "work" },
    legal_summary: { label: "Legal summary", kind: "document" },
    generic: { label: "Document", kind: "document" },
  };

const join = (values: string[], separator = "; ") =>
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(separator);
const workStatus = {
  full_duty: "Full duty",
  modified_duty: "Modified duty",
  off_work: "Off work",
  unknown: "Work status unknown",
};

// The query validates against documentType; this restores that relationship
// for TypeScript (its current query type exposes an uncorrelated summary union).
type ParsedRecord = {
  [T in DocumentType]: { documentType: T; parsedSummary: StoredExtraction<T> };
}[DocumentType];

function extractionLine(record: RecordWithParsedSummary): string {
  const { documentType, parsedSummary: summary } = record as ParsedRecord;
  switch (documentType) {
    case "encounter":
      return (
        summary.chiefComplaint ||
        summary.assessment ||
        summary.historyOfPresentIllness
      );
    case "imaging_report":
      return (
        join(summary.radiologistImpression) ||
        join([summary.modality, summary.bodySite], " · ")
      );
    case "therapy_note":
      return (
        summary.therapistAssessment ||
        summary.historyOfPresentIllness ||
        join(summary.objectiveMetrics)
      );
    case "intervention_report":
      return join([
        join([summary.name, summary.bodySite], " · "),
        summary.immediate_response,
      ]);
    case "surgery_report":
      return (
        join(
          summary.proceduresPerformed.map((p) =>
            join([p.name, p.bodySite], " · ")
          )
        ) || summary.operativeFindings
      );
    case "incident_report":
      return summary.mechanismOfInjury || join(summary.initialReportedInjuries);
    case "workstatus":
      return join([workStatus[summary.status], ...summary.restrictions]);
    case "job_description":
      return join([
        summary.jobTitle,
        summary.exertionClassification,
        ...summary.requiredPhysicalDemands,
      ]);
    case "generic":
    case "legal_summary":
      return summary.summary;
  }
}
function getTitle(
  documentType: DocumentType,
  discipline: ProviderDiscipline | null | undefined,
  name: string | null | undefined,
  metadata: RecordWithParsedSummary["metadata"]
): string {
  const disciplineLabel = discipline
    ? getProviderDisciplineLabel(discipline)
    : null;
  switch (documentType) {
    case "encounter":
      return `${disciplineLabel || "Provider"} Visit`;
    case "therapy_note":
      return disciplineLabel || "Therapy";
    case "imaging_report": {
      const modality = metadata && "modality" in metadata && typeof metadata.modality === "string"
        ? metadata.modality : "";
      const region = metadata && "region" in metadata && typeof metadata.region === "string"
        ? metadata.region : "";
      return join([modality, region], " ") || name?.trim() || documentTypes[documentType].label;
    }
    case "intervention_report":
      return "Intervention";
    case "surgery_report":
      return "Surgery";
    case "workstatus":
      return "Work status";
    default:
      return name?.trim() || documentTypes[documentType].label;
  }
}

export function toTimelineEvent(
  record: RecordWithParsedSummary
): TimelineEvent {
  const type = documentTypes[record.documentType];
  const detail = record.parsedSummary ? extractionLine(record) : "";
  const title = getTitle(
    record.documentType,
    record.provider?.discipline,
    record.name,
    record.metadata
  );
  const summaryMessage = record.summaryParseError
    ? "Extraction could not be displayed: the stored summary does not match the current schema."
    : record.parsedSummary
      ? null
      : record.summaryStatus === "processing"
        ? "Extraction in progress."
        : record.summaryStatus === "failed"
          ? "Extraction failed."
          : "No structured extraction available yet.";
  const isInjection =
    record.documentType === "intervention_report" &&
    record.parsedSummary &&
    "treatmentType" in record.parsedSummary &&
    record.parsedSummary.treatmentType === "injection";

  return {
    id: String(record.id),
    recordId: record.id,
    kind: isInjection ? "injection" : type.kind,
    date: record.eventDate,
    name: title || type.label,
    detail: detail || summaryMessage || "No summary text documented.",
    provider: record.provider?.name ?? "",
    summary: record.parsedSummary,
    summaryMessage,
  };
}

export function toTimeline(
  records: RecordWithParsedSummary[]
): TimelineEvent[] {
  return records.map(toTimelineEvent).sort((a, b) => {
    // Chronological, with undated records last and stable ordering on the same day.
    if (a.date === null) return b.date === null ? a.recordId - b.recordId : 1;
    if (b.date === null) return -1;
    return a.date.localeCompare(b.date) || a.recordId - b.recordId;
  });
}
