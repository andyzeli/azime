import { getGeminiThinkingConfig } from "../reasoningConfig.js";
import { CanonicalDiagnoses, PatientCase, Records } from "../../db/schema.js";
import { db } from "../../db/index.js";
import { asc, eq, inArray } from "drizzle-orm";
import { getGcsFileUri } from "../../storage/googleCloudStorage.js";
import { getGeminiClient, getGeminiModelName } from "./client.js";
import type { DocumentType, StoredExtraction } from "@azime/contracts";
import { buildExtractionPrompt } from "./buildExtraction.js";
import {
  createStoredSchema,
  getExtractionConfig,
  type DiagnosisExtractionContext,
} from "./registry.js";
//import { StoredRecordSummary } from "./types.js";
import { ZodError, z } from "zod";

export const summarizeRecord = async <T extends DocumentType>(
  record: Records & { documentType: T },
): Promise<StoredExtraction<T>> => {
  if (!record.url) {
    throw new Error("Record is missing a storage object key");
  }

  if (!record.caseId) {
    throw new Error("Record is missing a case id");
  }

  const usesDiagnosisContext =
    record.documentType === "encounter" ||
    record.documentType === "surgery_report";
  const usesRegionContext =
    usesDiagnosisContext ||
    record.documentType === "intervention_report" ||
    record.documentType === "therapy_note";
  const caseRegions = usesRegionContext
    ? await getCaseRegions(record.caseId)
    : [];
  const context = usesDiagnosisContext
    ? await getDiagnosisExtractionContext(record.caseId, caseRegions)
    : undefined;

  const config = getExtractionConfig(
    record.documentType as DocumentType,
    caseRegions,
    context,
  );

  const client = getGeminiClient();
  const prompt = buildExtractionPrompt({
    documentType: record.documentType as DocumentType,
    date: record.eventDate ?? null,
    documentMetadata: record.metadata ?? null,
    diagnosisContext: context,
    caseRegions: usesRegionContext ? caseRegions : undefined,
  });
  const fileUri = getGcsFileUri(record.url);

  const storedSchema = createStoredSchema(config.schema, record.documentType);

  const respJsonSchema = toGeminiResponseSchema(config.schema);

  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: [
      {
        fileData: {
          fileUri,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ],
    config: {
      systemInstruction: config.systemPrompt,
      responseMimeType: "application/json",
      responseSchema: respJsonSchema,
      temperature: 0.1,
      thinkingConfig: getGeminiThinkingConfig("GEMINI"),
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini raw response was not valid JSON:", response.text);
    throw new Error("Gemini returned invalid JSON");
  }

  let payload: ReturnType<typeof config.schema.parse>;

  try {
    payload = config.schema.parse(parsedJson);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Gemini JSON failed payload validation:", error.flatten());
      console.error("Gemini parsed JSON:", parsedJson);
      throw new Error("Gemini JSON did not match the expected payload schema");
    }

    throw error;
  }
  try {
    return storedSchema.parse({
      ...payload,
      schemaVersion: "v1",
    }) as StoredExtraction<T>;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Stored summary failed validation:", error.flatten());
      console.error("Stored summary candidate:", payload);
      throw new Error("Validated Gemini payload failed stored-summary schema");
    }

    throw error;
  }
};

function toGeminiResponseSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema);
}

async function getCaseRegions(caseId: number): Promise<string[]> {
  const patientCase = await db.query.PatientCase.findFirst({
    columns: { regions: true },
    where: eq(PatientCase.id, caseId),
  });

  if (!patientCase) {
    throw new Error(`Case ${caseId} was not found`);
  }

  if (patientCase.regions.length === 0) {
    throw new Error(`Case ${caseId} has no regions configured`);
  }

  return patientCase.regions;
}

async function getDiagnosisExtractionContext(
  caseId: number,
  caseRegions: string[],
): Promise<DiagnosisExtractionContext> {
  const canonicalDiagnoses = await db
    .select({
      id: CanonicalDiagnoses.id,
      regionId: CanonicalDiagnoses.regionId,
      label: CanonicalDiagnoses.label,
      definition: CanonicalDiagnoses.definition,
      icdPrefixes: CanonicalDiagnoses.icdPrefixes,
    })
    .from(CanonicalDiagnoses)
    .where(inArray(CanonicalDiagnoses.regionId, caseRegions))
    .orderBy(asc(CanonicalDiagnoses.regionId), asc(CanonicalDiagnoses.label));

  if (canonicalDiagnoses.length === 0) {
    throw new Error(
      `No canonical diagnoses are configured for case ${caseId}'s regions`,
    );
  }

  return { canonicalDiagnoses };
}

//export type StoredRecordSummary = z.infer<typeof storedSchema>;
