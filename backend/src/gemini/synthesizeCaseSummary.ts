import { ZodError } from "zod";
import { getGeminiClient, getGeminiModelName } from "./client.js";
import {
  buildSynthesisUserPrompt,
  synthesisSystemPrompt,
} from "./prompts.js";
import {
  geminiAggregateSummaryPayloadSchema,
  geminiAggregateSummaryResponseSchema,
  storedAggregateSummarySchema,
} from "./schemas.js";
import type { AggregateSummaryInput, StoredAggregateSummary } from "./types.js";

export const synthesizeCaseSummary = async (
  aggregateInput: AggregateSummaryInput,
): Promise<StoredAggregateSummary> => {
  const client = getGeminiClient();
  const prompt = buildSynthesisUserPrompt(aggregateInput);

  const response = await client.models.generateContent({
    model: getGeminiModelName(),
    contents: [prompt],
    config: {
      systemInstruction: synthesisSystemPrompt,
      responseMimeType: "application/json",
      responseSchema: geminiAggregateSummaryResponseSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty aggregate summary response");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch (error) {
    console.error(
      "Gemini aggregate summary raw response was not valid JSON:",
      response.text,
    );
    throw new Error("Gemini returned invalid aggregate summary JSON");
  }

  let payload: ReturnType<typeof geminiAggregateSummaryPayloadSchema.parse>;

  try {
    payload = geminiAggregateSummaryPayloadSchema.parse(parsedJson);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        "Gemini aggregate summary JSON failed payload validation:",
        error.flatten(),
      );
      console.error("Gemini aggregate summary parsed JSON:", parsedJson);
      throw new Error(
        "Gemini aggregate summary JSON did not match the expected payload schema",
      );
    }

    throw error;
  }

  try {
    return storedAggregateSummarySchema.parse({
      ...payload,
      schemaVersion: "draft-v1",
      sourceMetadata: {
        caseId: aggregateInput.case.caseId,
        providerCount: aggregateInput.providerSummaries.length,
        providerRecordIds: aggregateInput.providerSummaries.map(
          (providerSummary) => providerSummary.recordId,
        ),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        "Stored aggregate summary failed validation:",
        error.flatten(),
      );
      console.error("Stored aggregate summary candidate:", payload);
      throw new Error(
        "Validated Gemini aggregate summary failed stored-summary schema",
      );
    }

    throw error;
  }
};
