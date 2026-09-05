import { eq } from "drizzle-orm";
import { storedProviderSummariesSchema } from "../ai/providerSummarySchema.js";
import { db } from "../db/index.js";
import { CaseProviderSummaries } from "../db/schema.js";

export const getStoredProviderSummaries = async (caseId: number) => {
  const storedSummary = await db.query.CaseProviderSummaries.findFirst({
    where: eq(CaseProviderSummaries.caseId, caseId),
  });

  if (!storedSummary) {
    return null;
  }

  return {
    ...storedSummary,
    summary: storedProviderSummariesSchema.parse(storedSummary.summary),
  };
};
