import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { amaCandidatesRequestSchema, regionSchema } from "@azime/contracts";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import {
  getAmaCandidates,
  OutOfScopeDiagnosisError,
} from "../queries/amaCandidatesQueries.js";

const paramsSchema = z.object({
  caseId: z.coerce.number().int().positive(),
  region: regionSchema,
});

export const amaCandidatesController = {
  // Read-only: a POST only so the Visit can preview unsaved root changes.
  getHandler: async (
    request: FastifyRequest<{ Params: { caseId: string; region: string }; Body: unknown }>,
    reply: FastifyReply,
  ) => {
    const params = paramsSchema.safeParse(request.params);
    const body = amaCandidatesRequestSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "Invalid AMA candidates request" });
    }
    try {
      const { caseId, region } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getAmaCandidates(caseId, region, body.data.diagnoses));
    } catch (error) {
      if (error instanceof OutOfScopeDiagnosisError)
        return reply.code(400).send({ error: error.message });
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply.code(500).send({ error: "AMA candidate lookup failed" });
    }
  },
};
