import assert from "node:assert/strict";
import test from "node:test";
import { isTabletAllowed } from "../dist/tablet.js";

test("tablet may load client pages and fill in questionnaires", () => {
  assert.ok(isTabletAllowed("GET", "/"));
  assert.ok(isTabletAllowed("GET", "/cases/12"));
  assert.ok(isTabletAllowed("GET", "/assets/index.js"));
  assert.ok(isTabletAllowed("GET", "/api/me"));
  assert.ok(isTabletAllowed("GET", "/api/tablet/questionnaires"));
  assert.ok(isTabletAllowed("GET", "/api/questionnaires/abc-123"));
  assert.ok(isTabletAllowed("POST", "/api/questionnaires/abc-123/submit"));
});

test("tablet is blocked from everything else", () => {
  assert.ok(!isTabletAllowed("GET", "/api/cases"));
  assert.ok(!isTabletAllowed("GET", "/api/cases/1/questionnaires"));
  assert.ok(!isTabletAllowed("GET", "/api/records/1/download-url"));
  assert.ok(!isTabletAllowed("DELETE", "/api/questionnaires/1"));
  assert.ok(!isTabletAllowed("POST", "/api/questionnaires/abc-123"));
  assert.ok(!isTabletAllowed("GET", "/api/questionnaires/abc/submit/x"));
  assert.ok(!isTabletAllowed("POST", "/"));
});
