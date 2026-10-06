import { useSuspenseQuery } from "@tanstack/react-query";
import { mockupsRoute } from "..";
import { mockTimelineQueryOptions } from "../queries";
import TimelineColumn from "./Timeline";
import { RecordDetail } from "./RecordDetail";

export default function RecordsTab() {
  const { record } = mockupsRoute.useSearch();
  const { data: events } = useSuspenseQuery(mockTimelineQueryOptions);
  const selectedId = record ?? events[0]?.id;

  return (
    <>
      <TimelineColumn selectedId={selectedId} />
      <main className="min-w-0 flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {selectedId ? <RecordDetail recordId={selectedId} /> : <p className="text-slate-500">No records.</p>}
        </div>
      </main>
    </>
  );
}
