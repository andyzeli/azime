import type { FastifyReply, FastifyRequest } from "fastify";
import { regionSchema } from "@azime/contracts";
import { getCanonicalDiagnoses } from "../queries/canonicalDiagnosesQueries.js";

export const canonicalDiagnosesController = {
  getByRegionHandler: async (
    request: FastifyRequest<{ Params: { region: string } }>,
    reply: FastifyReply,
  ) => {
    const region = regionSchema.safeParse(request.params.region);
    if (!region.success) return reply.code(400).send({ error: "Invalid region" });
    try {
      return reply.send(await getCanonicalDiagnoses(region.data));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to fetch diagnoses" });
    }
  },
};
