import type { FastifyReply, FastifyRequest } from "fastify";
import {
  analyzeAddedDiagnosisRequestSchema,
  preExamSnapshotRequestSchema,
  supportedRegions,
  type Region,
} from "@azime/contracts";
import { makePreExamAnalysis } from "../ai/makePreExamAnalysis.js";
import { makePreExamDelta } from "../ai/makePreExamDelta.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { NotImplementedError } from "../errors/notImplementedError.js";
import {
  caseExists,
  getDocumentExtractionArtifacts,
} from "../queries/caseArtifactQueries.js";

import { getLadderEntries } from "../queries/ladderEntries.js";
import {
  applyPreExamDelta,
  getPreExamSnapshot,
  getStoredPreExamSnapshot,
  getStoredPreExamAnalysis,
  upsertPreExamAnalysis,
  upsertPreExamSnapshot,
} from "../queries/preExamAnalysisQueries.js";
import {
  getPreExamInputSnapshot,
  getRegionDiagnoses,
} from "../queries/preExamInputSnapshotQueries.js";
import { getRegionDiagnosisList } from "../queries/regionDiagnosesQueries.js";

const parseCaseId = (value: string) => {
  const caseId = Number(value);
  return Number.isInteger(caseId) && caseId > 0 ? caseId : null;
};

const parseRegion = (value: string): Region | null =>
  supportedRegions.some((region) => region.value === value)
    ? (value as Region)
    : null;

export const preExamAnalysisController = {
  getSnapshotHandler: async (
    request: FastifyRequest<{ Params: { caseId: string; region: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }
    if (!region) {
      return reply.code(400).send({ error: "Invalid region" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      // Available diagnoses come from the records, so ones left out of the
      // current snapshot can still be selected again.
      const [inputSnapshot, availableDiagnoses] = await Promise.all([
        getStoredPreExamSnapshot(caseId, region),
        getRegionDiagnoses(caseId, region),
      ]);

      return reply.send({ caseId, region, inputSnapshot, availableDiagnoses });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch pre-exam input snapshot" });
    }
  },

  createHandler: async (
    request: FastifyRequest<{ Params: { caseId: string; region: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);
    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }
    if (!region) {
      return reply.code(400).send({ error: "Invalid region" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const snapshotInput = await getPreExamSnapshot(caseId, region);

      if (!snapshotInput) {
        return reply.code(409).send({
          error:
            "Take a pre-exam input snapshot before generating the analysis",
        });
      }

      const analysis = await makePreExamAnalysis(snapshotInput, region);

      const preExamAnalysisId = await upsertPreExamAnalysis(
        caseId,
        region,
        analysis,
      );

      return reply.send({
        caseId,
        region,
        analysis,
        storage: {
          preExamAnalysisId,
        },
      });
    } catch (error) {
      if (error instanceof NotImplementedError) {
        return reply.code(501).send({ error: error.message });
      }

      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to generate pre-exam analysis" });
    }
  },

  // Treatment analysis for one listed diagnosis the run doesn't cover, merged into the
  // existing rows so steering survives. A new snapshot + run stays the full redo.
  analyzeAddedDiagnosisHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string; region: string };
      Body: unknown;
    }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);
    const body = analyzeAddedDiagnosisRequestSchema.safeParse(request.body);
    if (!caseId) return reply.code(400).send({ error: "Invalid case id" });
    if (!region) return reply.code(400).send({ error: "Invalid region" });
    if (!body.success) return reply.code(400).send({ error: "Invalid request" });
    const { canonicalDx } = body.data;

    try {
      const stored = await getStoredPreExamAnalysis(caseId, region);
      if (!stored?.analysis || !stored.inputSnapshot)
        return reply
          .code(409)
          .send({ error: "Run the treatment analysis before adding diagnoses to it" });
      const list = await getRegionDiagnosisList(caseId, region);
      if (!list.diagnoses.some((d) => d.canonicalDx === canonicalDx))
        return reply.code(400).send({ error: "Diagnosis is not on the region's list" });
      if (stored.inputSnapshot.scope.diagnoses.includes(canonicalDx))
        return reply.code(409).send({ error: "Diagnosis is already analyzed" });

      const merged = await makePreExamDelta(
        stored.inputSnapshot,
        stored.analysis,
        region,
        canonicalDx,
        await getLadderEntries(region, [canonicalDx]),
      );
      const preExamAnalysisId = await applyPreExamDelta(
        caseId,
        region,
        stored.updatedAt,
        merged.analysis,
        merged.snapshot,
        merged.reassessed,
      );
      return reply.send({ caseId, region, storage: { preExamAnalysisId } });
    } catch (error) {
      if (error instanceof MissingPrerequisiteError)
        return reply.code(409).send({ error: error.message });
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to analyze the added diagnosis" });
    }
  },

  takeSnapshotHandler: async (
    request: FastifyRequest<{
      Params: { caseId: string; region: string };
      Body: unknown;
    }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }

    if (!region) {
      return reply.code(400).send({ error: "Invalid region" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const extractionArtifacts = await getDocumentExtractionArtifacts(caseId);

      if (extractionArtifacts.length === 0) {
        return reply.code(400).send({
          error: "No completed record extractions found for this case",
        });
      }
      const requestBody = preExamSnapshotRequestSchema.safeParse(
        request.body ?? {},
      );

      if (!requestBody.success) {
        return reply.code(400).send({ error: "Invalid snapshot request" });
      }

      const inputSnapshot = await getPreExamInputSnapshot(
        caseId,
        region,
        extractionArtifacts,
        // Every listed diagnosis, not supported ones too: their treatment history still counts.
        requestBody.data.selectedDiagnoses ??
          (await getRegionDiagnosisList(caseId, region)).diagnoses.map(
            (d) => d.canonicalDx,
          ),
      );

      if (!inputSnapshot) {
        return reply
          .code(400)
          .send({ error: "Region is not in scope for this case" });
      }

      const preExamAnalysisId = await upsertPreExamSnapshot(
        caseId,
        region,
        inputSnapshot,
      );

      return reply.send({
        caseId,
        region,
        inputSnapshot,
        storage: {
          preExamAnalysisId,
        },
      });
    } catch (error) {
      if (error instanceof NotImplementedError) {
        return reply.code(501).send({ error: error.message });
      }

      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to take pre-exam input snapshot" });
    }
  },

  getByCaseIdHandler: async (
    request: FastifyRequest<{ Params: { caseId: string; region: string } }>,
    reply: FastifyReply,
  ) => {
    const caseId = parseCaseId(request.params.caseId);
    const region = parseRegion(request.params.region);

    if (!caseId) {
      return reply.code(400).send({ error: "Invalid case id" });
    }
    if (!region) {
      return reply.code(400).send({ error: "Invalid region" });
    }

    try {
      if (!(await caseExists(caseId))) {
        return reply.code(404).send({ error: "Case not found" });
      }

      const stored = await getStoredPreExamAnalysis(caseId, region);

      if (!stored) {
        return reply.send(null);
      }

      const { inputSnapshot, ...rest } = stored;
      return reply.send({
        ...rest,
        hasInputSnapshot: inputSnapshot !== null,
        analyzedDiagnoses: inputSnapshot?.scope.diagnoses ?? [],
      });
    } catch (error) {
      console.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to fetch pre-exam analysis" });
    }
  },
};
