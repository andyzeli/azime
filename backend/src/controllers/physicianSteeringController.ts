import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  assertPhysicianSteeringReady,
  physicianSteeringSchema,
} from "../ai/physicianSteeringSchema.js";
import { NotImplementedError } from "../errors/notImplementedError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import {
  getPhysicianSteering,
  upsertPhysicianSteering,
} from "../queries/physicianSteeringQueries.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

export const physicianSteeringController = {
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

      return reply.send(await getPhysicianSteering(caseId));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch physician steering" });
    }
  },

  upsertHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string };
      Body: unknown;
    }>,
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

      assertPhysicianSteeringReady();
      const steering = physicianSteeringSchema.parse(request.body);

      return reply.send(await upsertPhysicianSteering(caseId, steering));
    } catch (error) {
      if (error instanceof NotImplementedError) {
        return reply.code(501).send({ error: error.message });
      }

      if (error instanceof ZodError) {
        return reply.code(400).send({ error: "Invalid physician steering" });
      }

      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to store physician steering" });
    }
  },
};
