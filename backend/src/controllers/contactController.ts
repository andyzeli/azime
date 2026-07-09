import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { CaseContacts } from "../db/schema.js";

export const contactController = {
  newHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as Omit<CaseContacts, "id">;
    try {
      const contact = await db.insert(CaseContacts).values(data);
      reply.send({ success: true, data: contact });
    } catch (error) {
      console.error(error);
      reply.send({ success: false, error: error });
    }
  },

  getHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    return db.query.CaseContacts.findMany();
  },
};
