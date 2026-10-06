import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  steeringMatchesAnalysis,
  supportedRegions,
  type Region,
} from "@azime/contracts";
import {
  caseQueryOptions,
  generatePreExamAnalysis,
  physicianSteeringQueryOptions,
  preExamAnalysisQueryOptions,
  preExamSnapshotQueryOptions,
  takePreExamSnapshot,
} from "../../../queries";
import { CockpitSection } from "./CockpitLayout";
import PhysicianSteeringPanel from "./PhysicianSteeringPanel";

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// redaxios rejects with the response; the backend sends { error } bodies.
const apiErrorMessage = (error: unknown) =>
  (error as { data?: { error?: string } } | null)?.data?.error ??
  "Request failed";

export default function PreExamCockpit({ caseId }: { caseId: string }) {
  const caseQuery = useQuery(caseQueryOptions(caseId));
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const regions = caseQuery.data?.regions ?? [];
  const region = selectedRegion ?? regions[0] ?? null;

  return (
    <CockpitSection
      id="pre-exam"
      title="Pre-Exam Cockpit"
      description="AI preparation artifact and physician steering."
    >
      {caseQuery.isPending ? (
        <p className="text-sm text-slate-500">Loading case…</p>
      ) : !region ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Add body regions to the case to run the pre-exam analysis.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {regions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRegion(value)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  value === region
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                {regionLabel(value)}
              </button>
            ))}
          </div>
          <RegionPreExam
            key={`${caseId}:${region}`}
            caseId={caseId}
            region={region}
          />
        </div>
      )}
    </CockpitSection>
  );
}

function RegionPreExam({ caseId, region }: { caseId: string; region: Region }) {
  const queryClient = useQueryClient();
  const analysisQuery = useQuery(preExamAnalysisQueryOptions(caseId, region));
  const snapshotQuery = useQuery(preExamSnapshotQueryOptions(caseId, region));
  const steeringQuery = useQuery({
    ...physicianSteeringQueryOptions(
      caseId,
      region,
      analysisQuery.data?.updatedAt,
    ),
    enabled: Boolean(analysisQuery.data?.analysis),
  });
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[] | null>(
    null,
  );
  const diagnoses = snapshotQuery.data?.inputSnapshot?.scope.diagnoses ?? [];
  const effectiveSelectedDiagnoses = selectedDiagnoses ?? diagnoses;

  const invalidatePreExam = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: preExamAnalysisQueryOptions(caseId, region).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: preExamSnapshotQueryOptions(caseId, region).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: ["physicianSteering", { caseId, region }],
      }),
    ]);

  const snapshotMutation = useMutation({
    mutationFn: () =>
      takePreExamSnapshot(
        caseId,
        region,
        snapshotQuery.data?.inputSnapshot ? effectiveSelectedDiagnoses : undefined,
      ),
    onSuccess: invalidatePreExam,
  });

  const generateMutation = useMutation({
    mutationFn: () => generatePreExamAnalysis(caseId, region),
    onSuccess: invalidatePreExam,
  });

  if (
    analysisQuery.isPending ||
    snapshotQuery.isPending ||
    (analysisQuery.data?.analysis && steeringQuery.isPending)
  ) {
    return <p className="text-sm text-slate-500">Loading pre-exam analysis…</p>;
  }

  if (analysisQuery.isError || snapshotQuery.isError || steeringQuery.isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load pre-exam analysis.
      </p>
    );
  }

  const stored = analysisQuery.data;
  const steering = steeringQuery.data;
  const busy = snapshotMutation.isPending || generateMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {diagnoses.map((diagnosis) => {
          const isSelected = effectiveSelectedDiagnoses.includes(diagnosis);

          return (
            <button
              key={diagnosis}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                setSelectedDiagnoses((current) => {
                  const selected = current ?? diagnoses;

                  return isSelected
                    ? selected.filter((value) => value !== diagnosis)
                    : [...selected, diagnosis];
                })
              }
              className={`rounded-full border px-3 py-1 text-sm ${
                isSelected
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-slate-200 text-slate-700"
              }`}
            >
              {diagnosis}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => snapshotMutation.mutate()}
          disabled={busy}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 disabled:text-slate-400"
        >
          {snapshotMutation.isPending
            ? "Taking snapshot..."
            : stored?.hasInputSnapshot
              ? "Retake snapshot"
              : "Take snapshot"}
        </button>
        <button
          type="button"
          onClick={() => generateMutation.mutate()}
          disabled={busy || !stored?.hasInputSnapshot}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:bg-emerald-300"
        >
          {generateMutation.isPending
            ? "Generating..."
            : stored?.analysis
              ? "Re-run analysis"
              : "Generate analysis"}
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>
          Snapshot: {stored?.hasInputSnapshot ? "taken" : "not taken"}
        </span>
        <span>
          Analysis: {stored?.analysis ? "generated" : "not generated"}
        </span>
        <span>
          Physician steering:{" "}
          {steering?.id ? `revision ${steering.revision}` : "not saved"}
        </span>
        {stored ? (
          <span>Updated {new Date(stored.updatedAt).toLocaleString()}</span>
        ) : null}
      </div>

      {snapshotMutation.isError ? (
        <p className="text-sm text-red-600">
          Snapshot failed: {apiErrorMessage(snapshotMutation.error)}
        </p>
      ) : null}
      {generateMutation.isError ? (
        <p className="text-sm text-red-600">
          Analysis failed: {apiErrorMessage(generateMutation.error)}
        </p>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Pre-Exam Input Snapshot
        </h3>
        {snapshotQuery.data?.inputSnapshot ? (
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {JSON.stringify(snapshotQuery.data.inputSnapshot, null, 2)}
          </pre>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No input snapshot has been taken for this region.
          </p>
        )}
      </div>

      {stored?.analysis ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">
            Pre-Exam Analysis
          </h3>
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {JSON.stringify(stored.analysis, null, 2)}
          </pre>
        </div>
      ) : null}

      {stored?.analysis &&
      steering &&
      steeringMatchesAnalysis(steering.steering, stored) ? (
        <PhysicianSteeringPanel
          key={`${stored.updatedAt}:${steering.id}:${steering.revision}`}
          response={steering}
          analysis={stored.analysis}
          disabled={busy}
        />
      ) : null}
    </div>
  );
}
