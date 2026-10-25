import { and, eq, sql } from "drizzle-orm";
import {
  physicianSteeringSchema,
  steeringMatchesAnalysis,
  storedPreExamAnalysisSchema,
  type Region,
  type StoredPreExamAnalysis,
} from "@azime/contracts";
import type {
  PreExamAnalysisInput,
  PreExamInputSnapshot,
} from "../ai/preExamInputSnapshot.js";
import { db } from "../db/index.js";
import { CasePhysicianSteering, CasePreExamAnalysis } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

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

// Saves an added-diagnosis merge. Steering for the run being extended moves to the updated
// run unchanged (its revision bumps so open drafts reload); new assessments start unreviewed.
export const applyPreExamDelta = async (
  caseId: number,
  region: Region,
  expectedUpdatedAt: Date,
  analysis: StoredPreExamAnalysis,
  inputSnapshot: PreExamInputSnapshot,
  // Rows whose exhaustion was reassessed: the physician's exhaustion review is cleared.
  reassessed: string[],
) =>
  db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(CasePreExamAnalysis)
      .where(
        and(
          eq(CasePreExamAnalysis.caseId, caseId),
          eq(CasePreExamAnalysis.region, region),
        ),
      )
      .for("update");
    if (current?.updatedAt.getTime() !== expectedUpdatedAt.getTime())
      throw new MissingPrerequisiteError(
        "The analysis changed while this diagnosis was being analyzed. Try again",
      );

    const [updated] = await tx
      .update(CasePreExamAnalysis)
      .set({ analysis, inputSnapshot, updatedAt: new Date() })
      .where(eq(CasePreExamAnalysis.id, current.id))
      .returning();

    const steeringRow = await tx.query.CasePhysicianSteering.findFirst({
      where: and(
        eq(CasePhysicianSteering.caseId, caseId),
        eq(CasePhysicianSteering.region, region),
      ),
    });
    const steering = physicianSteeringSchema.safeParse(steeringRow?.steering);
    if (
      steeringRow &&
      steering.success &&
      steeringMatchesAnalysis(steering.data, {
        id: current.id,
        updatedAt: current.updatedAt.toISOString(),
      })
    )
      await tx
        .update(CasePhysicianSteering)
        .set({
          steering: {
            ...steering.data,
            preExamAnalysisUpdatedAt: updated!.updatedAt.toISOString(),
            treatments: Object.fromEntries(
              Object.entries(steering.data.treatments).map(([id, review]) => [
                id,
                reassessed.includes(id)
                  ? { ...review, exhaustion: undefined }
                  : review,
              ]),
            ),
          },
          revision: sql`${CasePhysicianSteering.revision} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(CasePhysicianSteering.id, steeringRow.id));

    return updated!.id;
  });
