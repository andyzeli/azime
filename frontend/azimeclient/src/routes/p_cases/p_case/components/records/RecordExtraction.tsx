import type { ParsedRecord } from "../../recordPresentation";
import { EncounterView } from "./EncounterView";
import { GenericView } from "./GenericView";
import { ImagingView } from "./ImagingView";
import { IncidentView } from "./IncidentView";
import { InterventionView } from "./InterventionView";
import { JobDescriptionView } from "./JobDescriptionView";
import { SurgeryView } from "./SurgeryView";
import { TherapyView } from "./TherapyView";
import { WorkStatusView } from "./WorkStatusView";

export function RecordExtraction({ extraction }: { extraction: ParsedRecord }) {
  switch (extraction.documentType) {
    case "encounter":
      return <EncounterView data={extraction.parsedSummary} />;
    case "imaging_report":
      return <ImagingView data={extraction.parsedSummary} />;
    case "therapy_note":
      return <TherapyView data={extraction.parsedSummary} />;
    case "workstatus":
      return <WorkStatusView data={extraction.parsedSummary} />;
    case "surgery_report":
      return <SurgeryView data={extraction.parsedSummary} />;
    case "intervention_report":
      return <InterventionView data={extraction.parsedSummary} />;
    case "incident_report":
      return <IncidentView data={extraction.parsedSummary} />;
    case "job_description":
      return <JobDescriptionView data={extraction.parsedSummary} />;
    case "generic":
    case "legal_summary":
      return <GenericView data={extraction.parsedSummary} />;
  }
}
