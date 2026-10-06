import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { mockTimelineQueryOptions } from "../queries";
import { EventDot } from "./shared";

const monthLabel = (isoDate: string) =>
  new Date(isoDate)
    .toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    .toUpperCase();

export default function TimelineColumn({ selectedId }: { selectedId?: string }) {
  const { data: events } = useSuspenseQuery(mockTimelineQueryOptions);

  return (
    <aside className="flex w-[290px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-baseline gap-2 border-b border-slate-200 px-4 py-3">
        <span className="text-[13.5px] font-semibold">Timeline</span>
        <span className="text-[11px] text-slate-500">{events.length} events</span>
        <span className="flex-1" />
        <button type="button" className="text-[11px] text-slate-500 hover:text-slate-800">
          Filter ▾
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-2.5 pb-5 pt-1">
        <div className="absolute bottom-0 left-[25px] top-0 w-0.5 bg-slate-200" />
        {events.map((event, i) => {
          const month = monthLabel(event.sortDate);
          const showMonth = i === 0 || monthLabel(events[i - 1].sortDate) !== month;
          return (
            <Fragment key={event.id}>
              {showMonth ? (
                <div className="relative mb-1 ml-10 mt-3 text-[10px] font-bold tracking-[.07em] text-slate-400">
                  {month}
                </div>
              ) : null}
              <Link
                to="."
                search={(prev) => ({ ...prev, record: event.id })}
                className={cn(
                  "relative flex gap-3 rounded-lg py-1.5 pl-0.5 pr-2 hover:bg-slate-50",
                  event.id === selectedId && "bg-blue-50 outline outline-[1.5px] outline-blue-200 hover:bg-blue-50",
                )}
              >
                <EventDot kind={event.kind} />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-400">{event.date}</div>
                  <div className="text-[13px] font-semibold text-slate-900">{event.name}</div>
                  <div className="text-[11.5px] leading-snug text-slate-500">{event.detail}</div>
                </div>
              </Link>
            </Fragment>
          );
        })}
      </div>
    </aside>
  );
}
