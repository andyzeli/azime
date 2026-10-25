import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { regionSchema } from "@azime/contracts";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { getAmaRegionRating } from "../queries/amaRatingQueries.js";

const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
  region: regionSchema,
});

export const amaRatingController = {
  getHandler: async (
    request: FastifyRequest<{ Params: { caseId: string; region: string } }>,
    reply: FastifyReply,
  ) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid AMA rating request" });
    try {
      const { caseId, region } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getAmaRegionRating(caseId, region));
    } catch (error) {
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply.code(500).send({ error: "AMA rating failed" });
    }
  },
};
