import type { QueryClient } from "@tanstack/react-query";
import type { Region } from "@azime/contracts";
import { refinedByRegion, type PreExamSetup, type RefinedSetup } from "./data";
import {
  mockPreExamQueryOptions,
  mockRefinedQueryOptions,
  mockReferralQuestionsQueryOptions,
} from "./queries";

export type ExamPrepStatus =
  | { kind: "needs-steering" }
  | { kind: "not-generated" }
  | { kind: "stale"; reasons: string[] }
  | { kind: "current" };

// Exam prep (3B) is stale when its snapshot no longer matches saved steering or the case's referral questions.
export function examPrepStatus(refined: RefinedSetup, preExam: PreExamSetup, questions: string[]): ExamPrepStatus {
  if (!preExam.analysis || !preExam.steering) return { kind: "needs-steering" };
  if (!refined.snapshot || !refined.analysis) return { kind: "not-generated" };
  const reasons: string[] = [];
  if (refined.snapshot.basedOn.steeringRevision !== preExam.steeringRevision)
    reasons.push(`steering changed, rev ${refined.snapshot.basedOn.steeringRevision} → ${preExam.steeringRevision}`);
  if (refined.snapshot.referralQuestions.join("\n") !== questions.join("\n")) reasons.push("referral questions changed");
  return reasons.length ? { kind: "stale", reasons } : { kind: "current" };
}

const nowLabel = () =>
  new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// Fake of the server flow: snapshot the reviewed analysis + referral questions, then run 3B.
export async function generateExamPrep(queryClient: QueryClient, region: Region) {
  await new Promise((r) => setTimeout(r, 900));
  const preExam = queryClient.getQueryData(mockPreExamQueryOptions(region).queryKey);
  const questions = queryClient.getQueryData(mockReferralQuestionsQueryOptions.queryKey) ?? [];
  queryClient.setQueryData(mockRefinedQueryOptions(region).queryKey, (old) =>
    old && preExam
      ? {
          ...old,
          snapshot: {
            takenAt: nowLabel(),
            referralQuestions: questions,
            basedOn: { summaryDate: "Sep 28", preExamRanAt: preExam.analysisRanAt ?? "", steeringRevision: preExam.steeringRevision },
          },
          analysis: old.analysis ?? refinedByRegion.cervical_spine.analysis,
          generatedAt: nowLabel(),
        }
      : old,
  );
}
