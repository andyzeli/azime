import { FastifyReply, FastifyRequest } from "fastify";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  CaseProviderSummaries,
  CaseProviders,
  CaseRecordsSummary,
  PatientCase,
  Records,
} from "../db/schema.js";
import { makeCaseSummary } from "../ai/makeCaseSummary.js";
import { makeProviderSummaries } from "../ai/makeProviderSummaries.js";
import { safeParseStoredExtraction } from "../ai/gemini/registry.js";

export const caseAggregateSummaryController = {
  createHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.params.caseId);

    if (Number.isNaN(caseId)) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      const patientCase = await db.query.PatientCase.findFirst({
        where: eq(PatientCase.id, caseId),
      });

      if (!patientCase) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const completedRecords = await db
        .select({
          id: Records.id,
          documentType: Records.documentType,
          eventDate: Records.eventDate,
          metadata: Records.metadata,
          summary: Records.summary,
          provider: {
            id: CaseProviders.id,
            name: CaseProviders.name,
            kind: CaseProviders.kind,
            discipline: CaseProviders.discipline,
          },
        })
        .from(Records)
        .leftJoin(CaseProviders, eq(Records.providerId, CaseProviders.id))
        .where(
          and(
            eq(Records.caseId, caseId),
            eq(Records.summaryStatus, "completed"),
            isNotNull(Records.summary),
          ),
        )
        .orderBy(asc(Records.eventDate), asc(Records.id));

      if (completedRecords.length === 0) {
        return reply.code(400).send({
          error: "No completed record extractions found for this case",
        });
      }

      const aggregateInput = completedRecords.map((record) => {
        const parsedSummary = safeParseStoredExtraction(
          record.documentType,
          record.summary,
        );

        if (!parsedSummary.success) {
          console.error(
            `Stored extraction for record ${record.id} failed validation:`,
            parsedSummary.error.flatten(),
          );
          throw new Error(
            `Stored extraction for record ${record.id} is invalid`,
          );
        }

        return {
          documentId: record.id,
          documentType: record.documentType,
          date: record.eventDate,
          documentMetadata: record.metadata,
          provider: record.provider,
          summary: parsedSummary.data,
        };
      });

      const [aggregateSummary, providerSummaries] = await Promise.all([
        makeCaseSummary(aggregateInput),
        makeProviderSummaries(aggregateInput),
      ]);

      const storage = await db.transaction(async (transaction) => {
        const storedSummaries = await transaction
          .insert(CaseRecordsSummary)
          .values({
            caseId,
            summary: aggregateSummary,
          })
          .onConflictDoUpdate({
            target: CaseRecordsSummary.caseId,
            set: { summary: aggregateSummary },
          })
          .returning({ id: CaseRecordsSummary.id });

        await transaction
          .insert(CaseProviderSummaries)
          .values({ caseId, summary: providerSummaries })
          .onConflictDoUpdate({
            target: CaseProviderSummaries.caseId,
            set: { summary: providerSummaries },
          });

        return {
          caseSummaryId: storedSummaries[0]?.id ?? null,
          providerSummariesCaseId: caseId,
        };
      });

      return reply.send({
        caseId,
        sourceRecordCount: aggregateInput.length,
        aggregateSummary,
        providerSummaries,
        storage,
      });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to generate aggregate summary" });
    }
  },
};
