import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import { amaRatingTableSchema, amaRatingTableReferenceDataSchema, lookupAmaRatingResult } from "@azime/contracts";
import { assertAmaDiagnosisScope, OutOfScopeDiagnosisError, selectAmaCandidates } from "../dist/ama/candidates.js";
import { importAmaRatingTables } from "../dist/db/referenceData/importAmaRatingTables.js";

// Synthetic test content only. These are not clinical instructions or AMA values.
const fixture = () => ({
  table_id: "synthetic_test_scale", description: "Synthetic test scale",
  source_ref: { guides_version: "Synthetic", chapter: "test", table: "fixture" },
  class_options: Array.from({ length: 5 }, (_, value) => ({ value, label: `Synthetic class ${value}`, instructions: `Synthetic instruction ${value}` })),
  mod_options: { prompt: "Synthetic MOD question", options: ["a", "b", "c"].map(id => ({ id, label: `Synthetic ${id}`, text: `Synthetic option ${id}` })) },
  results: Array.from({ length: 5 }, (_, class_value) => ["a", "b", "c"].map((mod_option_id, index) => ({ class_value, mod_option_id, wpi: class_value === 0 ? 0 : class_value * 5 + index }))).flat(),
});

test("complete synthetic 5×3 table validates; zero differs from unanswered", () => {
  const table = amaRatingTableSchema.parse(fixture());
  assert.equal(table.instructions, undefined);
  assert.equal(amaRatingTableSchema.parse({ ...fixture(), instructions: null }).instructions, null);
  const instructions = "Synthetic table guidance.\nRead before selecting a class.";
  assert.equal(amaRatingTableSchema.parse({ ...fixture(), instructions }).instructions, instructions);
  assert.equal(lookupAmaRatingResult(table, null, "a"), null);
  assert.equal(lookupAmaRatingResult(table, 0, null), null);
  assert.deepEqual(lookupAmaRatingResult(table, 0, "a"), 0);
  assert.deepEqual(lookupAmaRatingResult(table, 2, "b"), table.results.find(r => r.class_value === 2 && r.mod_option_id === "b").wpi);
  assert.equal(lookupAmaRatingResult(table, 2, "unknown"), null);
});

test("reject duplicate/missing classes, options, result pairs and unknown result options", () => {
  for (const mutate of [
    t => { t.class_options[4].value = 0; },
    t => { t.mod_options.options[2].id = "a"; },
    t => { t.results[14] = t.results[0]; },
    t => { t.results[0].mod_option_id = "unknown"; },
    t => { t.results.pop(); },
    t => { t.class_options[0].instructions = " "; },
    t => { t.instructions = 42; },
    t => { t.results[0].wpi = -1; },
    t => { t.results[0].wpi = 101; },
    t => { t.results[0].wpi = null; },
    t => { t.results[0] = { class_value: 0, mod_option_id: "a", impairment: { value: 0, unit: "WPI" } }; },
  ]) {
    const table = fixture(); mutate(table);
    assert.equal(amaRatingTableSchema.safeParse(table).success, false);
  }
  assert.equal(amaRatingTableReferenceDataSchema.safeParse([fixture(), fixture()]).success, false);
});

test("tables use only explicit mappings without anatomical filtering; deduplicate across diagnoses", () => {
  const table = fixture();
  const unrelated = { ...fixture(), table_id: "unmapped_table" };
  const row = { row_id: "17-21-01", region_id: "lumbar_spine", nerve_roots: [] };
  const result = selectAmaCandidates("cervical_spine", [
    { canonicalDx: "synthetic_dx_a", affectedRoots: [] },
    { canonicalDx: "synthetic_dx_b", affectedRoots: null },
    { canonicalDx: "synthetic_unmapped_dx", affectedRoots: null },
  ], new Map([["synthetic_dx_a", [row.row_id]]]), [row], new Map([
    ["synthetic_dx_a", [table.table_id, table.table_id]], ["synthetic_dx_b", [table.table_id]],
  ]), [table, unrelated]);
  assert.deepEqual(result.rows, []); // Existing anatomical row filter remains.
  assert.deepEqual(result.ratingTables, [table]);
  assert.deepEqual(result.diagnoses.map(d => d.candidateTableIds), [[table.table_id], [table.table_id], []]);
});

test("whole upload validates before transaction begins; malformed later table writes nothing", async () => {
  let connected = false;
  const database = { transaction: async () => { connected = true; } };
  const invalid = { ...fixture(), table_id: "invalid_table", results: [] };
  await assert.rejects(importAmaRatingTables(database, [fixture(), invalid]));
  assert.equal(connected, false);
});

