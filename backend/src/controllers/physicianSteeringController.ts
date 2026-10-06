import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  savePhysicianSteeringRequestSchema,
  supportedRegions,
  type Region,
} from "@azime/contracts";
import { PhysicianSteeringError } from "../ai/physicianSteeringSchema.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import {
  getPhysicianSteering,
  upsertPhysicianSteering,
} from "../queries/physicianSteeringQueries.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

const parseRegion = (value: string): Region | null =>
  supportedRegions.some((region) => region.value === value)
    ? (value as Region)
    : null;

export const physicianSteeringController = {
  getByCaseIdHandler: async (
    request: FastifyRequest<{ Params: { caseId: string; region: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }
    if (!region) {
      return reply.code(400).send({ error: "Invalid region" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      return reply.send(await getPhysicianSteering(caseId, region));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch physician steering" });
    }
  },

  upsertHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string; region: string };
      Body: unknown;
    }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }
    if (!region) {
      return reply.code(400).send({ error: "Invalid region" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const input = savePhysicianSteeringRequestSchema.parse(request.body);

      return reply.send(await upsertPhysicianSteering(caseId, region, input));
    } catch (error) {
      if (error instanceof PhysicianSteeringError) {
        return reply.code(error.statusCode).send({ error: error.message });
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
