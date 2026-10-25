import { and, eq, sql } from "drizzle-orm";
import {
  initializePhysicianSteering,
  physicianSteeringResponseSchema,
  physicianSteeringSchema,
  steeringMatchesAnalysis,
  type PhysicianSteeringResponse,
  type SavePhysicianSteeringRequest,
  type Region,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CasePhysicianSteering, CasePreExamAnalysis } from "../db/schema.js";
import { getStoredPreExamAnalysis } from "./preExamAnalysisQueries.js";
import {
  PhysicianSteeringError,
  validatePhysicianSteeringReferences,
} from "../ai/physicianSteeringSchema.js";

export const getPhysicianSteering = async (
  caseId: number,
  region: Region,
): Promise<PhysicianSteeringResponse | null> => {
  const analysis = await getStoredPreExamAnalysis(caseId, region);
  if (!analysis?.analysis) return null;

  const storedSteering = await db.query.CasePhysicianSteering.findFirst({
    where: and(
      eq(CasePhysicianSteering.caseId, caseId),
      eq(CasePhysicianSteering.region, region),
    ),
  });

  const identity = {
    id: analysis.id,
    updatedAt: analysis.updatedAt.toISOString(),
  };
  const parsed = physicianSteeringSchema.safeParse(storedSteering?.steering);
  if (
    storedSteering &&
    parsed.success &&
    steeringMatchesAnalysis(parsed.data, identity)
  ) {
    return physicianSteeringResponseSchema.parse({
      ...storedSteering,
      steering: parsed.data,
      createdAt: storedSteering.createdAt.toISOString(),
      updatedAt: storedSteering.updatedAt.toISOString(),
    });
  }

  // Initialization is read-only. Save only when the physician makes a decision.
  // A replacement 3A gets a fresh draft, even though the regional row ID is reused.
  return {
    id: null,
    caseId,
    region,
    steering: initializePhysicianSteering(identity),
    revision: 0,
    createdAt: null,
    updatedAt: null,
  };
};

export const upsertPhysicianSteering = async (
  caseId: number,
  region: Region,
  { steering, expectedRevision }: SavePhysicianSteeringRequest,
): Promise<PhysicianSteeringResponse> =>
  db.transaction(async (tx) => {
    // Serialize saves with 3A replacement and other steering saves for this region.
    const [analysis] = await tx
      .select()
      .from(CasePreExamAnalysis)
      .where(
        and(
          eq(CasePreExamAnalysis.caseId, caseId),
          eq(CasePreExamAnalysis.region, region),
        ),
      )
      .for("update");

    if (!analysis?.analysis || !analysis.inputSnapshot) {
      throw new PhysicianSteeringError(
        "Run the treatment analysis before saving the review",
        409,
      );
    }
    const identity = {
      id: analysis.id,
      updatedAt: analysis.updatedAt.toISOString(),
    };
    if (!steeringMatchesAnalysis(steering, identity)) {
      throw new PhysicianSteeringError(
        "The treatment analysis changed. Reload before saving the review",
        409,
      );
    }

    const existing = await tx.query.CasePhysicianSteering.findFirst({
      where: and(
        eq(CasePhysicianSteering.caseId, caseId),
        eq(CasePhysicianSteering.region, region),
      ),
    });
    const parsed = physicianSteeringSchema.safeParse(existing?.steering);
    const currentRevision =
      existing &&
      parsed.success &&
      steeringMatchesAnalysis(parsed.data, identity)
        ? existing.revision
        : 0;
    if (expectedRevision !== currentRevision) {
      throw new PhysicianSteeringError(
        "The review was changed elsewhere. Reload before saving",
        409,
      );
    }
    validatePhysicianSteeringReferences(
      steering,
      analysis.analysis,
      analysis.inputSnapshot,
    );

    const storedSteering = await tx
      .insert(CasePhysicianSteering)
      .values({ caseId, region, steering })
      .onConflictDoUpdate({
        target: [CasePhysicianSteering.caseId, CasePhysicianSteering.region],
        set: {
          steering,
          revision: sql`${CasePhysicianSteering.revision} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    const result = storedSteering[0];

    if (!result) {
      throw new Error("Failed to store physician steering");
    }

    return physicianSteeringResponseSchema.parse({
      ...result,
      steering: physicianSteeringSchema.parse(result.steering),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });
  });
