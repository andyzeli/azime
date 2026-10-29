import { getGeminiThinkingConfig, getOpenAIReasoning } from "./reasoningConfig.js";
import OpenAI from "openai";
import { ZodError, z } from "zod";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import {
  buildProviderSummaryUserPrompt,
  providerSummarySystemPrompt,
  type ProviderSummaryInput,
} from "./providerSummaryPrompt.js";
import {
  providerSummaryProviderSchema,
  providerSummaryResponseSchema,
  storedProviderSummaryItemSchema,
  type ProviderSummary,
  type ProviderSummaryProvider,
} from "@azime/contracts";

type GeneratedResponse = {
  text: string;
};

const toResponseJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" });

const getProviderSummaryProvider = (): ProviderSummaryProvider => {
  const provider =
    process.env.PROVIDER_SUMMARY_PROVIDER ??
    process.env.CASE_SUMMARY_PROVIDER ??
    "gemini";
  return providerSummaryProviderSchema.parse(provider);
};

const generateWithGemini = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model =
    process.env.PROVIDER_SUMMARY_GEMINI_MODEL ??
    process.env.CASE_SUMMARY_GEMINI_MODEL ??
    getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: {
      systemInstruction: providerSummarySystemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: toResponseJsonSchema(providerSummaryResponseSchema),
      temperature: 0.1,
      thinkingConfig: getGeminiThinkingConfig("PROVIDER_SUMMARY_GEMINI"),
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty provider summary response");
  }

  return { text: response.text };
};

const generateWithOpenAI = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model =
    process.env.PROVIDER_SUMMARY_OPENAI_MODEL ??
    process.env.CASE_SUMMARY_OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!model) {
    throw new Error(
      "PROVIDER_SUMMARY_OPENAI_MODEL or CASE_SUMMARY_OPENAI_MODEL is required when PROVIDER_SUMMARY_PROVIDER=openai",
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when PROVIDER_SUMMARY_PROVIDER=openai",
    );
  }

  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: providerSummarySystemPrompt,
    input: prompt,
    store: false,
    reasoning: getOpenAIReasoning("PROVIDER_SUMMARY"),
    text: {
      format: {
        type: "json_schema",
        name: "provider_summary",
        strict: true,
        schema: toResponseJsonSchema(providerSummaryResponseSchema),
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty provider summary response");
  }

  return { text: response.output_text };
};

export const makeProviderSummary = async (
  input: ProviderSummaryInput,
): Promise<ProviderSummary> => {
  const provider = getProviderSummaryProvider();
  const prompt = buildProviderSummaryUserPrompt(input);
  const response =
    provider === "openai"
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error(`${provider} returned invalid provider summary JSON`);
  }

  try {
    const payload = providerSummaryResponseSchema.parse(parsedJson);
    return storedProviderSummaryItemSchema.parse({
      ...payload,
      providerName: input.providerName,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        `${provider} provider summary failed schema validation:`,
        error.flatten(),
      );
      throw new Error(
        `${provider} provider summary did not match the expected schema`,
      );
    }

    throw error;
  }
};
