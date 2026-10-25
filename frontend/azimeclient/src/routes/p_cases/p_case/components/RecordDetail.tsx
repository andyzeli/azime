import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { Btn, EventDot } from "./shared";
import { fetchRecordDownloadUrl, recordsQueryOptions } from "@/routes/cases/queries";
import { RecordExtraction } from "./records/RecordExtraction";
import { toTimeline, type TimelineEvent } from "../recordPresentation";

const cockpitRoute = getRouteApi("/p_cases/$caseId");

function useShowRecord() {
  const navigate = useNavigate();
  return (record: string | undefined) =>
    navigate({ to: ".", search: (prev) => ({ ...prev, record }) });
}

// The full validated extraction is displayed; only the timeline is condensed.
export function RecordDetail({
  recordId,
  closable,
  events,
}: {
  recordId: string;
  closable?: boolean;
  events: TimelineEvent[];
}) {
  const showRecord = useShowRecord();
  const download = useMutation({
    mutationFn: fetchRecordDownloadUrl,
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
  });
  const index = events.findIndex((event) => event.id === recordId);
  const event = events[index];
  if (!event) return <p className="text-slate-500">Record not found in this case.</p>;
  const prev = events[index - 1];
  const next = events[index + 1];

  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-3">
        <EventDot kind={event.kind} />
        <div className="flex-1">
          <div className="text-[11px] font-medium text-slate-400">
            {event.date ?? "Date not documented"}
          </div>
          <div className="text-[15px] font-semibold">{event.name}</div>
          <div className="text-slate-500">{event.provider}</div>
        </div>
        {closable ? (
          <button
            type="button"
            onClick={() => showRecord(undefined)}
            className="text-slate-400 hover:text-slate-800"
            aria-label="Close record"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        {event.extraction ? (
          <RecordExtraction extraction={event.extraction} />
        ) : (
          <p className="text-slate-500">{event.summaryMessage}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <Btn disabled={!prev} onClick={() => showRecord(prev?.id)} className="flex items-center gap-1">
          <ChevronLeft className="size-3.5" /> prev
        </Btn>
        <Btn disabled={!next} onClick={() => showRecord(next?.id)} className="flex items-center gap-1">
          next <ChevronRight className="size-3.5" />
        </Btn>
        <Btn
          disabled={download.isPending}
          onClick={() => download.mutate(event.recordId)}
          className="flex items-center gap-1"
        >
          {download.isPending ? "Opening…" : "Open PDF"} <ExternalLink className="size-3.5" />
        </Btn>
      </div>
      {download.isError ? <p className="mt-2 text-sm text-red-700">Could not open the document.</p> : null}
    </div>
  );
}

export function RecordDrawer({ recordId }: { recordId?: string }) {
  const { caseId } = cockpitRoute.useParams();
  if (!recordId) return null;
  return <CaseRecordDrawer caseId={caseId} recordId={recordId} />;
}

function CaseRecordDrawer({ caseId, recordId }: { caseId: string; recordId: string }) {
  const { data: records } = useSuspenseQuery(recordsQueryOptions(caseId));
  return (
    <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-slate-300 bg-white p-4 shadow-[-12px_0_30px_rgba(15,23,42,.08)]">
      <RecordDetail key={`${caseId}:${recordId}`} events={toTimeline(records)} recordId={recordId} closable />
    </aside>
  );
}
