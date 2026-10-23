import PatientQuestionnairesPanel from "../PatientQuestionnairesPanel";
import { CockpitSection } from "./CockpitLayout";

export default function ExamPanel({ caseId }: { caseId: string }) {
  return (
    <CockpitSection
      id="exam"
      title="Exam"
      description="Patient questionnaires and physician examination notes."
    >
      <PatientQuestionnairesPanel caseId={caseId} embedded />
      {/* <VisitDocumentationPanel caseId={caseId} /> */}
    </CockpitSection>
  );
}
