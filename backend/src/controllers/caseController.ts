import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { NewPatientCase, PatientCase } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const caseController = {
  newHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as NewPatientCase;
    try {
      const contact = await db.insert(PatientCase).values(data);
      reply.send({ success: true, data: contact });
    } catch (error) {
      console.error(error);
      reply.send({ success: false, error: error });
    }
  },

  getHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    return db.query.PatientCase.findMany();
  },
  getByIdHandler: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
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
