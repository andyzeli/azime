import { FastifyReply, FastifyRequest } from "fastify";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { CaseRecordsSummary, PatientCase, Records } from "../db/schema.js";
import { buildAggregateSummaryInput } from "../gemini/buildAggregateSummaryInput.js";
import { synthesizeCaseSummary } from "../gemini/synthesizeCaseSummary.js";

const AGGREGATE_SUMMARY_SECTION = "ai_aggregate_summary";

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
        .select()
        .from(Records)
        .where(
          and(
            eq(Records.caseId, caseId),
            eq(Records.summaryStatus, "completed"),
            isNotNull(Records.summary),
          ),
        )
        .orderBy(
          asc(Records.providerName),
          asc(Records.name),
          asc(Records.id),
        );

      if (completedRecords.length === 0) {
        return reply.code(400).send({
          error: "No completed provider summaries found for this case",
        });
      }

      const aggregateInput = buildAggregateSummaryInput({
        patientCase,
        records: completedRecords,
      });

      const aggregateSummary = await synthesizeCaseSummary(aggregateInput);
      const serializedSummary = JSON.stringify(aggregateSummary, null, 2);

      const existingAggregateSummary = await db.query.CaseRecordsSummary.findFirst(
        {
          where: and(
            eq(CaseRecordsSummary.caseId, caseId),
            eq(CaseRecordsSummary.section, AGGREGATE_SUMMARY_SECTION),
          ),
        },
      );

      let caseSummaryId: number | null = null;

      if (existingAggregateSummary) {
        await db
          .update(CaseRecordsSummary)
          .set({
            summary: serializedSummary,
          })
          .where(eq(CaseRecordsSummary.id, existingAggregateSummary.id));

        caseSummaryId = existingAggregateSummary.id;
      } else {
        const insertedSummaries = await db
          .insert(CaseRecordsSummary)
          .values({
            caseId,
            section: AGGREGATE_SUMMARY_SECTION,
            summary: serializedSummary,
          })
          .returning({ id: CaseRecordsSummary.id });

        caseSummaryId = insertedSummaries[0]?.id ?? null;
      }

      return reply.send({
        caseId,
        providerSummaryCount: aggregateInput.providerSummaries.length,
        aggregateInput,
        aggregateSummary,
        storage: {
          caseSummaryId,
          section: AGGREGATE_SUMMARY_SECTION,
        },
      });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to generate aggregate summary" });
    }
  },
};
