import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  useLocation,
} from "@tanstack/react-router";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

import "./index.css";
import { casesRoute } from "./routes/cases/cases";
import { fetchMessage } from "./routes/cases/queries";
import { caseRoute, casesIndexRoute } from "./routes/cases/case";
import {
  layoutARoute,
  layoutBRoute,
  billingRoute,
  billingIndexRoute,
} from "./routes/billing";
import { aptRoute, calistRoute, calRoute, listRoute } from "./routes/apts";
import { contactsRoute } from "./routes/contacts";
import PatientQuestionnairePatientPage from "./routes/patient/PatientQuestionnairePatientPage";

export const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <p>This is the notFoundComponent configured on root route</p>
        <Link to="/">Start Overf</Link>
      </div>
    );
  },
});

function RootComponent() {
  const location = useLocation();
  const isPatientQuestionnaire = location.pathname.startsWith(
    "/patient/questionnaires/",
  );

  return (
    <>
      {!isPatientQuestionnaire ? (
        <>
          <div className="p-2 flex gap-4 text-lg">
            <Link
              to="/cal"
              activeProps={{
                className: "font-bold",
              }}
              activeOptions={{ exact: false }}
            >
              Dashboard
            </Link>{" "}
            <Link
              to="/cases"
              activeProps={{
                className: "font-bold",
              }}
            >
              Patient Cases
            </Link>{" "}
            <Link
              to="/billing"
              activeProps={{
                className: "font-bold",
              }}
            >
              Billing
            </Link>{" "}
            <Link
              to="/contacts"
              activeProps={{
                className: "font-bold",
              }}
            >
              Contacts
            </Link>{" "}
            <Link
              // @ts-expect-error
              to="/this-route-does-not-exist"
              activeProps={{
                className: "font-bold",
              }}
            >
              This Route Does Not Exist
            </Link>
          </div>
          <hr />
        </>
      ) : null}
      <Outlet />
      {/* <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" /> */}
    </>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRouteComponent,
});

export const patientQuestionnaireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "patient/questionnaires/$accessToken",
  component: PatientQuestionnairePatientPage,
});

function IndexRouteComponent() {
  const mq = useQuery({
    queryKey: ["foo"],
    queryFn: () => fetchMessage(),
  });
  const m = mq.data;
  console.log(m);
  if (!m) return <>loading</>;
  return (
    <div className="p-2">
      <h3>Welcome Home! {m.message} </h3>
      <Outlet />
    </div>
  );
}

const routeTree = rootRoute.addChildren([
  casesRoute.addChildren([caseRoute, casesIndexRoute]),
  billingRoute.addChildren([billingIndexRoute, layoutARoute, layoutBRoute]),
  contactsRoute,
  patientQuestionnaireRoute,
  indexRoute.addChildren([
    aptRoute.addChildren([calistRoute.addChildren([calRoute, listRoute])]),
  ]),
]);

const queryClient = new QueryClient();

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
  context: {
    queryClient,
  },
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
