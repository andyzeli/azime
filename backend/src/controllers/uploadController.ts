import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { and, eq } from "drizzle-orm";
import { CaseProviders, Records } from "../db/schema.js";
import {
  createObjectKey,
  createSignedUploadUrl,
  objectExists,
} from "../storage/googleCloudStorage.js";
import { completeRecordUploadSchema } from "@azime/contracts";

const signUploadSchema = z.object({
  caseId: z.number().int().positive(),
  fileName: z.string().min(1),
  contentType: z.literal("application/pdf"),
});

export const uploadController = {
  signUploadHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = signUploadSchema.parse(request.body);
      const objectKey = createObjectKey(data.caseId, data.fileName);
      const uploadUrl = await createSignedUploadUrl(
        objectKey,
        data.contentType,
      );

      return reply.send({ objectKey, uploadUrl });
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Failed to create upload URL" });
    }
  },

  completeUploadHandler: async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const data = completeRecordUploadSchema.parse(request.body);
      const uploaded = await objectExists(data.objectKey);

      if (!uploaded) {
        return reply
          .code(400)
          .send({ error: "Uploaded file not found in storage bucket" });
      }

      if ("providerId" in data) {
        const provider = await db.query.CaseProviders.findFirst({
          columns: { id: true },
          where: and(
            eq(CaseProviders.id, data.providerId),
            eq(CaseProviders.caseId, data.caseId),
          ),
        });

        if (!provider) {
          return reply
            .code(400)
            .send({ error: "Provider does not belong to this case" });
        }
      }

      const [record] = await db
        .insert(Records)
        .values({
          caseId: data.caseId,
          url: data.objectKey,
          name: data.name,
          eventDate: data.eventDate,
          documentType: data.documentType,
          providerId: "providerId" in data ? data.providerId : null,
          metadata: data.metadata,
        })
        .returning();

      return reply.code(201).send(record);
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Failed to complete upload" });
    }
  },
};
