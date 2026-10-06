import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import {
  generateRefinedAnalysisRequestSchema,
  regionSchema,
} from "@azime/contracts";
import { makeRefinedAnalysis } from "../ai/makeRefinedAnalysis.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { NotImplementedError } from "../errors/notImplementedError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { getRefinedAnalysisInput } from "../queries/refinedAnalysisInputQueries.js";
import {
  getStoredRefinedAnalysis,
  upsertRefinedAnalysis,
} from "../queries/refinedAnalysisQueries.js";

type Params = { caseId: string; region: string };
const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
  region: regionSchema,
});

function sendError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError)
    return reply.code(400).send({ error: "Invalid refined analysis request" });
  if (error instanceof MissingPrerequisiteError)
    return reply.code(409).send({ error: error.message });
  if (error instanceof NotImplementedError)
    return reply.code(501).send({ error: error.message });
  console.error(error);
  return reply.code(500).send({ error: "Refined analysis request failed" });
}

export const refinedAnalysisController = {
  createHandler: async (
    request: FastifyRequest<{ Params: Params; Body: unknown }>,
    reply: FastifyReply
  ) => {
    const params = paramsSchema.safeParse(request.params);
    const body = generateRefinedAnalysisRequestSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      const issues = [
        ...(!params.success ? params.error.issues : []),
        ...(!body.success ? body.error.issues : []),
      ].map(({ path, message }) => ({ path, message }));
      return reply.code(400).send({ error: "Invalid refined analysis request", issues });
    }
    try {
      const { caseId, region } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      const snapshot = await getRefinedAnalysisInput(
        caseId,
        region,
        body.data.referralQuestions
      );
      // Only the model input is sent. Provenance stays in the stored envelope.
      const analysis = await makeRefinedAnalysis(snapshot.input);
      return reply.send(
        await upsertRefinedAnalysis(caseId, region, snapshot, analysis)
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map(({ path, message }) => ({ path, message }));
        request.log.error({ issues }, "Refined analysis input validation failed");
        return reply.code(500).send({
          error: "Refined analysis input failed validation",
          issues,
        });
      }
      return sendError(error, reply);
    }
  },

  getByCaseIdHandler: async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply
  ) => {
    try {
      const { caseId, region } = paramsSchema.parse(request.params);
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getStoredRefinedAnalysis(caseId, region));
    } catch (error) {
      return sendError(error, reply);
    }
  },
};
