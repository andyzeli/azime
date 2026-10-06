import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createTestRecord, fetchTestRecordFixtures } from "../../queries";

const inputClassName =
  "w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

export const TestRecordUploader = ({ caseId }: { caseId: number }) => {
  const [fixtureId, setFixtureId] = useState("");
  const queryClient = useQueryClient();
  const fixturesQuery = useQuery({
    queryKey: ["test-record-fixtures"],
    queryFn: fetchTestRecordFixtures,
    staleTime: Infinity,
  });
  const createMutation = useMutation({
    mutationFn: createTestRecord,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["records", { caseId: String(caseId) }],
        }),
        queryClient.invalidateQueries({
          queryKey: ["caseProviders", { caseId }],
        }),
      ]);
    },
  });

  const selectedFixture = fixturesQuery.data?.find(
    (fixture) => fixture.id === fixtureId,
  );

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2">
        <p className="text-sm font-semibold text-amber-900">Test data</p>
        <p className="text-xs text-amber-800">
          Adds a fake record with a completed JSON extraction; no PDF or AI call
          is required.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={fixtureId}
          onChange={(event) => setFixtureId(event.target.value)}
          disabled={fixturesQuery.isPending || createMutation.isPending}
          className={`${inputClassName} flex-1`}
        >
          <option value="">
            {fixturesQuery.isPending
              ? "Loading test records..."
              : "Choose a test record"}
          </option>
          {fixturesQuery.data?.map((fixture) => (
            <option key={fixture.id} value={fixture.id}>
              {fixture.label} · {fixture.eventDate}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!fixtureId || createMutation.isPending}
          onClick={() => createMutation.mutate({ caseId, fixtureId })}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:bg-amber-300"
        >
          {createMutation.isPending ? "Adding..." : "Add test record"}
        </button>
      </div>
      {selectedFixture ? (
        <p className="mt-2 text-xs text-amber-900">
          {selectedFixture.description}
        </p>
      ) : null}
      {fixturesQuery.isError || createMutation.isError ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          Test data could not be loaded. Confirm the backend is running in
          development mode.
        </p>
      ) : null}
    </div>
  );
};
