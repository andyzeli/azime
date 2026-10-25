import assert from "node:assert/strict";
import test from "node:test";
import { causationCheck, workCheck } from "@azime/contracts";

const opinions = (causation) => ({ remainingCare: {}, causation });

test("causation needs every supported diagnosis, and a duration for aggravation", () => {
  assert.deepEqual(causationCheck(opinions({}), ["a"]), ["State causation for every supported diagnosis."]);
  assert.deepEqual(
    causationCheck(opinions({ a: { relationship: "aggravated", aggravation: null, note: "" } }), ["a"]),
    ["Say whether each aggravation is temporary or permanent."]
  );
  assert.deepEqual(
    causationCheck(opinions({ a: { relationship: "aggravated", aggravation: "permanent", note: "" }, b: { relationship: "caused", aggravation: null, note: "" } }), ["a", "b"]),
    []
  );
});

test("work status needs restrictions for modified duty and a duration unless full duty", () => {
  assert.deepEqual(workCheck(undefined), ["Give a work status recommendation."]);
  assert.deepEqual(workCheck({ status: "full_duty", restrictions: [], duration: null }), []);
  assert.deepEqual(workCheck({ status: "modified_duty", restrictions: [" "], duration: "temporary" }), ["List the restrictions for modified duty."]);
  assert.deepEqual(workCheck({ status: "off_work", restrictions: [], duration: null }), ["Say whether the work status is temporary or permanent."]);
});
