import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { regionSchema, saveRegionDiagnosesRequestSchema } from "@azime/contracts";
import { caseExists } from "../queries/caseArtifactQueries.js";
import {
  getRegionDiagnosisList,
  InvalidRegionDiagnosesError,
  saveRegionDiagnosisList,
} from "../queries/regionDiagnosesQueries.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";

type Params = { caseId: string; region: string };
const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
  region: regionSchema,
});
function sendError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError)
    return reply.code(400).send({ error: "Invalid diagnoses request" });
  if (error instanceof InvalidRegionDiagnosesError)
    return reply.code(400).send({ error: error.message });
  if (error instanceof MissingPrerequisiteError)
    return reply.code(409).send({ error: error.message });
  console.error(error);
  return reply.code(500).send({ error: "Diagnoses request failed" });
}

export const regionDiagnosesController = {
  getHandler: async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId, region } = paramsSchema.parse(request.params);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getRegionDiagnosisList(caseId, region));
    } catch (error) {
      return sendError(error, reply);
    }
  },
  saveHandler: async (
    request: FastifyRequest<{ Params: Params; Body: unknown }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId, region } = paramsSchema.parse(request.params);
      const input = saveRegionDiagnosesRequestSchema.parse(request.body);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await saveRegionDiagnosisList(caseId, region, input));
    } catch (error) {
      return sendError(error, reply);
    }
  },
};
