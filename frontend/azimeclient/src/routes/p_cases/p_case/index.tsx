import {
  createRoute,
  ErrorComponent,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect } from "react";
import { pCasesRoute } from "../p_cases";
import { caseQueryOptions, casesQueryOptions, NotFoundError } from "../queries";

function CaseErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  useEffect(() => {
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  if (error instanceof NotFoundError) {
    return <div className="p-4">{error.message}</div>;
  }

  return (
    <div className="p-4">
      <button onClick={() => router.invalidate()}>Retry</button>
      <ErrorComponent error={error} />
    </div>
  );
}

export const pCasesIndexRoute = createRoute({
  getParentRoute: () => pCasesRoute,
  path: "/",
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(casesQueryOptions),
  errorComponent: CaseErrorComponent,
}).lazy(() => import("../p_cases.lazy").then((d) => d.Route));

export const pCaseRoute = createRoute({
  getParentRoute: () => pCasesRoute,
  path: "$caseId",
  // Shared by Records and, later, record citation drawers on other tabs.
  validateSearch: (search: Record<string, unknown>): { record?: string } => ({
    record: typeof search.record === "string" ? search.record : undefined,
  }),
  loader: ({ context: { queryClient }, params: { caseId } }) =>
    queryClient.ensureQueryData(caseQueryOptions(caseId)),
  errorComponent: CaseErrorComponent,
}).lazy(() => import("./p_case.lazy").then((d) => d.Route));
