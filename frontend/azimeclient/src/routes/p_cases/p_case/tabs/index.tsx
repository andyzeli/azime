import { createRoute, redirect } from "@tanstack/react-router";
import { supportedRegions, type Region } from "@azime/contracts";
import { pCaseRoute } from "..";
import {
  caseSummaryQueryOptions,
  providerSummariesQueryOptions,
  recordsQueryOptions,
} from "../../../cases/queries";

// Opening a case lands on its first workflow tab.
export const pCaseIndexRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "/",
  beforeLoad: ({ params: { caseId }, search }) => {
    throw redirect({ to: "/p_cases/$caseId/records", params: { caseId }, search });
  },
});

export const pRecordsRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "records",
  loader: ({ context: { queryClient }, params: { caseId } }) =>
    queryClient.ensureQueryData(recordsQueryOptions(caseId)),
}).lazy(() => import("./records.lazy").then((d) => d.Route));

export const pSummaryRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "summary",
  validateSearch: (search: Record<string, unknown>): { view?: "providers" } => ({
    view: search.view === "providers" ? "providers" : undefined,
  }),
  loader: ({ context: { queryClient }, params: { caseId } }) =>
    Promise.all([
      queryClient.ensureQueryData(recordsQueryOptions(caseId)),
      queryClient.ensureQueryData(caseSummaryQueryOptions(caseId)),
      queryClient.ensureQueryData(providerSummariesQueryOptions(caseId)),
    ]),
}).lazy(() => import("./summary.lazy").then((d) => d.Route));

export const pAnalysisRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "analysis",
  validateSearch: (search: Record<string, unknown>): { region?: Region } => ({
    region: supportedRegions.some(({ value }) => value === search.region)
      ? (search.region as Region)
      : undefined,
  }),
  loader: ({ context: { queryClient }, params: { caseId } }) =>
    queryClient.ensureQueryData(recordsQueryOptions(caseId)),
}).lazy(() => import("./analysis.lazy").then((d) => d.Route));

export const pVisitRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "visit",
}).lazy(() => import("./visit.lazy").then((d) => d.Route));

// MMI: the latest post-exam analysis per region and the physician's opinions on it.
export const pMmiRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "mmi",
}).lazy(() => import("./mmi.lazy").then((d) => d.Route));

// Report: combined impairment and the final report (phase 6).
export const pReportRoute = createRoute({
  getParentRoute: () => pCaseRoute,
  path: "report",
}).lazy(() => import("./report.lazy").then((d) => d.Route));
