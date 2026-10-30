import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { tabletQuestionnairesQueryOptions } from "./queries";

// Landing page for the office iPad account. Staff create a questionnaire on the
// case, then hand the iPad over with this list open.
export default function TabletHome() {
  const query = useQuery(tabletQuestionnairesQueryOptions);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold text-slate-900">
          Patient questionnaires
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Tap your name to begin.
        </p>

        <div className="mt-6 space-y-3">
          {query.isLoading ? (
            <p className="text-slate-600">Loading...</p>
          ) : query.data?.length ? (
            query.data.map((questionnaire) => (
              <Link
                key={questionnaire.accessToken}
                to="/patient/questionnaires/$accessToken"
                params={{ accessToken: questionnaire.accessToken }}
                className="block rounded-lg bg-white p-5 shadow-sm hover:bg-blue-50"
              >
                <p className="text-xl font-semibold text-slate-900">
                  {questionnaire.patientLabel || "Patient"}
                </p>
                <p className="mt-1 text-slate-600">{questionnaire.title}</p>
              </Link>
            ))
          ) : (
            <p className="rounded-lg bg-white p-5 text-slate-600 shadow-sm">
              No questionnaires waiting. Please ask a staff member.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
