import { desc, eq } from "drizzle-orm";
import {
  caseReportResponseSchema,
  type CaseReportResponse,
  type ReportInput,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseReport } from "../db/schema.js";

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
