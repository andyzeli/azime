import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { CaseContacts } from "../db/schema.js";

export const contactController = {
  newHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as Omit<CaseContacts, "id">;
    try {
      const [created] = await db
        .insert(CaseContacts)
        .values(data)
        .returning({ id: CaseContacts.id });
      return reply.send(created);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to create contact" });
    }
  },

  getHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    return db.query.CaseContacts.findMany();
  },
};
