import assert from "node:assert/strict";
import test from "node:test";
import { caseSummaryCardResponseSchema } from "@azime/contracts";

// An unused production pool does not connect; these tests exercise consolidation
// and invalid requests without requiring a database or model credentials.
process.env.NODE_ENV = "production";
const { selectLatestWorkStatus } = await import("../dist/queries/workStatusHistory.js");
const { consolidateDiagnosisCard } = await import("../dist/queries/caseSummaryCardQueries.js");
const { caseAggregateSummaryController } = await import("../dist/controllers/caseAggregateSummaryController.js");
const { default: Fastify } = await import("fastify");

test("duplicate mentions and regional catalog matches produce one row per canonical diagnosis", () => {
  assert.deepEqual(consolidateDiagnosisCard([
    { canonicalDx: "strain", icdPrefixes: ["S39", "S33"] },
    { canonicalDx: "disc_herniation", icdPrefixes: ["M51"] },
    { canonicalDx: "strain", icdPrefixes: ["S39", "S16"] },
    { canonicalDx: "strain", icdPrefixes: ["S39", "S33"] },
  ]), [
    { canonicalDx: "disc_herniation", label: "disc_herniation", icdPrefixes: ["M51"] },
    { canonicalDx: "strain", label: "strain", icdPrefixes: ["S16", "S33", "S39"] },
  ]);
});

test("missing catalog matches remain visible without inferred ICD codes", () => {
  assert.deepEqual(consolidateDiagnosisCard([
    { canonicalDx: "historical_diagnosis", icdPrefixes: null },
    { canonicalDx: "unresolved", icdPrefixes: null },
    { canonicalDx: "historical_diagnosis", icdPrefixes: null },
  ]), [
    { canonicalDx: "historical_diagnosis", label: "historical_diagnosis", icdPrefixes: [] },
    { canonicalDx: "unresolved", label: "unresolved", icdPrefixes: [] },
  ]);
});

test("empty cases and optional ICD lists satisfy the shared response contract", () => {
  assert.deepEqual(consolidateDiagnosisCard([]), []);
  for (const diagnoses of [[], consolidateDiagnosisCard([{ canonicalDx: "strain", icdPrefixes: [] }])]) {
    assert.deepEqual(caseSummaryCardResponseSchema.parse({ caseId: 42, currentWorkStatus: null, diagnoses }), { caseId: 42, currentWorkStatus: null, diagnoses });
  }
  assert.equal(caseSummaryCardResponseSchema.safeParse({
    caseId: 42, diagnoses: [{ canonicalDx: "strain", icdPrefixes: "S39" }],
  }).success, false);
});

test("catalog labels survive consolidation and frontend response parsing", () => {
  const diagnoses = consolidateDiagnosisCard([
    { canonicalDx: "strain", label: "Strain", icdPrefixes: ["S39"] },
    { canonicalDx: "strain", label: null, icdPrefixes: null },
  ]);
  assert.deepEqual(diagnoses, [{ canonicalDx: "strain", label: "Strain", icdPrefixes: ["S39"] }]);
  assert.deepEqual(caseSummaryCardResponseSchema.parse({ caseId: 42, currentWorkStatus: null, diagnoses }), { caseId: 42, currentWorkStatus: null, diagnoses });
  assert.equal(caseSummaryCardResponseSchema.safeParse({
    caseId: 42, diagnoses: [{ canonicalDx: "strain", icdPrefixes: [] }],
  }).success, false);
});

test("the card handler rejects invalid case IDs before querying", async () => {
  const app = Fastify();
  app.get("/cases/:caseId/case-summary/card", caseAggregateSummaryController.getCardHandler);
  try {
    for (const id of ["abc", "0", "-1", "1.5", "Infinity"]) {
      const response = await app.inject({ method: "GET", url: `/cases/${id}/case-summary/card` });
      assert.equal(response.statusCode, 400, id);
      assert.deepEqual(response.json(), { error: "Invalid case id" });
    }
  } finally {
    await app.close();
  }
});

const workEntry = (recordId, date, status = "modified_duty") => ({
  recordId, date, status, documentType: "workstatus", restrictions: ["No lifting over 20 pounds"],
});

test("current work status selects the latest dated entry and retains restrictions and source", () => {
  const newest = workEntry(3, "2025-03-10");
  const currentWorkStatus = selectLatestWorkStatus([
    workEntry(1, "2025-01-08", "off_work"),
    newest,
    workEntry(9, null, "full_duty"),
  ]);
  assert.equal(currentWorkStatus, newest);
  assert.deepEqual(caseSummaryCardResponseSchema.parse({
    caseId: 42, diagnoses: [], currentWorkStatus,
  }).currentWorkStatus, newest);
});

test("work status handles same-day records, undated histories, and empty cases", () => {
  assert.equal(selectLatestWorkStatus([
    workEntry(4, "2025-03-10"), workEntry(3, "2025-03-10"),
  ]).recordId, 4);
  assert.equal(selectLatestWorkStatus([workEntry(9, null), workEntry(3, null)]).recordId, 9);
  assert.equal(selectLatestWorkStatus([]), null);
});

test("the latest unknown status is displayed without carrying forward an older status", () => {
  const latest = { ...workEntry(3, "2025-03-10", "unknown"), restrictions: [], documentType: "encounter" };
  assert.equal(selectLatestWorkStatus([workEntry(1, "2025-01-08", "off_work"), latest]), latest);
});
