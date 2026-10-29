import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { CaseProviders, DiagnosisMentions, Records } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  createSignedDownloadUrl,
  deleteObject,
} from "../storage/googleCloudStorage.js";
import { summarizeRecord } from "../ai/gemini/summarizeRecord.js";
import type { CaseRecordDto, DocumentType } from "@azime/contracts";
import { buildDiagnosisMentions } from "../records/diagnosisMentions.js";

export const recordsController = {
  getByIdHandler: async (
    request: FastifyRequest<{ Querystring: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.query.caseId);
    try {
      const records = await db
        .select({
          record: Records,
          provider: {
            id: CaseProviders.id,
            name: CaseProviders.name,
            kind: CaseProviders.kind,
            discipline: CaseProviders.discipline,
          },
        })
        .from(Records)
        .leftJoin(CaseProviders, eq(Records.providerId, CaseProviders.id))
        .where(eq(Records.caseId, caseId));

      const response: CaseRecordDto[] = records.map(({ record, provider }) => ({
        ...record,
        provider,
      }));
      return reply.send(response);
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

      const summary = await summarizeRecord({
        ...record,
        documentType: record.documentType as DocumentType,
      });
      const diagnosisMentions = buildDiagnosisMentions(record, summary);

      await db.transaction(async (transaction) => {
        await transaction
          .update(Records)
          .set({ summary, summaryStatus: "completed" })
          .where(eq(Records.id, recordId));

        await transaction
          .delete(DiagnosisMentions)
          .where(eq(DiagnosisMentions.recordId, recordId));

        if (diagnosisMentions.length > 0) {
          await transaction.insert(DiagnosisMentions).values(diagnosisMentions);
        }
      });

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

      if (!record) {
        return reply.code(404).send({ error: "Record not found" });
      }

      if (record.url) {
        await deleteObject(record.url);
      }

      await db.delete(Records).where(eq(Records.id, recordId));

      return reply.send({ recordId, deleted: true });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to delete record" });
    }
  },
};
