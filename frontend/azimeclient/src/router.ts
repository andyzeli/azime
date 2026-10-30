import { createRoute, createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { rootRoute, indexRoute } from "./routes/rootRoutes";
import { casesRoute } from "./routes/cases/cases";
import { pCasesRoute } from "./routes/p_cases/p_cases";
import { caseRoute, casesIndexRoute } from "./routes/cases/case";
import { pCasesIndexRoute, pCaseRoute } from "./routes/p_cases/p_case";
import {
  pCaseIndexRoute,
  pRecordsRoute,
  pSummaryRoute,
  pAnalysisRoute,
  pMmiRoute,
  pReportRoute,
  pVisitRoute,
} from "./routes/p_cases/p_case/tabs";
import {
  layoutARoute,
  layoutBRoute,
  billingRoute,
  billingIndexRoute,
} from "./routes/billing";
import { aptRoute, calistRoute, calRoute, listRoute } from "./routes/apts";
import { contactsRoute } from "./routes/contacts";
import PatientQuestionnairePatientPage from "./routes/patient/PatientQuestionnairePatientPage";
import TabletHome from "./routes/tablet/TabletHome";

const patientQuestionnaireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "patient/questionnaires/$accessToken",
  component: PatientQuestionnairePatientPage,
});

const tabletRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tablet",
  component: TabletHome,
});

const routeTree = rootRoute.addChildren([
  casesRoute.addChildren([caseRoute, casesIndexRoute]),
  pCasesRoute.addChildren([
    pCasesIndexRoute,
    pCaseRoute.addChildren([
      pCaseIndexRoute,
      pRecordsRoute,
      pSummaryRoute,
      pAnalysisRoute,
      pVisitRoute,
      pMmiRoute,
      pReportRoute,
    ]),
  ]),
  billingRoute.addChildren([billingIndexRoute, layoutARoute, layoutBRoute]),
  contactsRoute,
  patientQuestionnaireRoute,
  tabletRoute,
  indexRoute,
  aptRoute.addChildren([calistRoute.addChildren([calRoute, listRoute])]),
]);

export const queryClient = new QueryClient();

// Set up a Router instance
export const router = createRouter({
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

