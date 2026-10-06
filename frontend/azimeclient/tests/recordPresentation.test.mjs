import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Transpile the presentation helper without a browser. Resolve its contracts
// import to a file URL because data URLs cannot resolve bare package names.
async function loadTypeScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  const resolvedOutput = outputText.replace(
    /from (["'])@azime\/contracts\1/g,
    `from ${JSON.stringify(import.meta.resolve("@azime/contracts"))}`,
  );
  return import(`data:text/javascript;base64,${Buffer.from(resolvedOutput).toString("base64")}`);
}
const { toTimeline, toTimelineEvent } = await loadTypeScript("../src/routes/p_cases/p_case/recordPresentation.ts");
const { testRecordFixtures } = await loadTypeScript("../../../backend/src/records/testRecordFixtures.ts");

const record = (documentType, summary, overrides = {}) => ({
  id: 7,
  caseId: 42,
  documentType,
  name: null,
  provider: null,
  eventDate: "2025-01-08",
  parsedSummary: summary,
  summary,
  summaryParseError: null,
  summaryStatus: "completed",
  ...overrides,
});

test("real extraction fixtures map without losing the complete summary or record identity", () => {
  for (const fixture of testRecordFixtures) {
    const event = toTimelineEvent(record(fixture.documentType, fixture.summary, {
      name: fixture.name,
      provider: fixture.provider,
    }));
    assert.equal(event.id, "7");
    assert.equal(event.recordId, 7);
    assert.ok(event.name.length > 0);
    assert.equal(event.provider, fixture.provider?.name ?? "");
    assert.equal(event.summary, fixture.summary);
    assert.equal(event.summaryMessage, null);
    assert.ok(event.detail.length > 0);
    assert.notEqual(event.detail, "No summary text documented.");
  }
});

test("timeline lines use the document's own relevant fields", () => {
  const cases = [
    ["encounter", { chiefComplaint: "Right shoulder pain", assessment: "Different assessment" }, "Right shoulder pain", "visit"],
    ["therapy_note", { therapistAssessment: "Progress has plateaued", historyOfPresentIllness: "Pain", objectiveMetrics: [] }, "Progress has plateaued", "therapy"],
    ["imaging_report", { radiologistImpression: ["Possible partial tear"], modality: "MRI", bodySite: "Right shoulder" }, "Possible partial tear", "imaging"],
    ["intervention_report", { name: "Epidural injection", bodySite: "L4-5", immediate_response: "No immediate relief", treatmentType: "injection" }, "Epidural injection · L4-5; No immediate relief", "injection"],
    ["surgery_report", { proceduresPerformed: [{ name: "Repair", bodySite: "Right shoulder" }], operativeFindings: "Tear" }, "Repair · Right shoulder", "surgery"],
    ["incident_report", { mechanismOfInjury: "Reported fall", initialReportedInjuries: ["Knee pain"] }, "Reported fall", "incident"],
    ["workstatus", { status: "modified_duty", restrictions: ["No lifting over 10 lb"] }, "Modified duty; No lifting over 10 lb", "work"],
    ["job_description", { jobTitle: "Clerk", exertionClassification: "Light", requiredPhysicalDemands: ["Frequent standing"] }, "Clerk; Light; Frequent standing", "work"],
    ["generic", { summary: "Recorded history" }, "Recorded history", "document"],
    ["legal_summary", { summary: "Disputed claim" }, "Disputed claim", "document"],
  ];
  for (const [type, summary, expectedLine, expectedKind] of cases) {
    const event = toTimelineEvent(record(type, summary));
    assert.equal(event.detail, expectedLine, type);
    assert.equal(event.kind, expectedKind, type);
  }
});

test("imaging without an impression uses study metadata without inventing findings", () => {
  const event = toTimelineEvent(record("imaging_report", {
    radiologistImpression: [], modality: "MRI", bodySite: "Lumbar spine",
    detailedFindings: "Unrelated full findings text",
  }));
  assert.equal(event.detail, "MRI · Lumbar spine");
});

test("non-injection procedures use a general procedure icon", () => {
  const event = toTimelineEvent(record("intervention_report", {
    name: "Manipulation", bodySite: "Lumbar spine", immediate_response: "", treatmentType: "manipulation",
  }));
  assert.equal(event.kind, "procedure");
});

test("unavailable or invalid extractions remain selectable with an explanation", () => {
  for (const [status, expected] of [
    ["pending", "No structured extraction available yet."],
    ["processing", "Extraction in progress."],
    ["failed", "Extraction failed."],
  ]) {
    const event = toTimelineEvent(record("generic", null, { summaryStatus: status }));
    assert.equal(event.detail, expected);
    assert.equal(event.summaryMessage, expected);
    assert.equal(event.id, "7");
  }
  const invalid = toTimelineEvent(record("encounter", null, {
    summary: { invalid: true }, summaryParseError: "Missing required fields",
  }));
  assert.match(invalid.summaryMessage, /does not match the current schema/);
  assert.equal(invalid.summary, null);
});

test("chronological ordering is shared by selection and prev/next; undated records go last", () => {
  const records = [
    record("generic", null, { id: 3, eventDate: null }),
    record("generic", null, { id: 2, eventDate: "2025-02-01" }),
    record("generic", null, { id: 5, eventDate: "2025-01-01" }),
    record("generic", null, { id: 1, eventDate: "2025-01-01" }),
  ];
  assert.deepEqual(toTimeline(records).map(({ id }) => id), ["1", "5", "2", "3"]);
  assert.equal(records[0].id, 3, "input order is not mutated");
  assert.deepEqual(toTimeline([]), []);
});

test("document-specific titles take priority over uploaded filenames", () => {
  const filename = "uploaded-file.pdf";
  assert.equal(toTimelineEvent(record("encounter", null, {
    name: filename, provider: { discipline: "orthopedics" },
  })).name, "Orthopedics Visit");
  assert.equal(toTimelineEvent(record("therapy_note", null, {
    name: filename, provider: { discipline: "physical_therapy" },
  })).name, "Physical Therapy");
  assert.equal(toTimelineEvent(record("imaging_report", null, {
    name: filename, metadata: { modality: " MRI ", region: " Lumbar spine " },
  })).name, "MRI Lumbar spine");
});

test("titles handle missing providers and imaging metadata", () => {
  assert.equal(toTimelineEvent(record("encounter", null)).name, "Provider Visit");
  assert.equal(toTimelineEvent(record("therapy_note", null)).name, "Therapy");
  for (const metadata of [null, undefined, {}]) {
    assert.equal(toTimelineEvent(record("imaging_report", null, { metadata })).name, "Imaging report");
    assert.equal(toTimelineEvent(record("imaging_report", null, {
      metadata, name: " lumbar-study.pdf ",
    })).name, "lumbar-study.pdf");
  }
  assert.equal(toTimelineEvent(record("imaging_report", null, { metadata: { modality: "CT" } })).name, "CT");
  assert.equal(toTimelineEvent(record("generic", null, { name: " referral.pdf " })).name, "referral.pdf");
  assert.equal(toTimelineEvent(record("workstatus", null)).name, "Work status");
  assert.equal(toTimelineEvent(record("surgery_report", null)).name, "Surgery");
  assert.equal(toTimelineEvent(record("intervention_report", null)).name, "Intervention");
});
