import { ThinkingLevel, type ThinkingConfig } from "@google/genai";
import type { Reasoning } from "openai/resources/shared.js";

const claudeEfforts = ["low", "medium", "high", "xhigh", "max"] as const;

const openAIEfforts = [
  "none", "minimal", "low", "medium", "high", "xhigh", "max",
] as const;

// Blank settings preserve the selected model's default behavior. Model-specific
// support/ranges are checked by the provider, not duplicated in this application.
export function getOpenAIReasoning(prefix: string): Reasoning | undefined {
  const key = `${prefix}_OPENAI_REASONING_EFFORT`;
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return undefined;
  const effort = openAIEfforts.find((candidate) => candidate === value);
  if (!effort) {
    throw new Error(`${key} must be one of: ${openAIEfforts.join(", ")}`);
  }
  return { effort };
}

export function getClaudeEffort(
  prefix: string,
): (typeof claudeEfforts)[number] | undefined {
  const key = `${prefix}_CLAUDE_EFFORT`;
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return undefined;
  const effort = claudeEfforts.find((candidate) => candidate === value);
  if (!effort) {
    throw new Error(`${key} must be one of: ${claudeEfforts.join(", ")}`);
  }
  return effort;
}

export function getGeminiThinkingConfig(prefix: string): ThinkingConfig | undefined {
  const levelKey = `${prefix}_THINKING_LEVEL`;
  const budgetKey = `${prefix}_THINKING_BUDGET`;
  const level = process.env[levelKey]?.trim().toUpperCase();
  const budget = process.env[budgetKey]?.trim();

  if (level && budget) {
    throw new Error(`Set only one of ${levelKey} and ${budgetKey}`);
  }
  if (level) {
    const thinkingLevel = [
      ThinkingLevel.MINIMAL, ThinkingLevel.LOW,
      ThinkingLevel.MEDIUM, ThinkingLevel.HIGH,
    ].find((candidate) => candidate === level);
    if (!thinkingLevel) {
      throw new Error(`${levelKey} must be one of: minimal, low, medium, high`);
    }
    return { thinkingLevel };
  }
  if (budget) {
    const thinkingBudget = Number(budget);
    if (!Number.isSafeInteger(thinkingBudget) || thinkingBudget < -1) {
      throw new Error(`${budgetKey} must be -1 or a nonnegative integer`);
    }
    return { thinkingBudget };
  }
  return undefined;
}
