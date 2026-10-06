import OpenAI from "openai";
import { ZodError, z } from "zod";
import { NotImplementedError } from "../errors/notImplementedError.js";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import {
  buildPreExamAnalysisUserPrompt,
  buildPEASystemPrompt,
} from "./preExamAnalysisPrompt.js";
import {
  preExamAnalysisProviderSchema,
  preExamAnalysisSchema,
  storedPreExamAnalysisSchema,
  type PreExamAnalysisProvider,
  type StoredPreExamAnalysis,
  type Region,
} from "@azime/contracts";
import { PreExamAnalysisInput } from "./preExamInputSnapshot.js";

type GeneratedResponse = {
  model: string;
  text: string;
};

const toResponseJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" });

const assertPreExamAnalysisReady = () => {
  throw new NotImplementedError(
    "makePreExamAnalysis is scaffolded but its prompt and response schema are not implemented"
  );
};

const getPreExamAnalysisProvider = (): PreExamAnalysisProvider => {
  const provider = process.env.PRE_EXAM_ANALYSIS_PROVIDER ?? "gemini";
  return preExamAnalysisProviderSchema.parse(provider);
};

const generateWithGemini = async (
  prompt: string,
  systemPrompt: string
): Promise<GeneratedResponse> => {
  const model =
    process.env.PRE_EXAM_ANALYSIS_GEMINI_MODEL ?? getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: {
      systemInstruction: systemPrompt,
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
  systemPrompt: string
): Promise<GeneratedResponse> => {
  const model = process.env.PRE_EXAM_ANALYSIS_OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!model) {
    throw new Error(
      "PRE_EXAM_ANALYSIS_OPENAI_MODEL is required when PRE_EXAM_ANALYSIS_PROVIDER=openai"
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when PRE_EXAM_ANALYSIS_PROVIDER=openai"
    );
  }

  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: systemPrompt,
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
  region: Region
): Promise<StoredPreExamAnalysis> => {
  //assertPreExamAnalysisReady();

  if (!input) {
    throw new Error("Document extractions are required for pre-exam analysis");
  }

  ///

  // Note for prompt. "if you see out-of-scope episode, choose unresolved"

  ///
  const provider = getPreExamAnalysisProvider();
  //
  const prompt = buildPreExamAnalysisUserPrompt(input, region);

  const systemPrompt = buildPEASystemPrompt(region);
  const response =
    provider === "openai"
      ? await generateWithOpenAI(prompt, systemPrompt)
      : await generateWithGemini(prompt, systemPrompt);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error(`${provider} returned invalid pre-exam analysis JSON`);
  }

  try {
    const payload = preExamAnalysisSchema.parse(parsedJson);

    const ladderTreatmentIds = new Set(
      input.ladder.map((entry) => entry.treatmentId)
    );
    const unknownTreatmentIds = payload.treatmentAnalysis
      .map((treatment) => treatment.treatmentId)
      .filter((id): id is string => id !== null && !ladderTreatmentIds.has(id));

    if (unknownTreatmentIds.length > 0) {
      throw new Error(
        `${provider} pre-exam analysis referenced treatmentIds not in the ladder: ${unknownTreatmentIds.join(", ")}`
      );
    }

    return storedPreExamAnalysisSchema.parse({
      ...payload,
      treatmentAnalysis: payload.treatmentAnalysis.map((treatment, index) => ({
        ...treatment,
        id: `treatment-${index}`,
      })),
      evidenceGaps: payload.evidenceGaps.map((gap, index) => ({
        ...gap,
        id: `gap-${index}`,
      })),
      inconsistencies: payload.inconsistencies.map((inconsistency, index) => ({
        ...inconsistency,
        id: `inconsistent-${index}`,
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
        `${provider} pre-exam analysis failed schema validation:`,
        error.flatten()
      );
      throw new Error(
        `${provider} pre-exam analysis did not match the expected schema`
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
