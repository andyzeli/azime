import { Suspense } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, FolderPlus, Stethoscope } from "lucide-react";
import { supportedRegions, type AmaMode } from "@azime/contracts";
import NewCaseForm, { caseTypes } from "./NewCaseForm";
import { PatientAvatar } from "./PatientAvatar";
import { casesQueryOptions, createCase } from "../../queries";
import { contactQueryOptions } from "../../../contacts/queries";

const amaBadge: Record<AmaMode, { label: string; className: string }> = {
  rating: { label: "Rating", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  guidance: { label: "Guidance", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  off: { label: "Off", className: "bg-white text-slate-400 ring-slate-200" },
};

const regionLabel = (region: string) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

function CasesHome() {
  const { data: cases } = useSuspenseQuery(casesQueryOptions);
  const { data: contacts } = useSuspenseQuery(contactQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: createCase,
    mutationKey: ["cases", "create"],
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      navigate({ to: "/cases/$caseId", params: { caseId: String(id) } });
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Case intake</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a case, then add its records and referral on the case page.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg bg-white shadow-md">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <div className="grid size-9 place-items-center rounded-md bg-blue-50 text-blue-700">
            <FolderPlus className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">New case</h2>
            <p className="text-sm text-slate-500">Patient, referral source and what the referral asks for.</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <NewCaseForm
            onSubmit={(data) => mutation.mutate(data)}
            contacts={contacts}
            submitting={mutation.isPending}
            error={mutation.isError ? "Failed to create the case. Please try again." : null}
          />
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg bg-white shadow-md">
        <div className="flex items-baseline gap-2 border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">All cases</h2>
          <span className="text-sm text-slate-400">{cases.length}</span>
        </div>
        {cases.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-2.5 font-medium">Patient</th>
                <th className="px-3 py-2.5 font-medium">Date of injury</th>
                <th className="px-3 py-2.5 font-medium">Regions</th>
                <th className="px-3 py-2.5 font-medium">AMA</th>
                <th className="px-6 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((patientCase) => {
                const caseId = String(patientCase.id);
                const ama = amaBadge[patientCase.amaMode];
                return (
                  <tr key={patientCase.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3">
                      <Link
                        to="/cases/$caseId"
                        params={{ caseId }}
                        className="group flex items-center gap-3"
                      >
                        <PatientAvatar
                          firstName={patientCase.patientName}
                          lastName={patientCase.patientLastName}
                          className="size-8 text-xs"
                        />
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-blue-700">
                            {patientCase.patientName} {patientCase.patientLastName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {caseTypes.find(({ value }) => value === patientCase.caseType)?.label ??
                              patientCase.caseType}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {patientCase.dateOfInjury ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {patientCase.regions.length ? (
                        <div className="flex flex-wrap gap-1">
                          {patientCase.regions.map((region) => (
                            <span
                              key={region}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700"
                            >
                              {regionLabel(region)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ama.className}`}
                      >
                        {ama.label}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to="/cases/$caseId"
                          params={{ caseId }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          Case page <ArrowUpRight className="size-3.5" />
                        </Link>
                        <Link
                          to="/p_cases/$caseId"
                          params={{ caseId }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          <Stethoscope className="size-3.5" /> Physician view
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-8 text-center text-sm text-slate-500">No cases yet.</p>
        )}
      </section>
    </div>
  );
}

function CasesComp() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <CasesHome />
    </Suspense>
  );
}
export default CasesComp;
