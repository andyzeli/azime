import { createRoute } from "@tanstack/react-router";
import { casesRoute } from "../cases";
import {
  ErrorComponent,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { NotFoundError } from "../queries";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import React from "react";
import CasesHome from "./components/CasesHome";
import CaseDetail from "./components/CaseDetail";

function CaseErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();
  if (error instanceof NotFoundError) {
    return <div>{error.message}</div>;
  }
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  React.useEffect(() => {
    queryErrorResetBoundary.reset();
  }, [queryErrorResetBoundary]);

  return (
    <div>
      <button
        onClick={() => {
          router.invalidate();
        }}
      >
        retry
      </button>
      <ErrorComponent error={error} />
    </div>
  );
}

export const casesIndexRoute = createRoute({
  getParentRoute: () => casesRoute,
  path: "/",
  // loader: ({ context: { queryClient } }) =>
  //   queryClient.ensureQueryData(casesQueryOptions),
  component: CasesHome,
});

export const caseRoute = createRoute({
  getParentRoute: () => casesRoute,
  path: "$caseId",
  errorComponent: CaseErrorComponent,
  // loader: ({ context: { queryClient }, params: { caseId } }) =>
  //   queryClient.ensureQueryData(caseQueryOptions(caseId)),
  component: CaseDetail,
});
