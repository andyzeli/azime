import { useQuery } from "@tanstack/react-query";
import { caseQueryOptions } from "../../../queries";

export default function CaseHeader({ caseId }: { caseId: string }) {
  const caseQuery = useQuery(caseQueryOptions(caseId));

  if (caseQuery.isPending) {
    return (
      <header className="rounded-lg bg-white p-6 text-sm text-slate-500 shadow-md">
        Loading case…
      </header>
    );
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <header className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-md">
        Failed to load case details.
      </header>
    );
  }

  const caseData = caseQuery.data;

  return (
    <header className="rounded-lg bg-white p-6 shadow-md">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Provider cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            {caseData.patientName} {caseData.patientLastName}
          </h1>
          <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {caseData.caseType}
          </span>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 md:w-72">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Contact person
          </h2>
          <div className="mt-2 space-y-1 text-gray-700">
            <p>{caseData.caseContact?.name}</p>
            <p className="break-all text-sm text-gray-600">
              {caseData.caseContact?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
