import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { Records } from "../db/schema.js";
import {
  createObjectKey,
  createSignedUploadUrl,
  objectExists,
} from "../storage/googleCloudStorage.js";

const signUploadSchema = z.object({
  caseId: z.number().int().positive(),
  fileName: z.string().min(1),
  contentType: z.literal("application/pdf"),
});

const completeUploadSchema = z.object({
  caseId: z.number().int().positive(),
  objectKey: z.string().min(1),
  name: z.string().min(1),
  providerName: z.string().trim().optional(),
  documentType: z
    .enum(["pcp", "specialist", "legal", "imaging", "therapy"])
    .optional(),
});

export const uploadController = {
  signUploadHandler: async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const data = signUploadSchema.parse(request.body);
      const objectKey = createObjectKey(data.caseId, data.fileName);
      const uploadUrl = await createSignedUploadUrl(
        objectKey,
        data.contentType
      );

      return reply.send({ objectKey, uploadUrl });
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Failed to create upload URL" });
    }
  },

  completeUploadHandler: async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const data = completeUploadSchema.parse(request.body);
      const uploaded = await objectExists(data.objectKey);

      if (!uploaded) {
        return reply
          .code(400)
          .send({ error: "Uploaded file not found in storage bucket" });
      }

      const [record] = await db
        .insert(Records)
        .values({
          caseId: data.caseId,
          url: data.objectKey,
          name: data.name,
          providerName: data.providerName || null,
          documentType: data.documentType || null,
        })
        .returning();

      return reply.code(201).send(record);
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Failed to complete upload" });
    }
  },
};
