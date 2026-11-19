import { GoogleGenAI } from "@google/genai";

const getProjectId = () => process.env.GCP_PROJECT_ID;

const getLocation = () => process.env.GCP_LOCATION ?? "global";

export const getGeminiModelName = () =>
  process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

export const getGeminiClient = () => {
  const project = getProjectId();

  if (!project) {
    throw new Error("GCP_PROJECT_ID is required for Gemini summarization");
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location: getLocation(),
    // Retry rate limits (429) and server errors, waiting 1s, 2s, 4s... between
    // attempts: about a minute in all, enough for a per-minute quota to reset.
    httpOptions: { retryOptions: { attempts: 7 } },
  });
};
