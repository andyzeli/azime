import { Records } from "../../db/schema.js";
import { getGcsFileUri } from "../../storage/googleCloudStorage.js";
import { getGeminiClient, getGeminiModelName } from "./client.js";
import type { DocumentType } from "../../records/documentMetadata.js";
import { buildExtractionPrompt } from "./buildExtraction.js";
import {
  createStoredSchema,
  getExtractionConfig,
  type StoredExtraction,
} from "./registry.js";
//import { StoredRecordSummary } from "./types.js";
import { ZodError, z } from "zod";

export const summarizeRecord = async <T extends DocumentType>(
  record: Records & { documentType: T },
): Promise<StoredExtraction<T>> => {
  if (!record.url) {
    throw new Error("Record is missing a storage object key");
  }

  const client = getGeminiClient();
  const prompt = buildExtractionPrompt({
    documentType: record.documentType as DocumentType,
    date: record.eventDate ?? null,
    documentMetadata: record.metadata ?? null,
  });
  const fileUri = getGcsFileUri(record.url);

  const config = getExtractionConfig(record.documentType as DocumentType);
  const storedSchema = createStoredSchema(config.schema);

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

//export type StoredRecordSummary = z.infer<typeof storedSchema>;
