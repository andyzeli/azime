import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import NewCaseForm from "./NewCaseForm";
import { casesQueryOptions, createCase } from "../../queries";
import { contactQueryOptions } from "../../../contacts/queries";
import { NewPatientCase } from "./NewCaseForm";
import { Suspense } from "react";

function CasesHome() {
  const casesQuery = useSuspenseQuery(casesQueryOptions);
  const contactsQuery = useSuspenseQuery(contactQueryOptions);
  const queryClient = useQueryClient();

  const stats = {
    total: casesQuery.data?.length,
    completed: casesQuery.data?.filter((c) => c.caseStatus === "comp").length,
    inProgress: casesQuery.data?.filter((c) => c.caseStatus === "inprog")
      .length,
  };
  const contacts = contactsQuery.data;
  if (!contacts) {
    return <div>Need to add contacts!</div>;
  }

  const mutation = useMutation({
    mutationFn: createCase,
    mutationKey: ["cases", "create"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: (error: any) => {
      console.error(error);
    },
  });
  const handleSubmit = (data: NewPatientCase) => {
    mutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cases</h1>
        <div className="h-1 w-20 bg-blue-600 mx-auto"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Total Cases
          </h3>
          <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Completed</h3>
          <p className="text-4xl font-bold text-green-600">{stats.completed}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            In Progress
          </h3>
          <p className="text-4xl font-bold text-amber-600">
            {stats.inProgress}
          </p>
        </div>
      </div>

      {/* New Case Section */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Create New Case
        </h2>
        <NewCaseForm onSubmit={handleSubmit} contacts={contacts} />
      </div>
    </div>
  );
}

function CasesComp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CasesHome />
    </Suspense>
  );
}
export default CasesComp;
