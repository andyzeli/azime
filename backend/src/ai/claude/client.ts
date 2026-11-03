import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { getClaudeEffort } from "../reasoningConfig.js";

// Shared by every pass's Claude branch. Thinking is left at the model default
// (adaptive on current models); depth is set with <PREFIX>_CLAUDE_EFFORT.
// Sampling params (temperature) are not sent: current Claude models reject them.
export const generateWithClaude = async ({
  envPrefix,
  model,
  systemPrompt,
  prompt,
  schema,
}: {
  envPrefix: string;
  model: string | undefined;
  systemPrompt: string;
  prompt: string;
  // Omit for free-text output (report draft).
  schema?: z.ZodType;
}): Promise<{ model: string; text: string }> => {
  if (!model) {
    throw new Error(
      `${envPrefix}_CLAUDE_MODEL is required when ${envPrefix}_PROVIDER=claude`,
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      `ANTHROPIC_API_KEY is required when ${envPrefix}_PROVIDER=claude`,
    );
  }

  const effort = getClaudeEffort(envPrefix);

  // Streamed so long outputs don't hit the SDK's non-streaming timeout.
  const message = await new Anthropic().beta.messages
    .stream({
      model,
      max_tokens: 64000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        ...(effort && { effort }),
        // The helper strips JSON Schema constraints the API doesn't support;
        // callers still validate the parsed JSON with the full Zod schema.
        ...(schema && { format: betaZodOutputFormat(schema) }),
      },
      // If a safety classifier declines, the API retries on Anthropic's
      // recommended fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    })
    .finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      `Claude declined the ${envPrefix} request (${message.stop_details?.category ?? "no category"})`,
    );
  }

  if (message.stop_reason === "max_tokens") {
    throw new Error(`Claude ${envPrefix} response was cut off at max_tokens`);
  }

  const text = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("");

  // message.model is the model that actually answered (differs after a fallback).
  return { model: message.model, text };
};
