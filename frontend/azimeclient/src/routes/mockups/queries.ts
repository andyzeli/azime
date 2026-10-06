import { queryOptions } from "@tanstack/react-query";
import {
  caseSummary,
  mockCase,
  preExamByRegion,
  providerSummaries,
  refinedByRegion,
  referralQuestions,
  timeline,
  noteCoverage,
  postExamByRegion,
  questionnaires,
  visitDocument,
} from "./data";

// Fake latency so loading states and route preloading behave like the real app.
const fake = <T>(value: T, ms = 250) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export const mockCaseQueryOptions = queryOptions({
  queryKey: ["mockups", "case"],
  queryFn: () => fake(mockCase),
});

export const mockTimelineQueryOptions = queryOptions({
  queryKey: ["mockups", "timeline"],
  queryFn: () => fake(timeline),
});

export const mockSummaryQueryOptions = queryOptions({
  queryKey: ["mockups", "summary"],
  queryFn: () => fake(caseSummary),
});

export const mockProvidersQueryOptions = queryOptions({
  queryKey: ["mockups", "providers"],
  queryFn: () => fake(providerSummaries),
});

export const mockPreExamQueryOptions = (region: string) =>
  queryOptions({
    queryKey: ["mockups", "pre-exam", region],
    queryFn: () => fake(preExamByRegion[region]),
  });

export const mockRefinedQueryOptions = (region: string) =>
  queryOptions({
    queryKey: ["mockups", "refined", region],
    queryFn: () => fake(refinedByRegion[region]),
  });

export const mockReferralQuestionsQueryOptions = queryOptions({
  queryKey: ["mockups", "referral-questions"],
  queryFn: () => fake(referralQuestions),
});

export const mockVisitQueryOptions = queryOptions({
  queryKey: ["mockups", "visit"],
  queryFn: () => fake(visitDocument),
});

export const mockQuestionnairesQueryOptions = queryOptions({
  queryKey: ["mockups", "questionnaires"],
  queryFn: () => fake(questionnaires),
});

export const mockPostExamQueryOptions = (region: string) =>
  queryOptions({
    queryKey: ["mockups", "post-exam", region],
    queryFn: () => fake(postExamByRegion[region]),
  });

// Optional cheap pass: which visit priorities does the note already address?
export const checkNoteCoverage = () => fake(noteCoverage, 1200);
