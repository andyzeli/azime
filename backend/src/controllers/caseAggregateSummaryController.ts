import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import { CaseProviderSummaries, CaseRecordsSummary } from "../db/schema.js";
import { makeCaseSummary } from "../ai/makeCaseSummary.js";
import { makeProviderSummaries } from "../ai/makeProviderSummaries.js";
import { getStoredCaseSummary } from "../queries/caseSummaryQueries.js";
import { getCaseSummaryCard } from "../queries/caseSummaryCardQueries.js";
import {
  caseExists,
  getCaseBaseData,
  getDocumentExtractionArtifacts,
} from "../queries/caseArtifactQueries.js";
const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};
export const caseAggregateSummaryController = {
  getCardHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    if (!caseId) return reply.code(400).send({ error: "Invalid case id" });

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }
      return reply.send(await getCaseSummaryCard(caseId));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to fetch case summary card" });
    }
  },
  createHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.params.caseId);

    if (Number.isNaN(caseId)) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const extractionArtifacts = await getDocumentExtractionArtifacts(caseId);
      const case_base = await getCaseBaseData(caseId);

      if (extractionArtifacts.length === 0) {
        return reply.code(400).send({
          error: "No completed record extractions found for this case",
        });
      }

      const [aggregateSummary, providerSummaries] = await Promise.all([
        makeCaseSummary(extractionArtifacts, case_base),
        makeProviderSummaries(extractionArtifacts),
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
        sourceRecordCount: extractionArtifacts.length,
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
  getByCaseIdHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      return reply.send(await getStoredCaseSummary(caseId));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to fetch case summary" });
    }
  },
};
