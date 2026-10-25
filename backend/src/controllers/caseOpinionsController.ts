import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { saveCaseOpinionsRequestSchema } from "@azime/contracts";
import { caseExists } from "../queries/caseArtifactQueries.js";
import {
  getCaseOpinions,
  saveCaseOpinions,
} from "../queries/caseOpinionsQueries.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

type Params = { caseId: string };
const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
});
function sendError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError)
    return reply.code(400).send({ error: "Invalid opinions request" });
  if (error instanceof MissingPrerequisiteError)
    return reply.code(409).send({ error: error.message });
  console.error(error);
  return reply.code(500).send({ error: "Opinions request failed" });
}

export const caseOpinionsController = {
  getHandler: async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getCaseOpinions(caseId));
    } catch (error) {
      return sendError(error, reply);
    }
  },
  saveHandler: async (
    request: FastifyRequest<{ Params: Params; Body: unknown }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      const input = saveCaseOpinionsRequestSchema.parse(request.body);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await saveCaseOpinions(caseId, input));
    } catch (error) {
      return sendError(error, reply);
    }
  },
};
