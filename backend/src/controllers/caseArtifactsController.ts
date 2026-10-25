import type { FastifyReply, FastifyRequest } from "fastify";
import {
  caseArtifactTypeSchema,
  caseExists,
  getCaseArtifact,
  getCaseArtifactBundle,
} from "../queries/caseArtifactQueries.js";

import { NotImplementedError } from "../errors/notImplementedError.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

export const caseArtifactsController = {
  getArtifactHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string; artifactType: string };
    }>,
    reply: FastifyReply
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const artifactType = caseArtifactTypeSchema.safeParse(
      request.params.artifactType
    );

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    if (!artifactType.success) {
      return reply.code(400).send({
        error: 'Artifact type must be "document-extractions" or "case-summary"',
      });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      return reply.send(await getCaseArtifact(caseId, artifactType.data));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to fetch case artifact" });
    }
  },
};
//   getDeterministicSignalsHandler: async (
//     request: FastifyRequest<{ Params: { caseId: string } }>,
//     reply: FastifyReply,
//   ) => {
//     const caseId = parseCaseId(request.params.caseId);

//     if (!caseId) {
//       return reply.code(400).send({ error: "Invalid case id" });
//     }

//     try {
//       if (!(await caseExists(caseId))) {
//         return reply.code(404).send({ error: "Case not found" });
//       }

//       const artifacts = await getCaseArtifactBundle(caseId);

//       return reply.send({ caseId, signals });
//     } catch (error) {
//       if (error instanceof NotImplementedError) {
//         return reply.code(501).send({ error: error.message });
//       }

//       console.error(error);
//       return reply
//         .code(500)
//         .send({ error: "Failed to calculate deterministic signals" });
//     }
//   },
// };
