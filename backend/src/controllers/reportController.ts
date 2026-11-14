import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  practiceSettingsSchema,
  saveCaseReportRequestSchema,
  signCaseReportRequestSchema,
} from "@azime/contracts";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { caseExists } from "../queries/caseArtifactQueries.js";
import { makeReportDraft } from "../ai/makeReportDraft.js";
import {
  createCaseReport,
  getLatestCaseReport,
  getCaseReportPdf,
  reopenCaseReport,
  saveCaseReportDraft,
  saveCaseReportEdit,
  signCaseReport,
} from "../queries/caseReportQueries.js";
import {
  getPracticeSettings,
  savePracticeSettings,
} from "../queries/practiceSettingsQueries.js";
import { getUserEmail } from "../tablet.js";
import { getPastMedicalHistory } from "../queries/pastMedicalHistory.js";
import { getReportInput } from "../queries/reportInputQueries.js";

const paramsSchema = z.object({ caseId: z.coerce.number().int().positive() });
const reportParamsSchema = paramsSchema.extend({
  reportId: z.coerce.number().int().positive(),
});
type ReportParams = { Params: { caseId: string; reportId: string } };

// Sign and reopen share the same shape: params, one query, 409 on a refused state.
const reportAction =
  (
    action: (
      caseId: number,
      reportId: number,
      request: FastifyRequest<ReportParams>
    ) => Promise<unknown>,
    failure: string
  ) =>
  async (request: FastifyRequest<ReportParams>, reply: FastifyReply) => {
    const params = reportParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid report request" });
    try {
      return reply.send(
        await action(params.data.caseId, params.data.reportId, request)
      );
    } catch (error) {
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply.code(500).send({ error: failure });
    }
  };

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
  signHandler: reportAction((caseId, reportId, request) => {
    const body = signCaseReportRequestSchema.parse(request.body);
    return signCaseReport(caseId, reportId, body.expectedRevision, getUserEmail(request));
  }, "Signing the report failed"),
  reopenHandler: reportAction(reopenCaseReport, "Reopening the report failed"),
  // Signed: the stored PDF, downloaded. Unsigned: a fresh preview, shown inline.
  pdfHandler: async (request: FastifyRequest<ReportParams>, reply: FastifyReply) => {
    const params = reportParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.code(400).send({ error: "Invalid report request" });
    try {
      const result = await getCaseReportPdf(params.data.caseId, params.data.reportId);
      if (!result) return reply.code(404).send({ error: "Report not found" });
      // ASCII fallback plus the UTF-8 name, so accented patient names survive.
      const ascii = result.filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
      return reply
        .type("application/pdf")
        .header(
          "content-disposition",
          `${result.signed ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`
        )
        .send(result.pdf);
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Building the PDF failed" });
    }
  },
  getPracticeSettingsHandler: async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.send(await getPracticeSettings());
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Loading settings failed" });
    }
  },
  savePracticeSettingsHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    const body = practiceSettingsSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid settings" });
    try {
      return reply.send(await savePracticeSettings(body.data));
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Saving settings failed" });
    }
  },
  editHandler: async (
    request: FastifyRequest<ReportParams>,
    reply: FastifyReply,
  ) => {
    const params = reportParamsSchema.safeParse(request.params);
    const body = saveCaseReportRequestSchema.safeParse(request.body);
    if (!params.success || !body.success)
      return reply.code(400).send({ error: "Invalid report request" });
    try {
      const { caseId, reportId } = params.data;
      return reply.send(await saveCaseReportEdit(caseId, reportId, body.data));
    } catch (error) {
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply.code(500).send({ error: "Saving the report failed" });
    }
  },
  // Assembles the input now, freezes it, then drafts. Refused while anything blocks.
  generateHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string };
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
