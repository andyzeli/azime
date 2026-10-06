import { eq } from "drizzle-orm";
import {
  saveVisitDocumentationRequestSchema,
  visitDocumentationResponseSchema,
  type SaveVisitDocumentationRequest,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseVisitDocumentation, PatientCase } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

export const toVisitDocumentationResponse = (row: CaseVisitDocumentation) =>
  visitDocumentationResponseSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export async function getVisitDocumentation(caseId: number) {
  const row = await db.query.CaseVisitDocumentation.findFirst({
    where: eq(CaseVisitDocumentation.caseId, caseId),
  });
  return row ? toVisitDocumentationResponse(row) : null;
}

export async function saveVisitDocumentation(
  caseId: number,
  input: SaveVisitDocumentationRequest
) {
  const { documentation, expectedRevision } =
    saveVisitDocumentationRequestSchema.parse(input);
  return db.transaction(async (tx) => {
    // Lock the parent so two first saves cannot both create revision 1.
    await tx
      .select({ id: PatientCase.id })
      .from(PatientCase)
      .where(eq(PatientCase.id, caseId))
      .for("update");

    const existing = await tx.query.CaseVisitDocumentation.findFirst({
      where: eq(CaseVisitDocumentation.caseId, caseId),
    });
    if ((existing?.revision ?? 0) !== expectedRevision)
      throw new MissingPrerequisiteError(
        "Visit documentation changed. Reload before saving"
      );

    const [saved] = existing
      ? await tx
          .update(CaseVisitDocumentation)
          .set({
            documentation,
            revision: existing.revision + 1,
            updatedAt: new Date(),
          })
          .where(eq(CaseVisitDocumentation.id, existing.id))
          .returning()
      : await tx
          .insert(CaseVisitDocumentation)
          .values({ caseId, documentation })
          .returning();
    return toVisitDocumentationResponse(saved!);
  });
}
