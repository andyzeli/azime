import { Records } from "../db/schema.js";
import { getGcsFileUri } from "../storage/googleCloudStorage.js";
import { getGeminiClient, getGeminiModelName } from "./client.js";
import {
  buildExtractionUserPrompt,
  extractionSystemPrompt,
} from "./prompts.js";
import {
  geminiRecordSummaryPayloadSchema,
  geminiRecordSummaryResponseSchema,
  storedRecordSummarySchema,
} from "./schemas.js";
import { StoredRecordSummary } from "./types.js";
import { ZodError } from "zod";

export const summarizeRecord = async (
  record: Records,
): Promise<StoredRecordSummary> => {
  if (!record.url) {
    throw new Error("Record is missing a storage object key");
  }

  const client = getGeminiClient();
  const prompt = buildExtractionUserPrompt(record);
  const fileUri = getGcsFileUri(record.url);

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
      systemInstruction: extractionSystemPrompt,
      responseMimeType: "application/json",
      responseSchema: geminiRecordSummaryResponseSchema,
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

  let payload: ReturnType<typeof geminiRecordSummaryPayloadSchema.parse>;

  try {
    payload = geminiRecordSummaryPayloadSchema.parse(parsedJson);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Gemini JSON failed payload validation:", error.flatten());
      console.error("Gemini parsed JSON:", parsedJson);
      throw new Error("Gemini JSON did not match the expected payload schema");
    }

    throw error;
  }

  try {
    return storedRecordSummarySchema.parse({
      ...payload,
      schemaVersion: "v1",
      sourceMetadata: {
        recordId: record.id,
        fileName: record.name ?? "",
        providerName: record.providerName ?? "",
        documentType: record.documentType ?? "",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Stored summary failed validation:", error.flatten());
      console.error("Stored summary candidate:", payload);
      throw new Error("Validated Gemini payload failed stored-summary schema");
    }

    throw error;
  }
};
