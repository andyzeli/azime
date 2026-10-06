import { createLazyRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { recordsQueryOptions } from "../../../cases/queries";
import TimelineColumn from "../components/Timeline";
import { RecordDetail } from "../components/RecordDetail";
import { toTimeline } from "../recordPresentation";

function Tab() {
  const { caseId } = Route.useParams();
  // Child routes inherit the cockpit's validated ?record= search parameter.
  const { record } = Route.useSearch();
  const { data: records } = useSuspenseQuery(recordsQueryOptions(caseId));
  const timeline = toTimeline(records);
  const selectedId = record ?? timeline[0]?.id;

  return (
    <>
      <TimelineColumn events={timeline} selectedId={selectedId} caseId={caseId} />
      <main className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {selectedId ? (
            <RecordDetail key={`${caseId}:${selectedId}`} events={timeline} recordId={selectedId} />
          ) : (
            <p className="text-slate-500">No records.</p>
          )}
        </div>
      </main>
    </>
  );
}

export const Route = createLazyRoute("/p_cases/$caseId/records")({
  component: Tab,
});
