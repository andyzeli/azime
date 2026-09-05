import type { FastifyReply, FastifyRequest } from "fastify";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { getStoredProviderSummaries } from "../queries/providerSummaryQueries.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

export const providerSummariesController = {
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

      return reply.send(await getStoredProviderSummaries(caseId));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch provider summaries" });
    }
  },
};
