import { Link, Outlet, createLazyRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { casesQueryOptions } from "./queries";
import { caseTypes } from "./case/components/NewCaseForm";
import { PatientAvatar } from "./case/components/PatientAvatar";

function CasesComponent() {
  const { data: cases } = useSuspenseQuery(casesQueryOptions);
  const [isNavOpen, setIsNavOpen] = useState(true);

  return (
    <div className="flex">
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 self-start overflow-y-auto border-r border-slate-200 bg-white transition-[width] duration-200",
          isNavOpen ? "w-64" : "w-14"
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-slate-100 px-3 py-3",
            isNavOpen ? "justify-between" : "justify-center"
          )}
        >
          {isNavOpen ? (
            <h2 className="flex items-baseline gap-1.5 pl-1 text-sm font-semibold text-slate-900">
              Cases <span className="text-xs font-normal text-slate-400">{cases.length}</span>
            </h2>
          ) : null}
          <button
            type="button"
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={isNavOpen ? "Collapse case list" : "Expand case list"}
          >
            {isNavOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>

        <nav className="space-y-0.5 p-2">
          <Link
            to="/cases"
            activeOptions={{ exact: true }}
            title="New case"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50",
              !isNavOpen && "justify-center"
            )}
            activeProps={{ className: "bg-blue-50" }}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-blue-300">
              <Plus className="size-3.5" />
            </span>
            {isNavOpen ? "New case" : null}
          </Link>

          {cases.map((caseItem) => {
            const name = [caseItem.patientName, caseItem.patientLastName].filter(Boolean).join(" ");
            return (
              <Link
                key={caseItem.id}
                to="/cases/$caseId"
                params={{ caseId: caseItem.id.toString() }}
                title={name}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50",
                  !isNavOpen && "justify-center"
                )}
                activeProps={{ className: "bg-blue-50 ring-1 ring-inset ring-blue-200 hover:bg-blue-50" }}
              >
                <PatientAvatar
                  firstName={caseItem.patientName}
                  lastName={caseItem.patientLastName}
                  className="size-7 text-[11px]"
                />
                {isNavOpen ? (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {name || "Unnamed patient"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {[
                        caseTypes.find(({ value }) => value === caseItem.caseType)?.label,
                        caseItem.dateOfInjury,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createLazyRoute("/cases")({
  component: CasesComponent,
});
