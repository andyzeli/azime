import { randomUUID } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  PainDisabilityQuestionnaire,
  PainDisabilityQuestionnaireResponse,
  PatientCase,
} from "../db/schema.js";

const neckItemIds = [
  "reading",
  "headaches",
  "concentration",
  "work_usual_activity",
  "lifting",
  "personal_care",
  "pain_intensity",
  "driving",
  "sleep",
  "recreation_social", //
];
const lowBackIds = [
  "walking",
  "sitting",
  "standing",
  "work_usual_activity",
  "lifting",
  "personal_care",
  "pain_intensity",
  "sex",
  "social",
  "travel", //
];
const pdq = [
  "work_usual_activity",
  "lifting_high",
  "lifting_low",
  "personal_care",
  "sit_stand",
  "travel",
  "walk_run",
  "income",
  "meds",
  "see_doctor_more",
  "seeing_friend_family",
  "recreation",
  "adl_help",
  "mood",
  "emotions",
];
// const functionalItemIds = [
//   "home_responsibilities",
//   "errands_transportation",
//   "lifting",
//   "sitting",
//   "standing",
//   "walking",
//   "personal_care",
//   "recreation_social", //sex, social, travel
//   "work_usual_activity",
//   "pain_intensity",
// ];
// //psycho social
// //functional
// const psychosocialItemIds = [
//   "sleep",
//   "mood",
//   "stress",
//   "concentration",
//   "relationships",
//   "enjoyment",
// ];

const validItemIds = new Set([...neckItemIds, ...lowBackIds, ...pdq]);

const normalizeAppointmentId = (appointmentId: unknown) => {
  if (
    appointmentId === undefined ||
    appointmentId === null ||
    appointmentId === ""
  ) {
    return null;
  }

  const parsed = Number(appointmentId);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseResponses = (responses: unknown) => {
  if (!Array.isArray(responses)) {
    return null;
  }

  const normalized = responses.map((response) => {
    if (
      typeof response !== "object" ||
      response === null ||
      !("itemId" in response) ||
      !("score" in response)
    ) {
      return null;
    }

    const itemId = String(response.itemId);
    const score = Number(response.score);

    if (
      !validItemIds.has(itemId) ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 10
    ) {
      return null;
    }

    return { itemId, score };
  });

  if (normalized.some((response) => response === null)) {
    return null;
  }

  const responsesByItem = new Map(
    normalized.map((response) => [
      response!.itemId,
      response as PainDisabilityQuestionnaireResponse,
    ])
  );

  if (responsesByItem.size !== validItemIds.size) {
    return null;
  }

  return [...validItemIds].map((itemId) => responsesByItem.get(itemId)!);
};

const scoreResponses = (responses: PainDisabilityQuestionnaireResponse[]) => {
  const score = responses.reduce(
    (total, response) => total + (response?.score ?? 0),
    0
  );
  const denominator = responses.filter(
    (response) => response?.score !== undefined
  ).length;

  return {
    totalScore: score,
    denominator: denominator,
  };
};

export const painDisabilityQuestionnaireController = {
  listByCaseHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply
  ) => {
    const caseId = Number(request.params.caseId);

    if (!Number.isInteger(caseId)) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      const questionnaires =
        await db.query.PainDisabilityQuestionnaire.findMany({
          where: eq(PainDisabilityQuestionnaire.caseId, caseId),
          orderBy: [desc(PainDisabilityQuestionnaire.createdAt)],
        });

      return reply.send(questionnaires);
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch pain disability questionnaires" });
    }
  },

  createHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string };
      Body: { appointmentId?: number | string | null };
    }>,
    reply: FastifyReply
  ) => {
    const caseId = Number(request.params.caseId);

    if (!Number.isInteger(caseId)) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      const patientCase = await db.query.PatientCase.findFirst({
        where: eq(PatientCase.id, caseId),
      });

      if (!patientCase) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const [questionnaire] = await db
        .insert(PainDisabilityQuestionnaire)
        .values({
          caseId,
          appointmentId: normalizeAppointmentId(request.body?.appointmentId),
          accessToken: randomUUID(),
        })
        .returning();

      return reply.code(201).send(questionnaire);
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to create pain disability questionnaire" });
    }
  },

  getByAccessTokenHandler: async (
    request: FastifyRequest<{ Params: { accessToken: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const questionnaire =
        await db.query.PainDisabilityQuestionnaire.findFirst({
          where: eq(
            PainDisabilityQuestionnaire.accessToken,
            request.params.accessToken
          ),
        });

      if (!questionnaire) {
        return reply.code(404).send({ error: "Questionnaire not found" });
      }

      const patientCase = await db.query.PatientCase.findFirst({
        where: eq(PatientCase.id, questionnaire.caseId),
        columns: {
          id: true,
          patientName: true,
          patientLastName: true,
        },
      });

      return reply.send({
        ...questionnaire,
        patientCase,
      });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch pain disability questionnaire" });
    }
  },

  submitHandler: async (
    request: FastifyRequest<{
      Params: { accessToken: string };
      Body: { responses?: unknown };
    }>,
    reply: FastifyReply
  ) => {
    const responses = parseResponses(request.body?.responses);

    if (!responses) {
      return reply
        .code(400)
        .send({ error: "Responses must include one 0-10 score for each item" });
    }

    try {
      const questionnaire =
        await db.query.PainDisabilityQuestionnaire.findFirst({
          where: eq(
            PainDisabilityQuestionnaire.accessToken,
            request.params.accessToken
          ),
        });

      if (!questionnaire) {
        return reply.code(404).send({ error: "Questionnaire not found" });
      }

      const scores = scoreResponses(responses);
      const [updatedQuestionnaire] = await db
        .update(PainDisabilityQuestionnaire)
        .set({
          responses,
          ...scores,
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          eq(
            PainDisabilityQuestionnaire.accessToken,
            request.params.accessToken
          )
        )
        .returning();

      return reply.send(updatedQuestionnaire);
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to submit pain disability questionnaire" });
    }
  },

  deleteHandler: async (
    request: FastifyRequest<{ Params: { questionnaireId: string } }>,
    reply: FastifyReply
  ) => {
    const questionnaireId = Number(request.params.questionnaireId);

    if (!Number.isInteger(questionnaireId)) {
      return reply.code(400).send({ error: "Invalid questionnaire id" });
    }

    try {
      const questionnaire =
        await db.query.PainDisabilityQuestionnaire.findFirst({
          where: eq(PainDisabilityQuestionnaire.id, questionnaireId),
        });

      if (!questionnaire) {
        return reply.code(404).send({ error: "Questionnaire not found" });
      }

      if (questionnaire.status === "completed") {
        return reply
          .code(409)
          .send({ error: "Completed questionnaires cannot be deleted" });
      }

      await db
        .delete(PainDisabilityQuestionnaire)
        .where(eq(PainDisabilityQuestionnaire.id, questionnaireId));

      return reply.send({ questionnaireId, deleted: true });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to delete pain disability questionnaire" });
    }
  },
};
