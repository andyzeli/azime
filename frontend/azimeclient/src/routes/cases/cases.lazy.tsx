import { Link, Outlet, createLazyRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { casesQueryOptions } from "./queries";
import { useState } from "react";

function CasesComponent() {
  const { data: cases } = useSuspenseQuery(casesQueryOptions);
  const [isNavOpen, setIsNavOpen] = useState(false);

  if (!cases) return null; // Safe guard against undefined data

  return (
    <div className="p-2 flex gap-2">
      {/* Side Nav */}
      <div
        className={`transition-all duration-300 ease-in-out ${isNavOpen ? "w-1/4" : "w-12"}`}
      >
        <div className="flex items-center justify-between mb-4">
          {isNavOpen && <h2 className="font-semibold">Cases</h2>}
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isNavOpen ? "rotate-0" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        <ul
          className={`list-disc pl-4 ${isNavOpen ? "opacity-100" : "opacity-0 hidden"}`}
        >
          <Link
            to="/cases"
            className="block py-1 px-2 text-blue-600 hover:opacity-75"
            activeProps={{ className: "font-bold underline" }}
          >
            Main
          </Link>
          {cases.map((caseItem) => (
            <li key={caseItem.id} className="whitespace-nowrap">
              <Link
                to="/cases/$caseId"
                params={{
                  caseId: caseItem.id.toString(),
                }}
                className="block py-1 px-2 text-blue-600 hover:opacity-75"
                activeProps={{ className: "font-bold underline" }}
              >
                <div>
                  {caseItem.patientName + " " + caseItem.patientLastName}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${isNavOpen ? "w-3/4" : "flex-1"}`}
      >
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createLazyRoute("/cases")({
  component: CasesComponent,
});
