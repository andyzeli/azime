import { useParams } from "@tanstack/react-router";
import CaseHeader from "./cockpit/CaseHeader";
import CaseSummaryPanel from "./cockpit/CaseSummaryPanel";
import {
  CockpitLayout,
  type CockpitSectionLink,
} from "./cockpit/CockpitLayout";
import ExamPanel from "./cockpit/ExamPanel";
import MMIDecisionPanel from "./cockpit/MMIDecisionPanel";
import PreExamCockpit from "./cockpit/PreExamCockpit";
import RecordsPanel from "./cockpit/RecordsPanel";
import ReferralQuestionsPanel from "./cockpit/ReferralQuestionsPanel";
import RefinedAnalysisPanel from "./cockpit/RefinedAnalysisPanel";
import ReportPanel from "./cockpit/ReportPanel";

const cockpitSections: CockpitSectionLink[] = [
  { id: "records", label: "Records" },
  { id: "referral-questions", label: "Referral Questions" },
  { id: "case-summary", label: "Case Summary" },
  { id: "pre-exam", label: "Pre-Exam" },
  { id: "refined-analysis", label: "Refined Analysis" },
  { id: "exam", label: "Exam" },
  { id: "mmi-decision", label: "MMI Decision" },
  { id: "report", label: "Report" },
];

//TODO probably delete unused panels later. keeping them now in case we want visibility components to view data flow.
const CaseDetail = ({ caseId }: { caseId: string }) => {
  return (
    <CockpitLayout sections={cockpitSections}>
      <CaseHeader caseId={caseId} />
      <RecordsPanel caseId={caseId} />
      <ReferralQuestionsPanel caseId={caseId} />
      {/* <CaseSummaryPanel caseId={caseId} /> */}
      {/* <PreExamCockpit caseId={caseId} /> */}
      {/* <RefinedAnalysisPanel caseId={caseId} /> */}
      <ExamPanel caseId={caseId} />
      {/* <MMIDecisionPanel /> */}
      {/* <ReportPanel /> */}
    </CockpitLayout>
  );
};

const CaseDetailRoute = () => {
  const { caseId } = useParams({ from: "/cases/$caseId" });

  if (!caseId) {
    return <div>No case ID provided</div>;
  }

  return <CaseDetail caseId={caseId} />;
};

export default CaseDetailRoute;
