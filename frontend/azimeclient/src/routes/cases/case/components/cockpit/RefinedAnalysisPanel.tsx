import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportedRegions, type Region } from "@azime/contracts";
import {
  caseQueryOptions,
  generateRefinedAnalysis,
  refinedAnalysisQueryOptions,
} from "../../../queries";
import { CockpitSection } from "./CockpitLayout";

const errorMessage = (error: unknown) =>
  (error as { data?: { error?: string } } | null)?.data?.error ??
  "Request failed";

export default function RefinedAnalysisPanel({ caseId }: { caseId: string }) {
  const caseQuery = useQuery(caseQueryOptions(caseId));
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const regions = caseQuery.data?.regions ?? [];
  const region =
    selectedRegion && regions.includes(selectedRegion)
      ? selectedRegion
      : regions[0];

  return (
    <CockpitSection
      id="refined-analysis"
      title="Refined Analysis"
      description="Case context, Pass 2 timeline, and physician-reviewed pre-exam analysis."
    >
      {caseQuery.isPending ? (
        <p className="text-sm text-slate-500">Loading case…</p>
      ) : caseQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load case.</p>
      ) : !region ? (
        <p className="text-sm text-slate-500">
          Add body regions to prepare Refined Analysis.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {regions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRegion(value)}
                className={`rounded-full border px-3 py-1 text-sm ${value === region ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700"}`}
              >
                {supportedRegions.find((item) => item.value === value)?.label ??
                  value}
              </button>
            ))}
          </div>
          <RegionalRefinedAnalysis
            key={`${caseId}:${region}`}
            caseId={caseId}
            region={region}
          />
        </div>
      )}
    </CockpitSection>
  );
}

function RegionalRefinedAnalysis({
  caseId,
  region,
}: {
  caseId: string;
  region: Region;
}) {
  const queryClient = useQueryClient();
  const options = refinedAnalysisQueryOptions(caseId, region);
  const analysisQuery = useQuery(options);
  const stored = analysisQuery.data;
  const generateMutation = useMutation({
    mutationFn: () => generateRefinedAnalysis(caseId, region),
    onSuccess: (result) => queryClient.setQueryData(options.queryKey, result),
  });

  if (analysisQuery.isPending)
    return <p className="text-sm text-slate-500">Loading Refined Analysis…</p>;

  return (
    <div className="space-y-3">
      {analysisQuery.isError ? (
        <p className="text-sm text-red-600">
          Failed to load Refined Analysis: {errorMessage(analysisQuery.error)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:bg-emerald-300"
        >
          {generateMutation.isPending
            ? "Generating..."
            : stored
              ? "Regenerate"
              : "Generate"}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>Analysis: {stored ? `#${stored.id}` : "not generated"}</span>
        {stored ? (
          <span>Updated {new Date(stored.updatedAt).toLocaleString()}</span>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        Generating builds a fresh input from the case summary and physician
        review, and replaces the result only if the run succeeds.
      </p>
      {generateMutation.isError ? (
        <p className="text-sm text-red-600">
          Analysis failed: {errorMessage(generateMutation.error)}
        </p>
      ) : null}
      {stored ? (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Refined Analysis Input Snapshot
            </h3>
            <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {JSON.stringify(stored.inputSnapshot, null, 2)}
            </pre>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Refined Analysis Output
            </h3>
            <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {JSON.stringify(stored.analysis, null, 2)}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
