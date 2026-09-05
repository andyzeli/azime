import AnchorQuestions from "../AnchorQuestions";
import { CockpitSection } from "./CockpitLayout";

export default function MMIDecisionPanel() {
  return (
    <CockpitSection
      id="mmi-decision"
      title="MMI Decision"
      description="Structured physician decisions that remain authoritative over AI guidance."
    >
      <AnchorQuestions onChange={() => {}} />
    </CockpitSection>
  );
}
