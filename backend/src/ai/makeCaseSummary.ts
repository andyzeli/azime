import { getGeminiThinkingConfig, getOpenAIReasoning } from "./reasoningConfig.js";
import OpenAI from "openai";
import { ZodError, z } from "zod";
import {
  buildSynthesisUserPrompt,
  caseSummarySystemPrompt,
} from "./clinicalSummaryPrompt.js";
import type { DocumentExtractionArtifacts } from "../queries/caseArtifactQueries.js";
import {
  caseClinicalSummarySchema,
  caseSummaryProviderSchema,
  storedCaseClinicalSummarySchema,
  type CaseSummaryProvider,
  type StoredCaseClinicalSummary,
} from "@azime/contracts";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import { PatientCase } from "../db/schema.js";

type GeneratedResponse = {
  model: string;
  text: string;
};

const toResponseJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" });

const getCaseSummaryProvider = (): CaseSummaryProvider => {
  const provider = process.env.CASE_SUMMARY_PROVIDER ?? "gemini";
  const parsedProvider = caseSummaryProviderSchema.safeParse(provider);

  if (!parsedProvider.success) {
    throw new Error(
      `CASE_SUMMARY_PROVIDER must be "gemini" or "openai"; received "${provider}"`,
    );
  }

  return parsedProvider.data;
};

const generateWithGemini = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model = process.env.CASE_SUMMARY_GEMINI_MODEL ?? getGeminiModelName();
  const responseJsonSchema = toResponseJsonSchema(caseClinicalSummarySchema);
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: {
      systemInstruction: caseSummarySystemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema,
      temperature: 0.1,
      thinkingConfig: getGeminiThinkingConfig("CASE_SUMMARY_GEMINI"),
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty case summary response");
  }

  return { model, text: response.text };
};

const generateWithOpenAI = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model = process.env.CASE_SUMMARY_OPENAI_MODEL;

  if (!model) {
    throw new Error(
      "CASE_SUMMARY_OPENAI_MODEL is required when CASE_SUMMARY_PROVIDER=openai",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when CASE_SUMMARY_PROVIDER=openai",
    );
  }

  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: caseSummarySystemPrompt,
    input: prompt,
    store: false,
    reasoning: getOpenAIReasoning("CASE_SUMMARY"),
    text: {
      format: {
        type: "json_schema",
        name: "case_clinical_summary",
        strict: true,
        schema: toResponseJsonSchema(caseClinicalSummarySchema),
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty case summary response");
  }

  return { model, text: response.output_text };
};

export const makeCaseSummary = async (
  aggregateInput: DocumentExtractionArtifacts,
  caseBaseData: Partial<PatientCase>,
): Promise<StoredCaseClinicalSummary> => {
  const provider = getCaseSummaryProvider();
  const prompt = buildSynthesisUserPrompt(aggregateInput, caseBaseData);

  const response =
    provider === "openai"
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error(`${provider} returned invalid case summary JSON`);
  }

  try {
    const payload = caseClinicalSummarySchema.parse(parsedJson);

    return storedCaseClinicalSummarySchema.parse({
      ...payload,
      // treatmentHistory: payload.treatmentHistory.map((treatment) => ({
      //   ...treatment,
      //   id: randomUUID(),
      // })),
      schemaVersion: "v2",
      sourceMetadata: {
        provider,
        model: response.model,
        sourceRecordCount: aggregateInput.length,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        `${provider} case summary failed schema validation:`,
        error.flatten(),
      );
      throw new Error(
        `${provider} case summary did not match the expected schema`,
      );
    }

    throw error;
  }
};
