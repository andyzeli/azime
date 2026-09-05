import { eq } from "drizzle-orm";
import {
  storedRefinedAnalysisSchema,
  type StoredRefinedAnalysis,
} from "../ai/refinedAnalysisSchema.js";
import { db } from "../db/index.js";
import { CaseRefinedAnalysis } from "../db/schema.js";

export const upsertRefinedAnalysis = async (
  caseId: number,
  analysis: StoredRefinedAnalysis,
) => {
  const storedAnalyses = await db
    .insert(CaseRefinedAnalysis)
    .values({ caseId, analysis })
    .onConflictDoUpdate({
      target: CaseRefinedAnalysis.caseId,
      set: { analysis, updatedAt: new Date() },
    })
    .returning({ id: CaseRefinedAnalysis.id });

  return storedAnalyses[0]?.id ?? null;
};

export const getStoredRefinedAnalysis = async (caseId: number) => {
  const storedAnalysis = await db.query.CaseRefinedAnalysis.findFirst({
    where: eq(CaseRefinedAnalysis.caseId, caseId),
  });

  if (!storedAnalysis) {
    return null;
  }

  return {
    ...storedAnalysis,
    analysis: storedRefinedAnalysisSchema.parse(storedAnalysis.analysis),
  };
};
