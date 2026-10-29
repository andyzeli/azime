import assert from "node:assert/strict";
import test from "node:test";
import {
  getGeminiThinkingConfig,
  getOpenAIReasoning,
} from "../dist/ai/reasoningConfig.js";

test("optional reasoning settings preserve defaults and validate explicit choices", (t) => {
  const prefix = "AZIME_TEST_REASONING";
  const effortKey = `${prefix}_OPENAI_REASONING_EFFORT`;
  const levelKey = `${prefix}_THINKING_LEVEL`;
  const budgetKey = `${prefix}_THINKING_BUDGET`;
  const keys = [effortKey, levelKey, budgetKey];
  const previous = keys.map((key) => process.env[key]);
  t.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key];
    else process.env[key] = previous[index];
  }));
  keys.forEach((key) => delete process.env[key]);
  assert.equal(getOpenAIReasoning(prefix), undefined);
  assert.equal(getGeminiThinkingConfig(prefix), undefined);
  keys.forEach((key) => { process.env[key] = " "; });
  assert.equal(getOpenAIReasoning(prefix), undefined);
  assert.equal(getGeminiThinkingConfig(prefix), undefined);

  process.env[effortKey] = " HIGH ";
  assert.deepEqual(getOpenAIReasoning(prefix), { effort: "high" });
  process.env[effortKey] = "ultra";
  assert.throws(() => getOpenAIReasoning(prefix), /OPENAI_REASONING_EFFORT/);

  process.env[levelKey] = "medium";
  assert.deepEqual(getGeminiThinkingConfig(prefix), { thinkingLevel: "MEDIUM" });
  process.env[budgetKey] = "0";
  assert.throws(() => getGeminiThinkingConfig(prefix), /Set only one/);
  process.env[budgetKey] = "";
  process.env[levelKey] = "ultra";
  assert.throws(() => getGeminiThinkingConfig(prefix), /THINKING_LEVEL/);
  process.env[levelKey] = "";
  for (const budget of [-1, 0, 8192]) {
    process.env[budgetKey] = String(budget);
    assert.deepEqual(getGeminiThinkingConfig(prefix), { thinkingBudget: budget });
  }
  for (const budget of ["-2", "1.5", "NaN", "Infinity"]) {
    process.env[budgetKey] = budget;
    assert.throws(() => getGeminiThinkingConfig(prefix), /THINKING_BUDGET/);
  }
});
