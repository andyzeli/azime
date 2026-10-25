import OpenAI from "openai";
import {
  reportProviderSchema,
  type CaseReportResponse,
  type ReportInput,
} from "@azime/contracts";
import { getGeminiClient, getGeminiModelName } from "./gemini/client.js";
import { buildReportDraftRequest } from "./reportDraftPrompt.js";

type Source = NonNullable<CaseReportResponse["source"]>;

const generateWithGemini = async (prompt: string, systemPrompt: string) => {
  const model = process.env.REPORT_DRAFT_GEMINI_MODEL ?? getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [prompt],
    config: { systemInstruction: systemPrompt, temperature: 0.2 },
  });
  return { model, text: response.text };
};

const generateWithOpenAI = async (prompt: string, systemPrompt: string) => {
  const model = process.env.REPORT_DRAFT_OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!model)
    throw new Error(
      "REPORT_DRAFT_OPENAI_MODEL is required when REPORT_DRAFT_PROVIDER=openai",
    );
  if (!apiKey)
    throw new Error(
      "OPENAI_API_KEY is required when REPORT_DRAFT_PROVIDER=openai",
    );
  const response = await new OpenAI({ apiKey }).responses.create({
    model,
    instructions: systemPrompt,
    input: prompt,
    store: false,
  });
  return { model, text: response.output_text };
};

// The whole report as Markdown. The only output check is that it is not empty;
// reportFactCheck flags missing decided values when the draft is shown.
export const makeReportDraft = async (
  input: ReportInput,
): Promise<{ report: string; source: Source }> => {
  const provider = reportProviderSchema.parse(
    process.env.REPORT_DRAFT_PROVIDER ?? "gemini",
  );
  const { userPrompt, systemPrompt } = buildReportDraftRequest(input);
  const { model, text } =
    provider === "openai"
      ? await generateWithOpenAI(userPrompt, systemPrompt)
      : await generateWithGemini(userPrompt, systemPrompt);
  // Models sometimes wrap the whole answer in a code fence.
  const report = (text ?? "")
    .trim()
    .replace(/^```(?:markdown|md)?\n([\s\S]*)\n```$/, "$1")
    .trim();
  if (!report) throw new Error(`${provider} returned an empty report`);
  return { report, source: { provider, model } };
};
