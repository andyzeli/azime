import { getGeminiThinkingConfig, getOpenAIReasoning } from "./reasoningConfig.js";
import OpenAI from "openai";
import { ZodError, z } from "zod";
import { NotImplementedError } from "../errors/notImplementedError.js";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import {
  buildRefinedAnalysisUserPrompt,
  refinedAnalysisSystemPrompt,
  type RefinedAnalysisInput,
} from "./refinedAnalysisPrompt.js";
import {
  refinedAnalysisProviderSchema,
  refinedAnalysisSchema,
  storedRefinedAnalysisSchema,
  type RefinedAnalysisProvider,
  type StoredRefinedAnalysis,
} from "./refinedAnalysisSchema.js";

type GeneratedResponse = {
  model: string;
  text: string;
};

const toResponseJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" });

// const assertRefinedAnalysisReady = () => {
//   throw new NotImplementedError(
//     "makeRefinedAnalysis is scaffolded but its prompt and response schema are not implemented",
//   );
// };

const getRefinedAnalysisProvider = (): RefinedAnalysisProvider => {
  const provider = process.env.REFINED_ANALYSIS_PROVIDER ?? "gemini";
  return refinedAnalysisProviderSchema.parse(provider);
};

const generateWithGemini = async (
  prompt: string
): Promise<GeneratedResponse> => {
  const model =
    process.env.REFINED_ANALYSIS_GEMINI_MODEL ?? getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: {
      systemInstruction: refinedAnalysisSystemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: toResponseJsonSchema(refinedAnalysisSchema),
      temperature: 0.1,
      thinkingConfig: getGeminiThinkingConfig("REFINED_ANALYSIS_GEMINI"),
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty refined analysis response");
  }

  return { model, text: response.text };
};

const generateWithOpenAI = async (
  prompt: string
): Promise<GeneratedResponse> => {
  const model = process.env.REFINED_ANALYSIS_OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!model) {
    throw new Error(
      "REFINED_ANALYSIS_OPENAI_MODEL is required when REFINED_ANALYSIS_PROVIDER=openai"
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when REFINED_ANALYSIS_PROVIDER=openai"
    );
  }

  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: refinedAnalysisSystemPrompt,
    input: prompt,
    store: false,
    reasoning: getOpenAIReasoning("REFINED_ANALYSIS"),
    text: {
      format: {
        type: "json_schema",
        name: "refined_analysis",
        strict: true,
        schema: toResponseJsonSchema(refinedAnalysisSchema),
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty refined analysis response");
  }

  return { model, text: response.output_text };
};

export const makeRefinedAnalysis = async (
  input: RefinedAnalysisInput
): Promise<StoredRefinedAnalysis> => {
  //assertRefinedAnalysisReady();

  const provider = getRefinedAnalysisProvider();
  const prompt = buildRefinedAnalysisUserPrompt(input);
  const response =
    provider === "openai"
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error(`${provider} returned invalid refined analysis JSON`);
  }

  try {
    const payload = refinedAnalysisSchema.parse(parsedJson);

    return storedRefinedAnalysisSchema.parse({
      ...payload,
      visitPriority: payload.visitPriority.map((priority, index) => ({
        ...priority,
        id: `priority-${index}`,
      })),
      schemaVersion: "draft-v2",
      sourceMetadata: {
        provider,
        model: response.model,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        `${provider} refined analysis failed schema validation:`,
        error.flatten()
      );
      throw new Error(
        `${provider} refined analysis did not match the expected schema`
      );
    }

    throw error;
  }
};
