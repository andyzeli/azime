import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { Records } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  createSignedDownloadUrl,
  deleteObject,
} from "../storage/googleCloudStorage.js";
import { summarizeRecord } from "../gemini/summarizeRecord.js";

export const recordsController = {
  getByIdHandler: async (
    request: FastifyRequest<{ Querystring: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.query.caseId);
    try {
      const records = await db.query.Records.findMany({
        where: eq(Records.caseId, caseId),
      });
      return reply.send(records);
    } catch (error) {
      console.log(error, "is the error");
      return reply.code(500).send({ error: "Failed to fetch records" });
    }
  },

  summarizeByRecordIdHandler: async (
    request: FastifyRequest<{ Params: { recordId: string } }>,
    reply: FastifyReply,
  ) => {
    const recordId = Number(request.params.recordId);

    if (Number.isNaN(recordId)) {
      return reply.code(400).send({ error: "Invalid record id" });
    }

    try {
      const record = await db.query.Records.findFirst({
        where: eq(Records.id, recordId),
      });

      if (!record) {
        return reply.code(404).send({ error: "Record not found" });
      }

      await db
        .update(Records)
        .set({
          summaryStatus: "processing",
        })
        .where(eq(Records.id, recordId));

      const summary = await summarizeRecord(record);

      await db
        .update(Records)
        .set({
          summary: summary,
          summaryStatus: "completed",
        })
        .where(eq(Records.id, recordId));

      return reply.send({
        recordId,
        summaryStatus: "completed",
        summary,
      });
    } catch (error) {
      console.error(error);

      await db
        .update(Records)
        .set({
          summaryStatus: "failed",
        })
        .where(eq(Records.id, recordId));

      return reply.code(500).send({ error: "Failed to summarize record" });
    }
  },

  getDownloadUrlHandler: async (
    request: FastifyRequest<{ Params: { recordId: string } }>,
    reply: FastifyReply,
  ) => {
    const recordId = Number(request.params.recordId);

    try {
      const record = await db.query.Records.findFirst({
        where: eq(Records.id, recordId),
      });

      if (!record?.url) {
        return reply.code(404).send({ error: "Record not found" });
      }

      const url = await createSignedDownloadUrl(record.url);

      return reply.send({ url });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to create download URL" });
    }
  },

  deleteByRecordIdHandler: async (
    request: FastifyRequest<{ Params: { recordId: string } }>,
    reply: FastifyReply,
  ) => {
    const recordId = Number(request.params.recordId);

    if (Number.isNaN(recordId)) {
      return reply.code(400).send({ error: "Invalid record id" });
    }

    try {
      const record = await db.query.Records.findFirst({
        where: eq(Records.id, recordId),
      });

      if (!record?.url) {
        return reply.code(404).send({ error: "Record not found" });
      }

      await deleteObject(record.url);

      await db.delete(Records).where(eq(Records.id, recordId));

      return reply.send({ recordId, deleted: true });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to delete record" });
    }
  },
};
