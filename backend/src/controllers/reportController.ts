import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { makeReportDraft } from "../ai/makeReportDraft.js";
import { buildReportDraftRequest } from "../ai/reportDraftPrompt.js";
import {
  createCaseReport,
  getLatestCaseReport,
  saveCaseReportDraft,
} from "../queries/caseReportQueries.js";
import { getPastMedicalHistory } from "../queries/pastMedicalHistory.js";
import { getReportInput } from "../queries/reportInputQueries.js";

const paramsSchema = z.object({ caseId: z.coerce.number().int().positive() });

export const reportController = {
  getInputHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid report request" });
    try {
      const { caseId } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getReportInput(caseId));
    } catch (error) {
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply.code(500).send({ error: "Report input failed" });
    }
  },
  getLatestHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid report request" });
    try {
      const { caseId } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getLatestCaseReport(caseId));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Report request failed" });
    }
  },
  // Assembles the input now, freezes it, then drafts. Refused while anything blocks.
  generateHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string };
      Querystring: { dryRun?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid report request" });
    try {
      const { caseId } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      const { input, blockers } = await getReportInput(caseId);
      if (!input)
        return reply
          .code(409)
          .send({
            error: blockers[0]?.message ?? "The report input is incomplete",
          });
      // Inspection returns the same prompts without calling the model or saving a report.
      if (request.query.dryRun)
        return reply.send(buildReportDraftRequest(input));
      const row = await createCaseReport(caseId, input);
      const { report, source } = await makeReportDraft(input);
      return reply.send(await saveCaseReportDraft(row.id, report, source));
    } catch (error) {
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply.code(500).send({ error: "Report drafting failed" });
    }
  },
  // Shown beside the causation questions.
  getPastMedicalHistoryHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid request" });
    try {
      const { caseId } = params.data;
      if (!(await caseExists(caseId)))
        return reply.code(404).send({ error: "Case not found" });
      return reply.send(await getPastMedicalHistory(caseId));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Past medical history failed" });
    }
  },
};
