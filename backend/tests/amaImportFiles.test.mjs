import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { amaReferenceDataSchema } from "@azime/contracts";
import { readAmaImportFiles } from "../dist/db/referenceData/amaImportFiles.js";

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ama-import-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("folder import combines JSON arrays in filename order and ignores other files and subfolders", async t => {
  const directory = await temporaryDirectory(t);
  await writeFile(path.join(directory, "b.json"), JSON.stringify([{ id: "b" }]));
  await writeFile(path.join(directory, "a.json"), JSON.stringify([{ id: "a" }]));
  await writeFile(path.join(directory, "README.md"), "Not JSON");
  await mkdir(path.join(directory, "archive"));
  await writeFile(path.join(directory, "archive", "old.json"), "Not JSON");
  assert.deepEqual(await readAmaImportFiles(directory), [{ id: "a" }, { id: "b" }]);
  // The original explicit-file invocation still works.
  assert.deepEqual(await readAmaImportFiles(path.join(directory, "a.json")), [{ id: "a" }]);
});

test("empty folders, malformed JSON and non-array uploads fail with the source path", async t => {
  const directory = await temporaryDirectory(t);
  await assert.rejects(readAmaImportFiles(directory), error => error.message.includes(directory) && error.message.includes("No JSON files"));
  const filename = path.join(directory, "bad.json");
  await writeFile(filename, "not JSON");
  await assert.rejects(readAmaImportFiles(directory), error => error.message.includes(filename) && error.message.includes("Invalid JSON"));
  await writeFile(filename, JSON.stringify({ row_id: "not_an_array" }));
  await assert.rejects(readAmaImportFiles(directory), error => error.message.includes(filename) && error.message.includes("Expected a JSON array"));
});

test("duplicate IDs in separate upload files are rejected by combined validation", async t => {
  const directory = await temporaryDirectory(t);
  const [row] = JSON.parse(await readFile(new URL("../../docs/ama-spine.upload.json", import.meta.url), "utf8"));
  await writeFile(path.join(directory, "first.json"), JSON.stringify([row]));
  await writeFile(path.join(directory, "duplicate.json"), JSON.stringify([row]));
  assert.equal(amaReferenceDataSchema.safeParse(await readAmaImportFiles(directory)).success, false);
});
