import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { NewPatientCase, PatientCase } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  caseInjuryDetailsSchema,
  updateAmaModeRequestSchema,
  updateReferralQuestionsRequestSchema,
  type PatientCaseDto,
} from "@azime/contracts";

export const caseController = {
  newHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as NewPatientCase;
    try {
      const [created] = await db
        .insert(PatientCase)
        .values(data)
        .returning({ id: PatientCase.id });
      return reply.send(created);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to create case" });
    }
  },

  getHandler: async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<PatientCaseDto[]> => {
    return db.query.PatientCase.findMany();
  },
  updateHandler: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    const input = caseInjuryDetailsSchema.safeParse(request.body);
    if (!input.success) {
      return reply.code(400).send({ error: "Invalid injury details" });
    }

    try {
      const [updatedCase] = await db
        .update(PatientCase)
        .set(input.data)
        .where(eq(PatientCase.id, id))
        .returning({
          injuryType: PatientCase.injuryType,
          dateOfInjury: PatientCase.dateOfInjury,
          regions: PatientCase.regions,
        });

      if (!updatedCase) {
        return reply.code(404).send({ error: "Case not found" });
      }

      return reply.send(updatedCase);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to update case" });
    }
  },
  updateAmaModeHandler: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(request.params.id);
    const input = updateAmaModeRequestSchema.safeParse(request.body);
    if (!Number.isInteger(id) || id <= 0 || !input.success) {
      return reply.code(400).send({ error: "Invalid AMA mode request" });
    }
    try {
      const [updated] = await db
        .update(PatientCase)
        .set({ amaMode: input.data.amaMode })
        .where(eq(PatientCase.id, id))
        .returning({ amaMode: PatientCase.amaMode });
      if (!updated) return reply.code(404).send({ error: "Case not found" });
      return reply.send(updated);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to update AMA mode" });
    }
  },
  updateReferralQuestionsHandler: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(request.params.id);
    const input = updateReferralQuestionsRequestSchema.safeParse(request.body);
    if (!Number.isInteger(id) || id <= 0 || !input.success) {
      return reply.code(400).send({ error: "Invalid referral questions request" });
    }
    try {
      const [updated] = await db
        .update(PatientCase)
        .set({ referralQuestions: input.data.referralQuestions })
        .where(eq(PatientCase.id, id))
        .returning({ referralQuestions: PatientCase.referralQuestions });
      if (!updated) return reply.code(404).send({ error: "Case not found" });
      return reply.send(updated);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to update referral questions" });
    }
  },
  getByIdHandler: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const id = Number(request.params.id);
    return db.query.PatientCase.findFirst({
      where: eq(PatientCase.id, id),
      with: {
        caseContact: {
          columns: {
            name: true,
            email: true,
            type: true,
            website: true,
          },
        },
        providerAssigned: {
          columns: {
            name: true,
            specialty: true,
          },
        },
      },
    });
  },
};
