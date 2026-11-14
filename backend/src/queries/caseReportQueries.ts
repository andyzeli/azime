import { desc, eq } from "drizzle-orm";
import {
  caseReportResponseSchema,
  type CaseReportResponse,
  type ReportInput,
  type SaveCaseReportRequest,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseReport } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

const toCaseReportResponse = (row: CaseReport) =>
  caseReportResponseSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export async function getLatestCaseReport(caseId: number) {
  const row = await db.query.CaseReport.findFirst({
    where: eq(CaseReport.caseId, caseId),
    orderBy: [desc(CaseReport.id)],
  });
  return row ? toCaseReportResponse(row) : null;
}

// Frozen before the model runs, so a failed generation still shows what it was given.
export async function createCaseReport(caseId: number, input: ReportInput) {
  const [row] = await db.insert(CaseReport).values({ caseId, input }).returning();
  return row!;
}

export async function saveCaseReportDraft(
  id: number,
  report: string,
  source: NonNullable<CaseReportResponse["source"]>
) {
  const [row] = await db
    .update(CaseReport)
    .set({ report, source, updatedAt: new Date() })
    .where(eq(CaseReport.id, id))
    .returning();
  return toCaseReportResponse(row!);
}

// Only the latest draft is edited; an older one was replaced by a regeneration.
export async function saveCaseReportEdit(
  caseId: number,
  reportId: number,
  { report, expectedRevision }: SaveCaseReportRequest
) {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(CaseReport)
      .where(eq(CaseReport.caseId, caseId))
      .orderBy(desc(CaseReport.id))
      .limit(1)
      .for("update");
    if (latest?.id !== reportId || latest.report === null)
      throw new MissingPrerequisiteError("A newer draft exists. Reload before editing");
    if (latest.revision !== expectedRevision)
      throw new MissingPrerequisiteError("The draft changed. Reload before saving");
    const [row] = await tx
      .update(CaseReport)
      .set({ report, revision: latest.revision + 1, updatedAt: new Date() })
      .where(eq(CaseReport.id, reportId))
      .returning();
    return toCaseReportResponse(row!);
  });
}
