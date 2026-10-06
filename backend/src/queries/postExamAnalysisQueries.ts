import { and, desc, eq, isNull } from "drizzle-orm";
import {
  postExamAnalysisResponseSchema,
  storedPostExamAnalysisSchema,
  type Region,
  type StoredPostExamAnalysis,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CasePostExamAnalysis } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

export const toPostExamAnalysisResponse = (row: CasePostExamAnalysis) =>
  postExamAnalysisResponseSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export async function getStoredPostExamAnalysis(
  caseId: number,
  region: Region,
  snapshotId?: number,
) {
  const row = await db.query.CasePostExamAnalysis.findFirst({
    where: and(
      eq(CasePostExamAnalysis.caseId, caseId),
      eq(CasePostExamAnalysis.region, region),
      snapshotId === undefined
        ? undefined
        : eq(CasePostExamAnalysis.id, snapshotId),
    ),
    orderBy: [desc(CasePostExamAnalysis.id)],
  });
  return row ? toPostExamAnalysisResponse(row) : null;
}

export async function savePostExamAnalysis(
  caseId: number,
  region: Region,
  snapshotId: number,
  analysis: StoredPostExamAnalysis,
) {
  const [stored] = await db
    .update(CasePostExamAnalysis)
    .set({
      analysis: storedPostExamAnalysisSchema.parse(analysis),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(CasePostExamAnalysis.id, snapshotId),
        eq(CasePostExamAnalysis.caseId, caseId),
        eq(CasePostExamAnalysis.region, region),
        isNull(CasePostExamAnalysis.analysis),
      ),
    )
    .returning();
  if (!stored)
    throw new MissingPrerequisiteError(
      "Snapshot is missing or already analyzed. Take a new post-exam snapshot",
    );
  return toPostExamAnalysisResponse(stored);
}
