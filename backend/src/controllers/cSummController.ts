import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import {
  NewPatientCase,
  PatientCase,
  CaseRecordsSummary,
  NewCaseRecordsSummary,
} from "../db/schema.js";
import { eq } from "drizzle-orm";

export const caseSummaryController = {
  newHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as NewCaseRecordsSummary;
    try {
      const c = await db.insert(CaseRecordsSummary).values(data);
      reply.send({ success: true, data: c });
    } catch (error) {
      console.error(error);
      reply.send({ success: false, error: error });
    }
  },

  deleteHandler: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    console.log("deleteHandler");
    console.log(request.params.id, "is the summaryId");
    const id = Number(request.params.id);
    try {
      const res = await db
        .delete(CaseRecordsSummary)
        .where(eq(CaseRecordsSummary.id, id));
      reply.send({ success: true, data: res });
    } catch (error) {
      console.error(error);
      reply.send({ success: false, error: error });
    }
  },

  //   updateHandler: async (request: FastifyRequest, reply: FastifyReply) => {
  //     const data = request.body as NewPatientCase;
  //     try {
  //       const contact = await db.insert(PatientCase).values(data);
  //       reply.send({ success: true, data: contact });
  //     } catch (error) {
  //       console.error(error);
  //       reply.send({ success: false, error: error });
  //     }
  //   },
  getByIdHandler: async (
    request: FastifyRequest<{ Querystring: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.query.caseId);
    try {
      const summaries = await db.query.CaseRecordsSummary.findMany({
        where: eq(CaseRecordsSummary.caseId, caseId),
      });
      return reply.send(summaries);
    } catch (error) {
      console.error(error);
      return reply.send({ success: false, error: error });
    }
  },
};
//getByIdForPipeline -> find the main summary, extractfactstojson. call next stage: getNote and Qs, call drafter. then call verifier. the final report writer.
