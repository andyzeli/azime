import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { mockTimelineQueryOptions } from "../queries";
import { Btn, EventDot } from "./shared";

function useShowRecord() {
  const navigate = useNavigate();
  return (record: string | undefined) =>
    navigate({ to: ".", search: (prev) => ({ ...prev, record }) });
}

// Extraction view for one record. Inline on Records, docked drawer on other tabs.
export function RecordDetail({ recordId, closable }: { recordId: string; closable?: boolean }) {
  const { data: events } = useSuspenseQuery(mockTimelineQueryOptions);
  const showRecord = useShowRecord();
  const index = events.findIndex((event) => event.id === recordId);
  const event = events[index];
  if (!event) return <p className="text-slate-500">Record not found.</p>;
  const prev = events[index - 1];
  const next = events[index + 1];

  return (
    <div>
      <div className="flex items-start gap-3">
        <EventDot kind={event.kind} />
        <div className="flex-1">
          <div className="text-[11px] font-medium text-slate-400">{event.date}</div>
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

      <div className="mt-4 text-[10.5px] font-bold tracking-[.05em] text-slate-500">EXTRACTED FIELDS</div>
      <dl className="mt-2 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-[12.5px]">
        {event.fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <Btn disabled={!prev} onClick={() => showRecord(prev?.id)} className="flex items-center gap-1">
          <ChevronLeft className="size-3.5" /> prev
        </Btn>
        <Btn disabled={!next} onClick={() => showRecord(next?.id)} className="flex items-center gap-1">
          next <ChevronRight className="size-3.5" />
        </Btn>
        <Btn className="flex items-center gap-1">
          Open PDF <ExternalLink className="size-3.5" />
        </Btn>
        <Btn>Raw JSON</Btn>
      </div>
    </div>
  );
}

export function RecordDrawer({ recordId }: { recordId?: string }) {
  if (!recordId) return null;
  return (
    <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-slate-300 bg-white p-4 shadow-[-12px_0_30px_rgba(15,23,42,.08)]">
      <RecordDetail recordId={recordId} closable />
    </aside>
  );
}
