import { randomUUID } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  PatientCase,
  PatientQuestionnaireInstance,
} from "../db/schema.js";
import {
  getQuestionnaireDefinition,
  type PatientQuestionnaireResponse,
  type QuestionnaireDefinition,
  type QuestionnaireType,
  type TabletQuestionnaireDto,
} from "@azime/contracts";

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

const toClientDefinition = (definition: QuestionnaireDefinition) => ({
  type: definition.type,
  version: definition.version,
  title: definition.title,
  instructions: definition.instructions,
  questions: definition.questions,
});

const parseResponses = (
  responses: unknown,
  definition: QuestionnaireDefinition,
) => {
  if (!Array.isArray(responses)) {
    return null;
  }

  const questionById = new Map(
    definition.questions.map((question) => [question.id, question]),
  );
  const responsesByItem = new Map<string, PatientQuestionnaireResponse>();

  for (const response of responses) {
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
    const question = questionById.get(itemId);

    if (!question || !Number.isInteger(score)) {
      return null;
    }

    const allowedScores = new Set(
      question.options.map((option) => option.value),
    );

    if (!allowedScores.has(score)) {
      return null;
    }

    responsesByItem.set(itemId, { itemId, score });
  }

  return definition.questions
    .map((question) => responsesByItem.get(question.id))
    .filter((response): response is PatientQuestionnaireResponse =>
      Boolean(response),
    );
};

const withDefinition = (questionnaire: PatientQuestionnaireInstance) => {
  const definition = getQuestionnaireDefinition(questionnaire.type);

  return {
    ...questionnaire,
    definition: definition ? toClientDefinition(definition) : null,
  };
};

export const patientQuestionnaireController = {
  listByCaseHandler: async (
    request: FastifyRequest<{ Params: { caseId: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.params.caseId);

    if (!Number.isInteger(caseId)) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    try {
      const questionnaires =
        await db.query.PatientQuestionnaireInstance.findMany({
          where: eq(PatientQuestionnaireInstance.caseId, caseId),
          orderBy: [desc(PatientQuestionnaireInstance.createdAt)],
        });

      return reply.send(questionnaires.map(withDefinition));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch patient questionnaires" });
    }
  },

  listOpenHandler: async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const questionnaires =
        await db.query.PatientQuestionnaireInstance.findMany({
          where: ne(PatientQuestionnaireInstance.status, "completed"),
          orderBy: [desc(PatientQuestionnaireInstance.createdAt)],
          limit: 50,
          with: {
            case: { columns: { patientName: true, patientLastName: true } },
          },
        });

      const result: TabletQuestionnaireDto[] = questionnaires.map((q) => ({
        accessToken: q.accessToken,
        title: getQuestionnaireDefinition(q.type)?.title ?? q.type,
        patientLabel: [q.case.patientName, q.case.patientLastName?.charAt(0)]
          .filter(Boolean)
          .join(" "),
        createdAt: q.createdAt.toISOString(),
      }));

      return reply.send(result);
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch open questionnaires" });
    }
  },

  createHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string };
      Body: {
        type?: QuestionnaireType;
        appointmentId?: number | string | null;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const caseId = Number(request.params.caseId);
    const definition = request.body?.type
      ? getQuestionnaireDefinition(request.body.type)
      : null;

    if (!Number.isInteger(caseId)) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    if (!definition) {
      return reply.code(400).send({ error: "Invalid questionnaire type" });
    }

    try {
      const patientCase = await db.query.PatientCase.findFirst({
        where: eq(PatientCase.id, caseId),
      });

      if (!patientCase) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const [questionnaire] = await db
        .insert(PatientQuestionnaireInstance)
        .values({
          caseId,
          appointmentId: normalizeAppointmentId(request.body?.appointmentId),
          type: definition.type,
          accessToken: randomUUID(),
          instrumentVersion: definition.version,
        })
        .returning();

      return reply.code(201).send(withDefinition(questionnaire));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to create patient questionnaire" });
    }
  },

  getByAccessTokenHandler: async (
    request: FastifyRequest<{ Params: { accessToken: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const questionnaire =
        await db.query.PatientQuestionnaireInstance.findFirst({
          where: eq(
            PatientQuestionnaireInstance.accessToken,
            request.params.accessToken,
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
        ...withDefinition(questionnaire),
        patientCase,
      });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch patient questionnaire" });
    }
  },

  submitHandler: async (
    request: FastifyRequest<{
      Params: { accessToken: string };
      Body: { responses?: unknown };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const questionnaire =
        await db.query.PatientQuestionnaireInstance.findFirst({
          where: eq(
            PatientQuestionnaireInstance.accessToken,
            request.params.accessToken,
          ),
        });

      if (!questionnaire) {
        return reply.code(404).send({ error: "Questionnaire not found" });
      }

      const definition = getQuestionnaireDefinition(questionnaire.type);

      if (!definition) {
        return reply.code(400).send({ error: "Invalid questionnaire type" });
      }

      const responses = parseResponses(request.body?.responses, definition);

      if (!responses || responses.length === 0) {
        return reply
          .code(400)
          .send({ error: "Submit at least one questionnaire response" });
      }

      const [updatedQuestionnaire] = await db
        .update(PatientQuestionnaireInstance)
        .set({
          responses,
          scores: definition.scoreResponses(responses),
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          eq(
            PatientQuestionnaireInstance.accessToken,
            request.params.accessToken,
          ),
        )
        .returning();

      return reply.send(withDefinition(updatedQuestionnaire));
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to submit patient questionnaire" });
    }
  },

  deleteHandler: async (
    request: FastifyRequest<{ Params: { questionnaireId: string } }>,
    reply: FastifyReply,
  ) => {
    const questionnaireId = Number(request.params.questionnaireId);

    if (!Number.isInteger(questionnaireId)) {
      return reply.code(400).send({ error: "Invalid questionnaire id" });
    }

    try {
      const questionnaire =
        await db.query.PatientQuestionnaireInstance.findFirst({
          where: eq(PatientQuestionnaireInstance.id, questionnaireId),
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
        .delete(PatientQuestionnaireInstance)
        .where(eq(PatientQuestionnaireInstance.id, questionnaireId));

      return reply.send({ questionnaireId, deleted: true });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to delete patient questionnaire" });
    }
  },
};
