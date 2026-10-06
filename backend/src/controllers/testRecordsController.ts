import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { safeParseStoredExtraction } from "../ai/gemini/registry.js";
import { db } from "../db/index.js";
import {
  CaseProviders,
  DiagnosisMentions,
  PatientCase,
  Records,
} from "../db/schema.js";
import { buildDiagnosisMentions } from "../records/diagnosisMentions.js";
import {
  testRecordFixtures,
  testRecordFixtureSummaries,
} from "../records/testRecordFixtures.js";

const createTestRecordSchema = z
  .object({
    caseId: z.number().int().positive(),
    fixtureId: z.string().min(1),
  })
  .strict();

export const testRecordsController = {
  listFixturesHandler: async (_request: FastifyRequest, reply: FastifyReply) =>
    reply.send(testRecordFixtureSummaries),

  createHandler: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = createTestRecordSchema.parse(request.body);
      const fixture = testRecordFixtures.find(
        ({ id }) => id === input.fixtureId,
      );

      if (!fixture) {
        return reply.code(404).send({ error: "Test record fixture not found" });
      }

      const parsedSummary = safeParseStoredExtraction(
        fixture.documentType,
        fixture.summary,
      );

      if (!parsedSummary.success) {
        console.error("Invalid test record fixture", {
          fixtureId: fixture.id,
          issues: parsedSummary.error.issues,
        });
        return reply
          .code(500)
          .send({ error: "Test record fixture is invalid" });
      }

      const record = await db.transaction(async (transaction) => {
        const [patientCase] = await transaction
          .select({ id: PatientCase.id })
          .from(PatientCase)
          .where(eq(PatientCase.id, input.caseId))
          .limit(1);

        if (!patientCase) {
          return null;
        }

        let providerId: string | null = null;
        if (fixture.provider) {
          const [existingProvider] = await transaction
            .select({ id: CaseProviders.id })
            .from(CaseProviders)
            .where(
              and(
                eq(CaseProviders.caseId, input.caseId),
                eq(CaseProviders.name, fixture.provider.name),
                eq(CaseProviders.kind, fixture.provider.kind),
                eq(CaseProviders.discipline, fixture.provider.discipline),
              ),
            )
            .limit(1);

          if (existingProvider) {
            providerId = existingProvider.id;
          } else {
            const [provider] = await transaction
              .insert(CaseProviders)
              .values({ caseId: input.caseId, ...fixture.provider })
              .returning({ id: CaseProviders.id });
            providerId = provider.id;
          }
        }

        const [createdRecord] = await transaction
          .insert(Records)
          .values({
            caseId: input.caseId,
            url: null,
            name: fixture.name,
            providerId,
            documentType: fixture.documentType,
            eventDate: fixture.eventDate,
            metadata: fixture.metadata,
            summary: parsedSummary.data,
            summaryStatus: "completed",
          })
          .returning();

        const diagnosisMentions = buildDiagnosisMentions(
          createdRecord,
          parsedSummary.data,
        );
        if (diagnosisMentions.length > 0) {
          await transaction.insert(DiagnosisMentions).values(diagnosisMentions);
        }

        return createdRecord;
      });

      if (!record) {
        return reply.code(404).send({ error: "Case not found" });
      }

      return reply.code(201).send(record);
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Failed to create test record" });
    }
  },
};
