import { and, eq, inArray } from "drizzle-orm";
import {
  getProviderDisciplineLabel,
  storedCaseClinicalSummarySchema,
  type CaseSummaryResponse,
} from "@azime/contracts";
import { db } from "../db/index.js";
import {
  CaseProviders,
  CaseRecordsSummary,
  Records,
} from "../db/schema.js";

export const getStoredCaseSummary = async (
  caseId: number,
): Promise<CaseSummaryResponse | null> => {
  const storedSummary = await db.query.CaseRecordsSummary.findFirst({
    where: eq(CaseRecordsSummary.caseId, caseId),
  });

  if (!storedSummary) {
    return null;
  }

  const summary = storedCaseClinicalSummarySchema.parse(storedSummary.summary);
  const recordIds = [
    ...new Set(
      summary.statusTimeline
        .map(({ recordId }) => Number(recordId))
        .filter((recordId) => Number.isInteger(recordId) && recordId > 0),
    ),
  ];

  const timelineRecords =
    recordIds.length === 0
      ? []
      : await db
          .select({
            id: Records.id,
            date: Records.eventDate,
            providerName: CaseProviders.name,
            providerType: CaseProviders.discipline,
          })
          .from(Records)
          .leftJoin(CaseProviders, eq(Records.providerId, CaseProviders.id))
          .where(
            and(eq(Records.caseId, caseId), inArray(Records.id, recordIds)),
          );

  const metadataByRecordId = new Map(
    timelineRecords.map((record) => [
      record.id,
      {
        date: record.date,
        providerName: record.providerName,
        providerType: record.providerType
          ? getProviderDisciplineLabel(record.providerType)
          : null,
      },
    ]),
  );

  const statusTimeline = summary.statusTimeline.map((entry) => {
    const metadata = metadataByRecordId.get(Number(entry.recordId));

    return {
      ...entry,
      date: metadata?.date ?? null,
      providerName: metadata?.providerName ?? null,
      providerType: metadata?.providerType ?? null,
    };
  });

  return {
    ...storedSummary,
    summary: {
      ...summary,
      statusTimeline,
    },
  };
};
