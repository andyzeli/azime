import { getGeminiThinkingConfig, getOpenAIReasoning } from "./reasoningConfig.js";
import OpenAI from "openai";
import { ZodError, z } from "zod";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import {
  buildPostExamAnalysisUserPrompt,
  postExamAnalysisSystemPrompt,
  type PostExamInput,
} from "./postExamAnalysisPrompt.js";
import {
  postExamAnalysisProviderSchema,
  postExamAnalysisSchema,
  storedPostExamAnalysisSchema,
  type PostExamAnalysisProvider,
  type StoredPostExamAnalysis,
} from "./postExamAnalysisSchema.js";

type GeneratedResponse = {
  model: string;
  text: string;
};

const toResponseJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" });

const getPostExamAnalysisProvider = (): PostExamAnalysisProvider => {
  const provider = process.env.POST_EXAM_ANALYSIS_PROVIDER ?? "gemini";
  return postExamAnalysisProviderSchema.parse(provider);
};

const generateWithGemini = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model =
    process.env.POST_EXAM_ANALYSIS_GEMINI_MODEL ?? getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: {
      systemInstruction: postExamAnalysisSystemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: toResponseJsonSchema(postExamAnalysisSchema),
      temperature: 0.1,
      thinkingConfig: getGeminiThinkingConfig("POST_EXAM_ANALYSIS_GEMINI"),
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty post-exam analysis response");
  }

  return { model, text: response.text };
};

const generateWithOpenAI = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model = process.env.POST_EXAM_ANALYSIS_OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!model) {
    throw new Error(
      "POST_EXAM_ANALYSIS_OPENAI_MODEL is required when POST_EXAM_ANALYSIS_PROVIDER=openai",
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when POST_EXAM_ANALYSIS_PROVIDER=openai",
    );
  }

  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: postExamAnalysisSystemPrompt,
    input: prompt,
    store: false,
    reasoning: getOpenAIReasoning("POST_EXAM_ANALYSIS"),
    text: {
      format: {
        type: "json_schema",
        name: "post_exam_analysis",
        strict: true,
        schema: toResponseJsonSchema(postExamAnalysisSchema),
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty post-exam analysis response");
  }

  return { model, text: response.output_text };
};

export const makePostExamAnalysis = async (
  input: PostExamInput,
): Promise<StoredPostExamAnalysis> => {
  const provider = getPostExamAnalysisProvider();
  const prompt = buildPostExamAnalysisUserPrompt(input);
  const response =
    provider === "openai"
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error(`${provider} returned invalid post-exam analysis JSON`);
  }

  try {
    const payload = postExamAnalysisSchema.parse(parsedJson);

    return storedPostExamAnalysisSchema.parse({
      ...payload,
      schemaVersion: "draft-v2",
      sourceMetadata: {
        provider,
        model: response.model,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        `${provider} post-exam analysis failed schema validation:`,
        error.flatten(),
      );
      throw new Error(
        `${provider} post-exam analysis did not match the expected schema`,
      );
    }

    throw error;
  }
};
