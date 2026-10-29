import { and, asc, eq, isNotNull } from "drizzle-orm";
import {
  safeParseStoredExtraction,
  type StoredExtraction,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { Records } from "../db/schema.js";

export type CompletedStudy = {
  recordId: number;
  date: string | null;
} & Pick<
  StoredExtraction<"imaging_report">,
  "modality" | "bodySite" | "detailedFindings" | "radiologistImpression"
>;

export const getCompletedStudies = async (
  caseId: number,
): Promise<CompletedStudy[]> => {
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
        eq(Records.documentType, "imaging_report"),
        eq(Records.summaryStatus, "completed"),
        isNotNull(Records.summary),
      ),
    )
    .orderBy(asc(Records.eventDate), asc(Records.id));

  return records.map((record) => {
    const extraction = safeParseStoredExtraction(
      "imaging_report",
      record.summary,
    );

    if (!extraction.success) {
      throw new Error(`Stored extraction for record ${record.id} is invalid`);
    }

    const { modality, bodySite, detailedFindings, radiologistImpression } =
      extraction.data;

    return {
      recordId: record.id,
      date: record.eventDate,
      modality,
      bodySite,
      detailedFindings,
      radiologistImpression,
    };
  });
};
