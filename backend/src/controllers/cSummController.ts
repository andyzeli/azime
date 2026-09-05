import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { CaseRecordsSummary } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const caseSummaryController = {
  getByCaseIdHandler: async (
    request: FastifyRequest<{ Querystring: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.query.caseId);
    try {
      const summary = await db.query.CaseRecordsSummary.findFirst({
        where: eq(CaseRecordsSummary.caseId, caseId),
      });
      return reply.send(summary ?? null);
    } catch (error) {
      console.error(error);
      return reply.send({ success: false, error: error });
    }
  },
};
