import { eq, sql } from "drizzle-orm";
import {
  physicianSteeringSchema,
  type PhysicianSteering,
} from "../ai/physicianSteeringSchema.js";
import { db } from "../db/index.js";
import { CasePhysicianSteering } from "../db/schema.js";

export const getPhysicianSteering = async (caseId: number) => {
  const storedSteering = await db.query.CasePhysicianSteering.findFirst({
    where: eq(CasePhysicianSteering.caseId, caseId),
  });

  if (!storedSteering) {
    return null;
  }

  return {
    ...storedSteering,
    steering: physicianSteeringSchema.parse(storedSteering.steering),
  };
};

export const upsertPhysicianSteering = async (
  caseId: number,
  steering: PhysicianSteering,
) => {
  const storedSteering = await db
    .insert(CasePhysicianSteering)
    .values({ caseId, steering })
    .onConflictDoUpdate({
      target: CasePhysicianSteering.caseId,
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

  return {
    ...result,
    steering: physicianSteeringSchema.parse(result.steering),
  };
};
