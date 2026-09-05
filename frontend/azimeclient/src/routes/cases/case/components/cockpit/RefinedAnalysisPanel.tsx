import { useQuery } from "@tanstack/react-query";
import { refinedAnalysisQueryOptions } from "../../../queries";
import { CockpitSection } from "./CockpitLayout";

export default function RefinedAnalysisPanel({ caseId }: { caseId: string }) {
  const analysisQuery = useQuery(refinedAnalysisQueryOptions(caseId));

  if (analysisQuery.isPending) {
    return (
      <CockpitSection
        id="refined-analysis"
        title="Refined Analysis"
        description="Analysis refined by the case artifacts and physician steering."
      >
        <p className="text-sm text-slate-500">Loading refined analysis…</p>
      </CockpitSection>
    );
  }

  if (analysisQuery.isError) {
    return (
      <CockpitSection
        id="refined-analysis"
        title="Refined Analysis"
        description="Analysis refined by the case artifacts and physician steering."
      >
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load refined analysis.
        </p>
      </CockpitSection>
    );
  }

  const storedAnalysis = analysisQuery.data;

  return (
    <CockpitSection
      id="refined-analysis"
      title="Refined Analysis"
      description="Analysis refined by the case artifacts and physician steering."
    >
      {!storedAnalysis ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Refined analysis has not been generated for this case.
        </p>
      ) : storedAnalysis.analysisParseError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Stored refined analysis is invalid:{" "}
          {storedAnalysis.analysisParseError}
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>Artifact #{storedAnalysis.id}</span>
            <span>
              Updated {new Date(storedAnalysis.updatedAt).toLocaleString()}
            </span>
          </div>
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {JSON.stringify(storedAnalysis.parsedAnalysis, null, 2)}
          </pre>
        </div>
      )}
    </CockpitSection>
  );
}
