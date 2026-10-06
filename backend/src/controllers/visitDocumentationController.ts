import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { saveVisitDocumentationRequestSchema } from "@azime/contracts";
import { caseExists } from "../queries/caseArtifactQueries.js";
import {
  getVisitDocumentation,
  saveVisitDocumentation,
} from "../queries/visitDocumentationQueries.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

type Params = { caseId: string };
const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
});
function sendError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError)
    return reply
      .code(400)
      .send({ error: "Invalid visit documentation request" });
  if (error instanceof MissingPrerequisiteError)
    return reply.code(409).send({ error: error.message });
  console.error(error);
  return reply.code(500).send({ error: "Visit documentation request failed" });
}

export const visitDocumentationController = {
  getHandler: async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId } = paramsSchema.parse(request.params);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getVisitDocumentation(caseId));
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
      const input = saveVisitDocumentationRequestSchema.parse(request.body);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await saveVisitDocumentation(caseId, input));
    } catch (error) {
      return sendError(error, reply);
    }
  },
};
