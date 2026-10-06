import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import {
  generatePostExamAnalysisRequestSchema,
  regionSchema,
} from "@azime/contracts";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { createPostExamInputSnapshot } from "../queries/postExamInputQueries.js";
import {
  getStoredPostExamAnalysis,
  savePostExamAnalysis,
} from "../queries/postExamAnalysisQueries.js";
import { makePostExamAnalysis } from "../ai/makePostExamAnalysis.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { NotImplementedError } from "../errors/notImplementedError.js";

type Params = { caseId: string; region: string };
const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
  region: regionSchema,
});
function sendError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError)
    return reply
      .code(400)
      .send({ error: "Invalid post-exam analysis request" });
  if (error instanceof MissingPrerequisiteError)
    return reply.code(409).send({ error: error.message });
  if (error instanceof NotImplementedError)
    return reply.code(501).send({ error: error.message });
  console.error(error);
  return reply.code(500).send({ error: "Post-exam analysis request failed" });
}

export const postExamAnalysisController = {
  takeSnapshotHandler: async (
    request: FastifyRequest<{ Params: Params; Body: unknown }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId, region } = paramsSchema.parse(request.params);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply
        .code(201)
        .send(await createPostExamInputSnapshot(caseId, region));
    } catch (error) {
      return sendError(error, reply);
    }
  },
  createHandler: async (
    request: FastifyRequest<{ Params: Params; Body: unknown }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId, region } = paramsSchema.parse(request.params);
      const { snapshotId } = generatePostExamAnalysisRequestSchema.parse(
        request.body,
      );
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      const stored = await getStoredPostExamAnalysis(
        caseId,
        region,
        snapshotId,
      );
      if (!stored)
        return reply.code(404).send({ error: "Post-exam snapshot not found" });
      if (stored.analysis)
        throw new MissingPrerequisiteError(
          "This snapshot has already been analyzed. Take a new snapshot to run again",
        );
      // Only frozen model input is sent; provenance stays in the envelope.
      const analysis = await makePostExamAnalysis(stored.inputSnapshot.input);
      return reply.send(
        await savePostExamAnalysis(caseId, region, snapshotId, analysis),
      );
    } catch (error) {
      return sendError(error, reply);
    }
  },
  getByCaseIdHandler: async (
    request: FastifyRequest<{
      Params: Params;
      Querystring: { snapshotId?: string };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const { caseId, region } = paramsSchema.parse(request.params);
      const snapshotId = z.coerce
        .number()
        .int()
        .positive()
        .optional()
        .parse(request.query.snapshotId);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      const stored = await getStoredPostExamAnalysis(
        caseId,
        region,
        snapshotId,
      );
      if (snapshotId !== undefined && !stored)
        return reply.code(404).send({ error: "Post-exam snapshot not found" });
      return reply.send(stored);
    } catch (error) {
      return sendError(error, reply);
    }
  },
};
