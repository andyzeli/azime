import { GoogleGenAI } from "@google/genai";

const getProjectId = () => process.env.GCP_PROJECT_ID;

const getLocation = () => process.env.GCP_LOCATION ?? "global";

export const getGeminiModelName = () =>
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const getGeminiClient = () => {
  const project = getProjectId();

  if (!project) {
    throw new Error("GCP_PROJECT_ID is required for Gemini summarization");
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location: getLocation(),
  });
};
