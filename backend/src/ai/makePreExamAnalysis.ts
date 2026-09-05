import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { ZodError, z } from "zod";
import { NotImplementedError } from "../errors/notImplementedError.js";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import {
  buildPreExamAnalysisUserPrompt,
  preExamAnalysisSystemPrompt,
  type PreExamAnalysisInput,
} from "./preExamAnalysisPrompt.js";
import {
  preExamAnalysisProviderSchema,
  preExamAnalysisSchema,
  storedPreExamAnalysisSchema,
  type PreExamAnalysisProvider,
  type StoredPreExamAnalysis,
} from "./preExamAnalysisSchema.js";

type GeneratedResponse = {
  model: string;
  text: string;
};

const toResponseJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" });

const assertPreExamAnalysisReady = () => {
  throw new NotImplementedError(
    "makePreExamAnalysis is scaffolded but its prompt and response schema are not implemented",
  );
};

const getPreExamAnalysisProvider = (): PreExamAnalysisProvider => {
  const provider = process.env.PRE_EXAM_ANALYSIS_PROVIDER ?? "gemini";
  return preExamAnalysisProviderSchema.parse(provider);
};

const generateWithGemini = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model =
    process.env.PRE_EXAM_ANALYSIS_GEMINI_MODEL ?? getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: {
      systemInstruction: preExamAnalysisSystemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: toResponseJsonSchema(preExamAnalysisSchema),
      temperature: 0.1,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty pre-exam analysis response");
  }

  return { model, text: response.text };
};

const generateWithOpenAI = async (
  prompt: string,
): Promise<GeneratedResponse> => {
  const model = process.env.PRE_EXAM_ANALYSIS_OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!model) {
    throw new Error(
      "PRE_EXAM_ANALYSIS_OPENAI_MODEL is required when PRE_EXAM_ANALYSIS_PROVIDER=openai",
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when PRE_EXAM_ANALYSIS_PROVIDER=openai",
    );
  }

  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: preExamAnalysisSystemPrompt,
    input: prompt,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "pre_exam_analysis",
        strict: true,
        schema: toResponseJsonSchema(preExamAnalysisSchema),
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty pre-exam analysis response");
  }

  return { model, text: response.output_text };
};

export const makePreExamAnalysis = async (
  input: PreExamAnalysisInput,
): Promise<StoredPreExamAnalysis> => {
  assertPreExamAnalysisReady();

  if (!input.caseSummary) {
    throw new Error("A case summary is required for pre-exam analysis");
  }

  const provider = getPreExamAnalysisProvider();
  const prompt = buildPreExamAnalysisUserPrompt(input);
  const response =
    provider === "openai"
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error(`${provider} returned invalid pre-exam analysis JSON`);
  }

  try {
    const payload = preExamAnalysisSchema.parse(parsedJson);

    return storedPreExamAnalysisSchema.parse({
      ...payload,
      treatmentAnalysis: payload.treatmentAnalysis.map((treatment) => ({
        ...treatment,
        id: randomUUID(),
      })),
      schemaVersion: "draft-v2",
      sourceMetadata: {
        provider,
        model: response.model,
        caseSummaryId: input.caseSummary.caseSummaryId,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        `${provider} pre-exam analysis failed schema validation:`,
        error.flatten(),
      );
      throw new Error(
        `${provider} pre-exam analysis did not match the expected schema`,
      );
    }

    throw error;
  }
};

// async function runPreExamAnalysis(caseId: string) {
//   // PASS 2 is probably the cleanest source for diagnoses
//   const caseSummary = await getCaseClinicalSummary(caseId);

//   // PASS 1 remains available for detailed evidence/citations
//   const documentExtractions = await getDocumentExtractions(caseId);

//   const diagnoses = getRelevantDiagnoses(caseSummary);

//   const taxonomy = diagnoses.map(diagnosis => ({
//     diagnosis,
//     carePathway: getTaxonomy(diagnosis)
//   }));

//   const deterministicSignals =
//     await getDeterministicMmiSignals(caseId);

//   const input = {
//     caseSummary,
//     documentExtractions,
//     taxonomy,
//     deterministicSignals
//   };

//   return callModel({
//     schema: preExamAnalysisSchema,
//     systemPrompt: PRE_EXAM_ANALYSIS_PROMPT,
//     input
//   });
//}
