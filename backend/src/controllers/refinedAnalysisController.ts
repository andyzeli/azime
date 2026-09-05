import type { FastifyReply, FastifyRequest } from "fastify";
import { makeRefinedAnalysis } from "../ai/makeRefinedAnalysis.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { NotImplementedError } from "../errors/notImplementedError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { getRefinedAnalysisInput } from "../queries/refinedAnalysisInputQueries.js";
import {
  getStoredRefinedAnalysis,
  upsertRefinedAnalysis,
} from "../queries/refinedAnalysisQueries.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

export const refinedAnalysisController = {
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

      const { input, sources } = await getRefinedAnalysisInput(caseId);
      const analysis = await makeRefinedAnalysis(input, sources);
      const refinedAnalysisId = await upsertRefinedAnalysis(caseId, analysis);

      return reply.send({
        caseId,
        analysis,
        storage: {
          refinedAnalysisId,
        },
      });
    } catch (error) {
      if (error instanceof NotImplementedError) {
        return reply.code(501).send({ error: error.message });
      }

      if (error instanceof MissingPrerequisiteError) {
        return reply.code(409).send({ error: error.message });
      }

      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to generate refined analysis" });
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

      return reply.send(await getStoredRefinedAnalysis(caseId));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch refined analysis" });
    }
  },
};
