import { and, eq, inArray } from "drizzle-orm";
import {
  postExamPDQSchema,
  refinedAnalysisResponseSchema,
  type Region,
} from "@azime/contracts";
import { db } from "../db/index.js";
import {
  CasePostExamAnalysis,
  CaseRefinedPreExamAnalysis,
  CaseVisitDocumentation,
  PatientQuestionnaireInstance,
} from "../db/schema.js";
import { buildPostExamInputSnapshot } from "../ai/postExamInputSnapshot.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { getQuestionnaireDefinition } from "../questionnaires/definitions.js";
import { toVisitDocumentationResponse } from "./visitDocumentationQueries.js";

import { toPostExamAnalysisResponse } from "./postExamAnalysisQueries.js";

// Freeze question wording/options with responses so scores stay interpretable.
function freezeQuestionnaire(row: PatientQuestionnaireInstance) {
  const definition = getQuestionnaireDefinition(row.type);
  if (row.status !== "completed" || !row.completedAt || !row.scores)
    throw new MissingPrerequisiteError(
      "Only completed questionnaires can be included in the visit",
    );
  if (!definition || definition.version !== row.instrumentVersion)
    throw new MissingPrerequisiteError(
      "The questionnaire definition is unavailable for this version",
    );
  return {
    title: definition.title,
    data: postExamPDQSchema.parse({
      instrumentVersion: row.instrumentVersion,
      completedAt: row.completedAt.toISOString(),
      questions: definition.questions,
      responses: row.responses,
      scores: row.scores,
    }),
  };
}

// The PDQ and other questionnaires come from the case's visit documentation.
export async function createPostExamInputSnapshot(
  caseId: number,
  region: Region,
) {
  // Capture a coherent version of independently editable visit/PDQ artifacts.
  return db.transaction(
    async (tx) => {
      const visit = await tx.query.CaseVisitDocumentation.findFirst({
        where: eq(CaseVisitDocumentation.caseId, caseId),
      });
      if (!visit)
        throw new MissingPrerequisiteError(
          "Save the visit before taking a post-exam snapshot",
        );
      const refined = await tx.query.CaseRefinedPreExamAnalysis.findFirst({
        where: and(
          eq(CaseRefinedPreExamAnalysis.caseId, caseId),
          eq(CaseRefinedPreExamAnalysis.region, region),
        ),
      });
      if (!refined)
        throw new MissingPrerequisiteError(
          "Generate exam prep for this region before the post-exam analysis",
        );

      const { pdqId, includedQuestionnaireIds } = visit.documentation;
      const ids = [...(pdqId === null ? [] : [pdqId]), ...includedQuestionnaireIds];
      const rows = ids.length
        ? await tx.query.PatientQuestionnaireInstance.findMany({
            where: and(
              eq(PatientQuestionnaireInstance.caseId, caseId),
              inArray(PatientQuestionnaireInstance.id, ids),
            ),
          })
        : [];
      const byId = new Map(rows.map((row) => [row.id, row]));

      let pdq = null;
      if (pdqId !== null) {
        const row = byId.get(pdqId);
        if (!row || row.type !== "pain_disability")
          throw new MissingPrerequisiteError(
            "The visit's PDQ is not a pain disability questionnaire for this case",
          );
        pdq = {
          id: row.id,
          caseId: row.caseId,
          updatedAt: row.updatedAt.toISOString(),
          data: freezeQuestionnaire(row).data,
        };
      }
      const questionnaires = includedQuestionnaireIds.map((id) => {
        const row = byId.get(id);
        if (!row)
          throw new MissingPrerequisiteError(
            "An included questionnaire does not belong to this case",
          );
        const { title, data } = freezeQuestionnaire(row);
        return { ...data, type: row.type, title };
      });

      const inputSnapshot = buildPostExamInputSnapshot({
        visit: toVisitDocumentationResponse(visit),
        refined: refinedAnalysisResponseSchema.parse({
          ...refined,
          createdAt: refined.createdAt.toISOString(),
          updatedAt: refined.updatedAt.toISOString(),
        }),
        pdq,
        questionnaires,
      });
      const [saved] = await tx
        .insert(CasePostExamAnalysis)
        .values({ caseId, region, inputSnapshot })
        .returning();
      return toPostExamAnalysisResponse(saved!);
    },
    { isolationLevel: "repeatable read" },
  );
}
