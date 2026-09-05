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
      <label className="mt-6 block">
        <span className="text-sm font-medium text-gray-700">Clinical note</span>
        <textarea
          defaultValue="write clinical notes here"
          className="mt-2 min-h-40 w-full rounded-md border border-slate-300 p-3 text-sm text-slate-800"
        />
      </label>
    </CockpitSection>
  );
}
