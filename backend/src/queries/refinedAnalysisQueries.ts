import { and, eq } from "drizzle-orm";
import {
  refinedAnalysisInputSnapshotSchema,
  refinedAnalysisResponseSchema,
  storedRefinedAnalysisSchema,
  type RefinedAnalysisInputSnapshot,
  type RefinedAnalysisResponse,
  type Region,
  type StoredRefinedAnalysis,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseRefinedPreExamAnalysis } from "../db/schema.js";

const toResponse = (
  stored: CaseRefinedPreExamAnalysis
): RefinedAnalysisResponse =>
  refinedAnalysisResponseSchema.parse({
    ...stored,
    createdAt: stored.createdAt.toISOString(),
    updatedAt: stored.updatedAt.toISOString(),
  });

export async function getStoredRefinedAnalysis(
  caseId: number,
  region: Region
): Promise<RefinedAnalysisResponse | null> {
  const stored = await db.query.CaseRefinedPreExamAnalysis.findFirst({
    where: and(
      eq(CaseRefinedPreExamAnalysis.caseId, caseId),
      eq(CaseRefinedPreExamAnalysis.region, region)
    ),
  });
  return stored ? toResponse(stored) : null;
}

// Called only after a successful run, so a failed run keeps the previous exam prep.
export async function upsertRefinedAnalysis(
  caseId: number,
  region: Region,
  inputSnapshot: RefinedAnalysisInputSnapshot,
  analysis: StoredRefinedAnalysis
): Promise<RefinedAnalysisResponse> {
  const snapshot = refinedAnalysisInputSnapshotSchema.parse(inputSnapshot);
  if (snapshot.input.scope.region !== region) {
    throw new Error(
      "Refined analysis snapshot region does not match its storage region"
    );
  }
  const values = {
    inputSnapshot: snapshot,
    analysis: storedRefinedAnalysisSchema.parse(analysis),
  };
  const [stored] = await db
    .insert(CaseRefinedPreExamAnalysis)
    .values({ caseId, region, ...values })
    .onConflictDoUpdate({
      target: [
        CaseRefinedPreExamAnalysis.caseId,
        CaseRefinedPreExamAnalysis.region,
      ],
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  if (!stored) throw new Error("Failed to store refined analysis");
  return toResponse(stored);
}
