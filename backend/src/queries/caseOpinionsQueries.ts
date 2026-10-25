import { eq } from "drizzle-orm";
import {
  caseOpinionsResponseSchema,
  saveCaseOpinionsRequestSchema,
  type SaveCaseOpinionsRequest,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseOpinionsDocument, PatientCase } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

const toCaseOpinionsResponse = (row: CaseOpinionsDocument) =>
  caseOpinionsResponseSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export async function getCaseOpinions(caseId: number) {
  const row = await db.query.CaseOpinionsDocument.findFirst({
    where: eq(CaseOpinionsDocument.caseId, caseId),
  });
  return row ? toCaseOpinionsResponse(row) : null;
}

export async function saveCaseOpinions(
  caseId: number,
  input: SaveCaseOpinionsRequest
) {
  const { opinions, expectedRevision } =
    saveCaseOpinionsRequestSchema.parse(input);
  return db.transaction(async (tx) => {
    // Lock the parent so two first saves cannot both create revision 1.
    await tx
      .select({ id: PatientCase.id })
      .from(PatientCase)
      .where(eq(PatientCase.id, caseId))
      .for("update");

    const existing = await tx.query.CaseOpinionsDocument.findFirst({
      where: eq(CaseOpinionsDocument.caseId, caseId),
    });
    if ((existing?.revision ?? 0) !== expectedRevision)
      throw new MissingPrerequisiteError("Opinions changed. Reload before saving");

    const [saved] = existing
      ? await tx
          .update(CaseOpinionsDocument)
          .set({
            opinions,
            revision: existing.revision + 1,
            updatedAt: new Date(),
          })
          .where(eq(CaseOpinionsDocument.id, existing.id))
          .returning()
      : await tx
          .insert(CaseOpinionsDocument)
          .values({ caseId, opinions })
          .returning();
    return toCaseOpinionsResponse(saved!);
  });
}
