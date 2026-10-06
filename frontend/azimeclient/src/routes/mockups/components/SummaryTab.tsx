import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockupsRoute, mockSummaryRoute } from "..";
import { mockProvidersQueryOptions, mockSummaryQueryOptions } from "../queries";
import TimelineColumn from "./Timeline";
import { RecordDrawer } from "./RecordDetail";
import StatusChart from "./StatusChart";
import { Badge, Btn, CiteText, Segmented } from "./shared";

export default function SummaryTab() {
  const { record } = mockupsRoute.useSearch();
  const { view } = mockSummaryRoute.useSearch();
  const navigate = useNavigate({ from: mockSummaryRoute.fullPath });
  const { data: summary } = useSuspenseQuery(mockSummaryQueryOptions);
  const { data: providers } = useSuspenseQuery(mockProvidersQueryOptions);
  const drawerOpen = Boolean(record);

  return (
    <>
      <TimelineColumn selectedId={record} />
      <main className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4 px-5">
        <div className="flex items-center gap-3">
          <Segmented
            size="md"
            value={view ?? "summary"}
            onChange={(next) =>
              navigate({ search: (prev) => ({ ...prev, view: next === "providers" ? "providers" : undefined }) })
            }
            options={[
              { value: "summary", label: "Case summary" },
              { value: "providers", label: `Providers · ${providers.length}` },
            ]}
          />
          <Badge className="flex items-center gap-1 bg-green-100 text-green-700">
            <Check className="size-3" strokeWidth={3} /> generated {summary.generatedAt} from 42 records
          </Badge>
          <span className="flex-1" />
          <Btn>Regenerate</Btn>
        </div>

        {view === "providers" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[210px_1fr] gap-3.5 bg-slate-50 px-3.5 py-2 text-[11px] font-bold tracking-[.04em] text-slate-500">
              <span>PROVIDER</span>
              <span>SUMMARY</span>
            </div>
            {providers.map((p) => (
              <div key={p.name} className="grid grid-cols-[210px_1fr] gap-3.5 border-t border-slate-100 px-3.5 py-3">
                <div>
                  <b>{p.name}</b>
                  <div className="text-[11px] text-slate-500">
                    {p.specialty} · {p.visits} visit{p.visits === 1 ? "" : "s"}
                    <br />
                    {p.span}
                  </div>
                </div>
                <p className="text-[12.5px] leading-relaxed text-slate-800">
                  <CiteText parts={p.summary} />
                </p>
              </div>
            ))}
          </div>
        ) : (
          // With the drawer open there isn't room for the side column, so stack.
          <div className={cn("grid gap-3.5", drawerOpen ? "grid-cols-1" : "grid-cols-[1fr_280px]")}>
            <div className="flex min-w-0 flex-col gap-3.5">
              <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <h2 className="mb-2 text-[13.5px] font-semibold">Clinical summary</h2>
                <p className="text-[13.5px] leading-relaxed text-slate-800">
                  <CiteText parts={summary.prose} />
                </p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-baseline gap-2.5">
                  <h2 className="text-[13.5px] font-semibold">Status timeline</h2>
                  <span className="text-[11px] text-slate-500">Reported pain (0–10) · work status · treatments</span>
                </div>
                <StatusChart summary={summary} />
              </section>
            </div>
            <section className="self-start rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <h2 className="mb-1.5 text-[13.5px] font-semibold">Consolidated diagnoses</h2>
              {summary.diagnoses.map((dx) => (
                <div key={dx.code} className="flex items-center gap-2 border-t border-slate-100 py-2 text-[12.5px]">
                  <Badge className="rounded bg-blue-50 text-blue-700">{dx.code}</Badge>
                  {dx.label}
                  {dx.note ? <span className="text-[11px] text-slate-500">{dx.note}</span> : null}
                </div>
              ))}
              <h2 className="mb-1.5 mt-4 text-[13.5px] font-semibold">Current status</h2>
              {summary.currentStatus.map(([label, value]) => (
                <div key={label} className="flex border-t border-slate-100 py-2 text-[12.5px]">
                  <span className="w-[90px] text-slate-500">{label}</span>
                  {value}
                </div>
              ))}
            </section>
          </div>
        )}
      </main>
      <RecordDrawer recordId={record} />
    </>
  );
}
