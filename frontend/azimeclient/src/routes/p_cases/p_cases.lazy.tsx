import { Link, createLazyRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { casesQueryOptions } from "./queries";

function ProviderCasesHome() {
  const { data: cases } = useSuspenseQuery(casesQueryOptions);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Physician Workspace</h1>
      <p className="mt-2 text-slate-600">
        Select a case to open the provider cockpit.
      </p>
      {cases.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-slate-600">
          No cases available.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {cases.map((caseItem) => (
            <li key={caseItem.id}>
              <Link
                to="/p_cases/$caseId"
                params={{ caseId: caseItem.id.toString() }}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 hover:border-blue-400 hover:bg-blue-50"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {[caseItem.patientName, caseItem.patientLastName]
                      .filter(Boolean)
                      .join(" ") || "Unnamed patient"}
                  </div>
                  <div className="text-sm text-slate-500">Case #{caseItem.id}</div>
                </div>
                <span className="text-sm font-medium text-blue-600">Open cockpit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export const Route = createLazyRoute("/p_cases/")({
  component: ProviderCasesHome,
});
