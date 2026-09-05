import type { FastifyReply, FastifyRequest } from "fastify";
import { makePreExamAnalysis } from "../ai/makePreExamAnalysis.js";
import { NotImplementedError } from "../errors/notImplementedError.js";
import {
  caseExists,
  getCaseArtifactBundle,
} from "../queries/caseArtifactQueries.js";
import { getDeterministicSignals } from "../queries/deterministicSignalQueries.js";
import {
  getStoredPreExamAnalysis,
  upsertPreExamAnalysis,
} from "../queries/preExamAnalysisQueries.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

export const preExamAnalysisController = {
  createHandler: async (
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

      const artifacts = await getCaseArtifactBundle(caseId);

      if (!artifacts.caseSummary) {
        return reply.code(400).send({
          error: "Generate the case summary before pre-exam analysis",
        });
      }

      const deterministicSignals = await getDeterministicSignals(artifacts);
      const analysis = await makePreExamAnalysis({
        ...artifacts,
        deterministicSignals,
      });

      const preExamAnalysisId = await upsertPreExamAnalysis(caseId, analysis);

      return reply.send({
        caseId,
        analysis,
        storage: {
          preExamAnalysisId,
        },
      });
    } catch (error) {
      if (error instanceof NotImplementedError) {
        return reply.code(501).send({ error: error.message });
      }

      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to generate pre-exam analysis" });
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

      return reply.send(await getStoredPreExamAnalysis(caseId));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch pre-exam analysis" });
    }
  },
};
