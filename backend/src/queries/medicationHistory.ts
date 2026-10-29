import { and, asc, eq, isNotNull } from "drizzle-orm";
import {
  safeParseStoredExtraction,
  type StoredExtraction,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { Records } from "../db/schema.js";

type EncounterMedication = StoredExtraction<"encounter">["medications"][number];

export type MedicationHistoryEntry = {
  recordId: number;
  date: string | null;
  medication: EncounterMedication["name"];
} & Pick<EncounterMedication, "dose" | "action">;

export const getMedicationHistory = async (
  caseId: number,
): Promise<MedicationHistoryEntry[]> => {
  const records = await db
    .select({
      id: Records.id,
      eventDate: Records.eventDate,
      summary: Records.summary,
    })
    .from(Records)
    .where(
      and(
        eq(Records.caseId, caseId),
        eq(Records.documentType, "encounter"),
        eq(Records.summaryStatus, "completed"),
        isNotNull(Records.summary),
      ),
    )
    .orderBy(asc(Records.eventDate), asc(Records.id));

  return records.flatMap((record) => {
    const extraction = safeParseStoredExtraction("encounter", record.summary);

    if (!extraction.success) {
      throw new Error(`Stored extraction for record ${record.id} is invalid`);
    }

    return extraction.data.medications.map(({ name, dose, action }) => ({
      recordId: record.id,
      date: record.eventDate,
      medication: name,
      dose,
      action,
    }));
  });
};
