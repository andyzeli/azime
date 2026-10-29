import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  safeParseStoredExtraction,
  type StoredExtraction,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { Records } from "../db/schema.js";

export type WorkStatusHistoryEntry = {
  recordId: number;
  documentType: "encounter" | "workstatus";
  date: string | null;
} & Pick<StoredExtraction<"workstatus">, "status" | "restrictions">;

export function selectLatestWorkStatus(history: WorkStatusHistoryEntry[]): WorkStatusHistoryEntry | null {
  return history.reduce<WorkStatusHistoryEntry | null>((latest, entry) => {
    if (!latest) return entry;
    const date = entry.date ?? "";
    const latestDate = latest.date ?? "";
    return date > latestDate || (date === latestDate && entry.recordId > latest.recordId)
      ? entry : latest;
  }, null);
}

export const getWorkStatusHistory = async (
  caseId: number,
): Promise<WorkStatusHistoryEntry[]> => {
  const records = await db
    .select({
      id: Records.id,
      documentType: Records.documentType,
      eventDate: Records.eventDate,
      summary: Records.summary,
    })
    .from(Records)
    .where(
      and(
        eq(Records.caseId, caseId),
        inArray(Records.documentType, ["encounter", "workstatus"]),
        eq(Records.summaryStatus, "completed"),
        isNotNull(Records.summary),
      ),
    )
    .orderBy(asc(Records.eventDate), asc(Records.id));

  return records.map((record) => {
    const documentType =
      record.documentType === "encounter" ? "encounter" : "workstatus";
    const extraction =
      documentType === "encounter"
        ? safeParseStoredExtraction("encounter", record.summary)
        : safeParseStoredExtraction("workstatus", record.summary);

    if (!extraction.success) {
      throw new Error(`Stored extraction for record ${record.id} is invalid`);
    }

    const { status, restrictions } =
      "workStatus" in extraction.data
        ? extraction.data.workStatus
        : extraction.data;

    return {
      recordId: record.id,
      documentType,
      date: record.eventDate,
      status,
      restrictions,
    };
  });
};
