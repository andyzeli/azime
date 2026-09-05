import { eq } from "drizzle-orm";
import { storedPreExamAnalysisSchema } from "../ai/preExamAnalysisSchema.js";
import type { StoredPreExamAnalysis } from "../ai/preExamAnalysisSchema.js";
import { db } from "../db/index.js";
import { CasePreExamAnalysis } from "../db/schema.js";

export const upsertPreExamAnalysis = async (
  caseId: number,
  analysis: StoredPreExamAnalysis,
) => {
  const storedAnalyses = await db
    .insert(CasePreExamAnalysis)
    .values({ caseId, analysis })
    .onConflictDoUpdate({
      target: CasePreExamAnalysis.caseId,
      set: { analysis, updatedAt: new Date() },
    })
    .returning({ id: CasePreExamAnalysis.id });

  return storedAnalyses[0]?.id ?? null;
};

export const getStoredPreExamAnalysis = async (caseId: number) => {
  const storedAnalysis = await db.query.CasePreExamAnalysis.findFirst({
    where: eq(CasePreExamAnalysis.caseId, caseId),
  });

  if (!storedAnalysis) {
    return null;
  }

  return {
    ...storedAnalysis,
    analysis: storedPreExamAnalysisSchema.parse(storedAnalysis.analysis),
  };
};
