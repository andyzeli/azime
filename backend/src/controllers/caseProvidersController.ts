import type { FastifyReply, FastifyRequest } from "fastify";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { CaseProviders, PatientCase } from "../db/schema.js";
import { createCaseProviderSchema } from "../providers/caseProvider.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

export const caseProvidersController = {
  listHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      return reply.send(
        await db.query.CaseProviders.findMany({
          where: eq(CaseProviders.caseId, caseId),
          orderBy: [asc(CaseProviders.name)],
        }),
      );
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to fetch providers" });
    }
  },

  createHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      const input = createCaseProviderSchema.parse(request.body);
      const patientCase = await db.query.PatientCase.findFirst({
        columns: { id: true },
        where: eq(PatientCase.id, caseId),
      });

      if (!patientCase) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const [provider] = await db
        .insert(CaseProviders)
        .values({ caseId, ...input })
        .returning();

      return reply.code(201).send(provider);
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Failed to create provider" });
    }
  },
};
