import { createLazyRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  supportedRegions,
  type CaseOpinionsResponse,
  type PostExamAnalysisResponse,
  type Region,
  type StoredPostExamAnalysis,
} from "@azime/contracts";
import { cn } from "@/lib/utils";
import {
  caseOpinionsQueryOptions,
  caseQueryOptions,
  postExamAnalysisQueryOptions,
  preExamSnapshotQueryOptions,
  recordsQueryOptions,
} from "../../../cases/queries";
import { Causation } from "../components/Causation";
import { MmiDecision } from "../components/MmiDecision";
import { RemainingCare } from "../components/RemainingCare";
import { Badge } from "../components/shared";
import { TimelineStrip } from "../components/TimelineStrip";
import { TrajectoryBadges } from "../components/Trajectory";
import { WorkStatus } from "../components/WorkStatus";
import { usePostExamChanges } from "../postExam";

// Read-only view of the latest post-exam analysis (pass 4) per region. Becomes the
// Opinions tab in phase 5, where the physician works from these results.

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

type Output = StoredPostExamAnalysis;
type Trajectory = Output["trajectory"]["subjective"];

const postureTone: Record<Output["mmiPosture"]["direction"], string> = {
  "Leans Toward MMI": "bg-green-100 text-green-700",
  "Leans Against MMI": "bg-amber-100 text-amber-800",
  Indeterminate: "bg-slate-100 text-slate-600",
};

function Tab() {
  const { caseId } = Route.useParams();
  const { data: patientCase } = useSuspenseQuery(caseQueryOptions(caseId));
  const { data: opinions } = useSuspenseQuery(caseOpinionsQueryOptions(caseId));
  const { data: records } = useQuery(recordsQueryOptions(caseId));
  const recordDates = (records ?? []).flatMap((r) =>
    r.eventDate ? [r.eventDate] : []
  );
  const results = useQueries({
    queries: patientCase.regions.map((r) =>
      postExamAnalysisQueryOptions(caseId, r)
    ),
  });

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
      {patientCase.regions.map((region, i) => (
        <RegionResult
          key={region}
          caseId={caseId}
          region={region}
          stored={results[i].data}
          pending={results[i].isPending}
          opinions={opinions}
          recordDates={recordDates}
        />
      ))}
      <WorkStatus caseId={caseId} saved={opinions} />
    </main>
  );
}

function RegionResult({
  caseId,
  region,
  stored,
  pending,
  opinions,
  recordDates,
}: {
  caseId: string;
  region: Region;
  stored: PostExamAnalysisResponse | null | undefined;
  pending: boolean;
  opinions: CaseOpinionsResponse | null;
  recordDates: string[];
}) {
  const analysis = stored?.analysis;
  const { data: preExamSnapshot } = useQuery(
    preExamSnapshotQueryOptions(caseId, region)
  );
  // Injury and exam dates come from the frozen pass 4 input, so the strip matches it.
  const input = stored?.inputSnapshot.input;
  const changed = usePostExamChanges(caseId, region, stored?.inputSnapshot.basedOn);
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3">
        <h2 className="text-[13.5px] font-semibold">
          {regionLabel(region)} · post-exam analysis
        </h2>
        {analysis ? (
          <span className="text-[11px] text-slate-500">
            ran {formatTime(stored.updatedAt)} · {analysis.sourceMetadata.model}{" "}
            · visit rev {stored.inputSnapshot.basedOn.visitDocumentationRevision}
            {" · "}
            {stored.inputSnapshot.input.diagnoses.map((d) => d.label).join(", ")}
          </span>
        ) : null}
        <span className="flex-1" />
        <Link
          to="/p_cases/$caseId/analysis"
          search={{ region }}
          params={{ caseId }}
          className="text-[12px] font-semibold text-blue-700 hover:underline"
        >
          {analysis ? "Re-run from Analysis" : "Run from Analysis"} →
        </Link>
      </div>

      {analysis && changed.length ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
          <b>Out of date.</b> The {changed.join(", ")} changed since this analysis ran.
          Remaining care and MMI below still follow the old run.{" "}
          <Link
            to="/p_cases/$caseId/analysis"
            search={{ region }}
            params={{ caseId }}
            className="font-semibold underline"
          >
            Re-run from Analysis
          </Link>
        </div>
      ) : null}
      {input ? (
        <div className="border-b border-slate-200 px-4 py-3">
          <TimelineStrip
            caseId={caseId}
            injuryDate={input.caseContext.dateOfInjury}
            examDate={input.visit.examinationDate}
            episodes={preExamSnapshot?.inputSnapshot?.treatmentEpisodes ?? []}
            recordDates={recordDates}
          />
        </div>
      ) : null}
      {pending ? (
        <p className="p-4 text-slate-500">Loading…</p>
      ) : !analysis ? (
        <p className="p-4 text-slate-500">
          {stored
            ? `Inputs frozen ${formatTime(stored.createdAt)}, but the analysis didn't finish. Run it again from Analysis.`
            : "Not run yet."}
        </p>
      ) : (
        <div className="grid gap-4 p-4">
          <div className="flex items-start gap-3">
            <Badge className={cn("shrink-0", postureTone[analysis.mmiPosture.direction])}>
              {analysis.mmiPosture.direction}
            </Badge>
            <p className="text-[12.5px] text-slate-700">
              {analysis.mmiPosture.rationale}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Subjective", analysis.trajectory.subjective],
                ["Functional", analysis.trajectory.functional],
                ["Objective", analysis.trajectory.objective],
              ] as [string, Trajectory][]
            ).map(([label, t]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 text-[10.5px] font-bold tracking-[.05em] text-slate-500">
                  {label.toUpperCase()} TRAJECTORY
                </div>
                <TrajectoryBadges t={t} />
                <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                  {t.interpretation}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <EvidenceList
              title="Supports a plateau"
              items={analysis.plateauEvidence.supporting}
              className="text-green-700"
            />
            <EvidenceList
              title="Against a plateau"
              items={analysis.plateauEvidence.opposing}
              className="text-amber-700"
            />
          </div>

          <RemainingCare
            caseId={caseId}
            region={region}
            input={stored.inputSnapshot.input}
            saved={opinions}
          />
          <MmiDecision
            caseId={caseId}
            region={region}
            input={stored.inputSnapshot.input}
            saved={opinions}
          />
          <Causation
            caseId={caseId}
            region={region}
            input={stored.inputSnapshot.input}
            saved={opinions}
          />
        </div>
      )}
    </section>
  );
}

function EvidenceList({
  title,
  items,
  className,
}: {
  title: string;
  items: string[];
  className: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className={cn("mb-1.5 text-[11px] font-bold", className)}>
        {title} ({items.length})
      </div>
      <ul className="list-disc space-y-1 pl-4 text-[12px] text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId/mmi")({
  component: Tab,
});
