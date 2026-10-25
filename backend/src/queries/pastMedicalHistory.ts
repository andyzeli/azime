import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { PastMedicalHistory } from "@azime/contracts";
import { safeParseStoredExtraction } from "../ai/gemini/registry.js";
import { db } from "../db/index.js";
import { CaseProviders, Records } from "../db/schema.js";

// Past medical history as the encounter notes document it. Notes often restate the same
// history, so repeated statements keep only their first appearance.
export const getPastMedicalHistory = async (caseId: number): Promise<PastMedicalHistory> => {
  const records = await db
    .select({
      id: Records.id,
      eventDate: Records.eventDate,
      summary: Records.summary,
      providerName: CaseProviders.name,
    })
    .from(Records)
    .leftJoin(CaseProviders, eq(Records.providerId, CaseProviders.id))
    .where(
      and(
        eq(Records.caseId, caseId),
        eq(Records.documentType, "encounter"),
        eq(Records.summaryStatus, "completed"),
        isNotNull(Records.summary),
      ),
    )
    .orderBy(asc(Records.eventDate), asc(Records.id));

  const seen = new Set<string>();
  return records.flatMap((record) => {
    const extraction = safeParseStoredExtraction("encounter", record.summary);
    if (!extraction.success)
      throw new Error(`Stored extraction for record ${record.id} is invalid`);
    const history = extraction.data.pastMedicalHistory.trim();
    const key = history.toLowerCase().replace(/\s+/g, " ");
    if (!history || seen.has(key)) return [];
    seen.add(key);
    return [{ recordId: record.id, date: record.eventDate, providerName: record.providerName, history }];
  });
};
