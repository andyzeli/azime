import { createRoute, redirect } from "@tanstack/react-router";
import { regionSchema, type Region } from "@azime/contracts";
import { rootRoute } from "../../main";
import {
  mockCaseQueryOptions,
  mockPreExamQueryOptions,
  mockRefinedQueryOptions,
  mockReferralQuestionsQueryOptions,
  mockPostExamQueryOptions,
  mockQuestionnairesQueryOptions,
  mockVisitQueryOptions,
  mockProvidersQueryOptions,
  mockSummaryQueryOptions,
  mockTimelineQueryOptions,
} from "./queries";
import CockpitShell from "./components/CockpitShell";
import RecordsTab from "./components/RecordsTab";
import SummaryTab from "./components/SummaryTab";
import PreExamTab from "./components/PreExamTab";
import RefinedTab from "./components/RefinedTab";
import VisitTab from "./components/VisitTab";

// `record` lives on the layout so any tab can open the record drawer via the URL.
export const mockupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mockups",
  validateSearch: (search: Record<string, unknown>): { record?: string } => ({
    record: typeof search.record === "string" ? search.record : undefined,
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(mockCaseQueryOptions),
      queryClient.ensureQueryData(mockTimelineQueryOptions),
    ]),
  component: CockpitShell,
});

export const mockupsIndexRoute = createRoute({
  getParentRoute: () => mockupsRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/mockups/records" });
  },
});

export const mockRecordsRoute = createRoute({
  getParentRoute: () => mockupsRoute,
  path: "records",
  component: RecordsTab,
});

export const mockSummaryRoute = createRoute({
  getParentRoute: () => mockupsRoute,
  path: "summary",
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: "providers" } => ({
    view: search.view === "providers" ? "providers" : undefined,
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(mockSummaryQueryOptions),
      queryClient.ensureQueryData(mockProvidersQueryOptions),
    ]),
  component: SummaryTab,
});

export const mockPreExamRoute = createRoute({
  getParentRoute: () => mockupsRoute,
  path: "analysis",
  validateSearch: (search: Record<string, unknown>): { region?: Region } => {
    const parsed = regionSchema.safeParse(search.region);
    return { region: parsed.success ? parsed.data : undefined };
  },
  loaderDeps: ({ search: { region } }) => ({ region }),
  loader: async ({ context: { queryClient }, deps }) => {
    const mockCase = await queryClient.ensureQueryData(mockCaseQueryOptions);
    const region = deps.region ?? mockCase.regions[0];
    await Promise.all([
      queryClient.ensureQueryData(mockPreExamQueryOptions(region)),
      // For the footer's exam-prep status.
      queryClient.ensureQueryData(mockRefinedQueryOptions(region)),
      queryClient.ensureQueryData(mockReferralQuestionsQueryOptions),
    ]);
  },
  component: PreExamTab,
});

// Exam prep is case-level: every region is shown at once, so load all of them.
export const mockRefinedRoute = createRoute({
  getParentRoute: () => mockupsRoute,
  path: "exam-prep",
  loader: async ({ context: { queryClient } }) => {
    const mockCase = await queryClient.ensureQueryData(mockCaseQueryOptions);
    await Promise.all([
      queryClient.ensureQueryData(mockReferralQuestionsQueryOptions),
      ...mockCase.regions.flatMap((region) => [
        queryClient.ensureQueryData(mockRefinedQueryOptions(region)),
        // Saved steering revision tells whether a region's exam prep is stale.
        queryClient.ensureQueryData(mockPreExamQueryOptions(region)),
      ]),
    ]);
  },
  component: RefinedTab,
});

// One visit per case. Priorities come from every region's exam prep;
// post-exam analysis still runs per region from the shared visit.
export const mockVisitRoute = createRoute({
  getParentRoute: () => mockupsRoute,
  path: "visit",
  loader: async ({ context: { queryClient } }) => {
    const mockCase = await queryClient.ensureQueryData(mockCaseQueryOptions);
    await Promise.all([
      queryClient.ensureQueryData(mockVisitQueryOptions),
      queryClient.ensureQueryData(mockQuestionnairesQueryOptions),
      ...mockCase.regions.flatMap((region) => [
        queryClient.ensureQueryData(mockRefinedQueryOptions(region)),
        queryClient.ensureQueryData(mockPostExamQueryOptions(region)),
      ]),
    ]);
  },
  component: VisitTab,
});
