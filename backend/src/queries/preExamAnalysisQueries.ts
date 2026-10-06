import { and, eq } from "drizzle-orm";
import {
  storedPreExamAnalysisSchema,
  type Region,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import type {
  PreExamAnalysisInput,
  PreExamInputSnapshot,
} from "../ai/preExamInputSnapshot.js";
import { db } from "../db/index.js";
import { CasePreExamAnalysis } from "../db/schema.js";

export const upsertPreExamAnalysis = async (
  caseId: number,
  region: Region,
  analysis: StoredPreExamAnalysis,
) => {
  const storedAnalyses = await db
    .insert(CasePreExamAnalysis)
    .values({ caseId, region, analysis })
    .onConflictDoUpdate({
      target: [CasePreExamAnalysis.caseId, CasePreExamAnalysis.region],
      set: { analysis, updatedAt: new Date() },
    })
    .returning({ id: CasePreExamAnalysis.id });

  return storedAnalyses[0]?.id ?? null;
};

export const upsertPreExamSnapshot = async (
  caseId: number,
  region: Region,
  inputSnapshot: PreExamInputSnapshot,
) => {
  const storedSnapshots = await db
    .insert(CasePreExamAnalysis)
    .values({ caseId, region, inputSnapshot, analysis: null })
    .onConflictDoUpdate({
      target: [CasePreExamAnalysis.caseId, CasePreExamAnalysis.region],
      set: { inputSnapshot, analysis: null, updatedAt: new Date() },
    })
    .returning({ id: CasePreExamAnalysis.id });

  return storedSnapshots[0]?.id ?? null;
};

export const getPreExamSnapshot = async (
  caseId: number,
  region: Region,
): Promise<PreExamAnalysisInput | null> => {
  const inputSnapshot = await getStoredPreExamSnapshot(caseId, region);

  if (!inputSnapshot) {
    return null;
  }
  //removing sources...
  return {
    ...inputSnapshot,
    ladder: inputSnapshot.ladder.map(
      ({
        id,
        region,
        canonicalDx,
        treatmentId,
        treatment,
        category,
        aliases,
        applicability,
        adequacy,
      }) => ({
        id,
        region,
        canonicalDx,
        treatmentId,
        treatment,
        category,
        aliases,
        applicability,
        adequacy,
      }),
    ),
  };
};

export const getStoredPreExamSnapshot = async (
  caseId: number,
  region: Region,
): Promise<PreExamInputSnapshot | null> => {
  const storedSnapshot = await db.query.CasePreExamAnalysis.findFirst({
    columns: { inputSnapshot: true },
    where: and(
      eq(CasePreExamAnalysis.caseId, caseId),
      eq(CasePreExamAnalysis.region, region),
    ),
  });

  if (!storedSnapshot?.inputSnapshot) {
    return null;
  }

  return storedSnapshot.inputSnapshot;
};

export const getStoredPreExamAnalysis = async (
  caseId: number,
  region: Region,
) => {
  const storedAnalysis = await db.query.CasePreExamAnalysis.findFirst({
    where: and(
      eq(CasePreExamAnalysis.caseId, caseId),
      eq(CasePreExamAnalysis.region, region),
    ),
  });

  if (!storedAnalysis) {
    return null;
  }

  return {
    ...storedAnalysis,
    analysis:
      storedAnalysis.analysis === null
        ? null
        : storedPreExamAnalysisSchema.parse(storedAnalysis.analysis),
  };
};