test("valid import uses one transaction and upserts only uploaded tables", async () => {
  const writes = [];
  let transactions = 0;
  const database = { transaction: async callback => {
    transactions++;
    await callback({ insert: () => ({ values: values => ({ onConflictDoUpdate: async update => { writes.push({ values, update }); } }) }) });
  } };
  const table = { ...fixture(), instructions: "Synthetic table guidance.\nRead before selecting a class." };
  const summary = await importAmaRatingTables(database, [table]);
  assert.equal(transactions, 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].values.tableId, table.table_id);
  assert.equal(writes[0].values.instructions, table.instructions);
  assert.equal(writes[0].update.set.instructions, table.instructions);
  assert.deepEqual(writes[0].values.modOptions, table.mod_options);
  assert.deepEqual(writes[0].update.set.modOptions, table.mod_options);
  assert.deepEqual(writes[0].update.set.results, table.results);
  assert.deepEqual(summary, { tables: 1, tableIds: [table.table_id] });
  await importAmaRatingTables(database, [fixture()]);
  assert.equal(writes[1].values.instructions, null);
  assert.equal(writes[1].update.set.instructions, null);
});

test("candidate diagnosis scope rejects unauthorized IDs before reference lookup", () => {
  const diagnoses = [{ canonicalDx: "synthetic_allowed_dx", affectedRoots: null }];
  assert.doesNotThrow(() => assertAmaDiagnosisScope(diagnoses, ["synthetic_allowed_dx"]));
  assert.throws(() => assertAmaDiagnosisScope(diagnoses, ["synthetic_other_region_dx"]), OutOfScopeDiagnosisError);
  assert.throws(() => assertAmaDiagnosisScope(diagnoses, []), OutOfScopeDiagnosisError);
});

test("rating-table migrations preserve data, rename keys and safely convert legacy WPI", {
  skip: !process.env.AMA_TEST_DATABASE_URL,
}, async () => {
  const client = new pg.Client({ connectionString: process.env.AMA_TEST_DATABASE_URL });
  await client.connect();
  try {
    // A session-local table shadows the real table; no application data is changed.
    await client.query(`CREATE TEMP TABLE ama_rating_tables (
      table_id text PRIMARY KEY, description text, source_ref jsonb,
      class_options jsonb, second_question jsonb, results jsonb
    )`);
    const table = fixture();
    const legacyResults = table.results.map(({ mod_option_id, wpi, ...result }) => ({ ...result, second_option_id: mod_option_id, impairment: { value: wpi, unit: "WPI" } }));
    // Mixed and already-renamed data must retain its current values and array order.
    legacyResults[0] = { class_value: 0, mod_option_id: "a", impairment: { value: 0, unit: "WPI" } };
    for (const [tableId, results] of [[table.table_id, legacyResults], ["already_renamed", table.results]]) {
      await client.query("INSERT INTO ama_rating_tables VALUES ($1, $2, $3, $4, $5, $6)", [
        tableId, table.description, JSON.stringify(table.source_ref),
        JSON.stringify(table.class_options), JSON.stringify(table.mod_options), JSON.stringify(results),
      ]);
    }
    await client.query(await readFile(new URL("../drizzle/0009_even_vin_gonzales.sql", import.meta.url), "utf8"));
    const migration = await readFile(new URL("../drizzle/0010_ama_rating_mod_result_keys.sql", import.meta.url), "utf8");
    await client.query(migration);
    await client.query(migration);
    await client.query(await readFile(new URL("../drizzle/0011_ama_rating_table_instructions.sql", import.meta.url), "utf8"));
    const wpiMigration = await readFile(new URL("../drizzle/0012_ama_rating_result_wpi.sql", import.meta.url), "utf8");
    await client.query(wpiMigration);
    await client.query(wpiMigration);
    const { rows } = await client.query("SELECT * FROM ama_rating_tables ORDER BY table_id");
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.deepEqual(amaRatingTableSchema.parse(row), { ...table, table_id: row.table_id, instructions: null });
    }
    for (const impairment of [
      { value: 10, unit: "UEI" },
      { value: "10", unit: "WPI" },
      { value: 101, unit: "WPI" },
      { value: null, unit: "WPI" },
    ]) {
      const invalidResults = [{ class_value: 0, mod_option_id: "a", impairment }];
      await client.query("UPDATE ama_rating_tables SET results = $1 WHERE table_id = $2", [JSON.stringify(invalidResults), table.table_id]);
      await assert.rejects(client.query(wpiMigration), /unsupported or invalid legacy impairment/);
      const unchanged = await client.query("SELECT results FROM ama_rating_tables WHERE table_id = $1", [table.table_id]);
      assert.deepEqual(unchanged.rows[0].results, invalidResults);
    }
  } finally {
    await client.end();
  }
});
