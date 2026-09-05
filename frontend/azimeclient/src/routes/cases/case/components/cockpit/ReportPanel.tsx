import { CockpitSection } from "./CockpitLayout";

export default function ReportPanel() {
  return (
    <CockpitSection
      id="report"
      title="Final Report"
      description="Final report drafting and physician acceptance will live here."
    >
      <textarea
        defaultValue="report"
        className="min-h-56 w-full rounded-md border border-slate-300 p-3 text-sm text-slate-800"
      />
    </CockpitSection>
  );
}
