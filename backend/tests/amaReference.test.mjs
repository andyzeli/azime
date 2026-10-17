import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { amaReferenceDataSchema, normalizeAmaRegion } from "@azime/contracts";
import {
  importAmaReferenceData,
  summarizeAmaReferenceData,
} from "../dist/db/referenceData/importAmaReferenceData.js";

const upload = JSON.parse(
  await readFile(
    new URL("../../docs/ama-spine.upload.json", import.meta.url),
    "utf8",
  ),
);
const clone = () => structuredClone(upload);

function rejects(change) {
  const rows = clone();
  change(rows);
  assert.equal(amaReferenceDataSchema.safeParse(rows).success, false);
}

test("enriched upload preserves JSON and validates its counts, roots and task coverage", () => {
  const rows = amaReferenceDataSchema.parse(upload);
  assert.deepEqual(rows, upload);
  assert.deepEqual(summarizeAmaReferenceData(rows), {
    rows: 30,
    entries: 108,
    questions: 178,
    examinationTasks: 87,
  });
  assert.deepEqual(
    rows.find((r) => r.row_id === "17-20-04").nerve_roots,
    Array.from({ length: 11 }, (_, i) => `T${i + 2}`),
  );
  assert.deepEqual(rows.find((r) => r.row_id === "17-21-07").nerve_roots, [
    "L5",
  ]);
  assert.deepEqual(["cervical", "thoracic", "lumbar"].map(normalizeAmaRegion), [
    "cervical_spine",
    "thoracic_spine",
    "lumbar_spine",
  ]);
  assert.equal(normalizeAmaRegion("lumbar_spine"), "lumbar_spine");
  const future = {
    ...rows.at(-1),
    row_id: "18-01-01",
    region_id: "shoulder",
    description: "Shoulder condition",
  };
  delete future.nerve_roots;
  assert.deepEqual(amaReferenceDataSchema.parse([future])[0].nerve_roots, []);
});

test("invalid identities, questions, roots and impairments are rejected", () => {
  rejects((rows) => rows.push(rows[0]));
  rejects((rows) => rows[0].questions.push(rows[0].questions[0]));
  rejects((rows) => rows[0].entries.push(rows[0].entries[0]));
  rejects((rows) => (rows[0].questions[0].type = "number"));
  rejects((rows) =>
    rows[0].questions[0].options.push(rows[0].questions[0].options[0]),
  );
  rejects((rows) => (rows[0].questions[0].options[0].label = ""));
  rejects((rows) => (rows[0].questions[1].options = []));
  rejects((rows) => (rows[0].nerve_roots = ["C9"]));
  rejects((rows) => (rows[0].nerve_roots = ["L1"]));
  rejects((rows) => (rows[0].nerve_roots = ["C2"]));
  rejects((rows) => delete rows[0].nerve_roots);
  rejects((rows) => (rows[0].entries[0].impairment.value = -1));
  rejects((rows) => (rows[0].entries[0].impairment.value = 101));
  rejects((rows) => (rows[0].entries[0].impairment.unit = "percent"));
});

test("recursive rules require valid operators, references, values and counts", () => {
  rejects((rows) => (rows[0].entries[0].criteria = null));
  rejects((rows) => (rows[0].entries[0].criteria = { all: [] }));
  rejects(
    (rows) =>
      (rows[0].entries[0].criteria = {
        any: [{ field: "missing", equals: true }],
      }),
  );
  rejects(
    (rows) =>
      (rows[0].entries[0].criteria = { field: "cs_confirmed", equals: "true" }),
  );
  rejects(
    (rows) =>
      (rows[0].entries[0].criteria = {
        field: "sensory_status",
        equals: "invalid",
      }),
  );
  rejects((rows) => (rows[0].entries[0].criteria = { all: [], any: [] }));
  rejects(
    (rows) =>
      (rows[0].entries[0].criteria = {
        at_least: 2,
        of: [{ field: "cs_confirmed", equals: true }],
      }),
  );
  rejects(
    (rows) =>
      (rows[0].entries[0].criteria = {
        at_least: 0,
        of: [{ field: "cs_confirmed", equals: true }],
      }),
  );
  rejects(
    (rows) =>
      (rows[0].entries[0].criteria = {
        at_least: 1,
        of: [
          { field: "cs_confirmed", equals: true },
          { equals: true, field: "cs_confirmed" },
        ],
      }),
  );
});

test("tasks must cover PE questions and share consistent meanings", () => {
  rejects((rows) => delete rows[0].examination_tasks);
  rejects((rows) => (rows[0].examination_tasks = []));
  rejects((rows) =>
    rows[0].examination_tasks.push(rows[0].examination_tasks[0]),
  );
  rejects((rows) => (rows[0].examination_tasks[0].question_ids = ["missing"]));
  rejects(
    (rows) => (rows[0].examination_tasks[0].question_ids = ["cs_confirmed"]),
  );
  rejects((rows) =>
    rows[0].examination_tasks[0].question_ids.push("sensory_status"),
  );
  rejects((rows) => (rows[0].examination_tasks[0].prompt = " "));
  rejects((rows) => {
    const seen = new Set();
    for (const row of rows)
      for (const task of row.examination_tasks) {
        if (seen.has(task.id)) {
          task.help = "Changed shared task meaning";
          return;
        }
        seen.add(task.id);
      }
    assert.fail("Expected at least one shared task");
  });
});

test("invalid data is rejected before any database connection", async () => {
  const invalid = clone();
  invalid.at(-1).entries[0].criteria = { field: "missing", equals: true };
  await assert.rejects(
    importAmaReferenceData(
      "postgres://unreachable.invalid/no_database",
      invalid,
    ),
    (error) => error.name === "ZodError",
  );
});

// Opt-in PostgreSQL coverage uses an isolated temporary schema, then removes it.
test(
  "transactional import round-trips JSON, upserts, preserves unrelated rows and rolls back failures",
  {
    skip: !process.env.AMA_TEST_DATABASE_URL,
  },
  async () => {
    const schema = `ama_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Client({
      connectionString: process.env.AMA_TEST_DATABASE_URL,
    });
    await admin.connect();
    try {
      await admin.query(`CREATE SCHEMA "${schema}"`);
      await admin.query(`SET search_path TO "${schema}"`);
      await admin.query(
        await readFile(
          new URL("../drizzle/0005_ama_diagnostic_rows.sql", import.meta.url),
          "utf8",
        ),
      );
      const url = new URL(process.env.AMA_TEST_DATABASE_URL);
      url.searchParams.set("options", `-c search_path=${schema}`);
      const connectionString = url.toString();
      const unrelated = { ...clone()[0], row_id: "99-99-99" };
      await importAmaReferenceData(connectionString, [unrelated]);
      const expected = summarizeAmaReferenceData(upload);
      assert.deepEqual(
        await importAmaReferenceData(connectionString, upload),
        expected,
      );
      assert.deepEqual(
        await importAmaReferenceData(connectionString, upload),
        expected,
      );
      const stored = (
        await admin.query("SELECT * FROM ama_diagnostic_rows ORDER BY row_id")
      ).rows;
      assert.equal(stored.length, 31);
      for (const original of upload) {
        assert.deepEqual(
          stored.find((row) => row.row_id === original.row_id),
          {
            ...original,
            region_id: normalizeAmaRegion(original.region_id),
            help: original.help ?? null,
          },
        );
      }
      assert.ok(stored.some((row) => row.row_id === unrelated.row_id));
      const update = clone();
      update[0].examination_tasks[0].help += " Record findings.";
      await importAmaReferenceData(connectionString, update);
      assert.deepEqual(
        (
          await admin.query(
            "SELECT examination_tasks FROM ama_diagnostic_rows WHERE row_id = $1",
            [update[0].row_id],
          )
        ).rows[0].examination_tasks,
        update[0].examination_tasks,
      );
      await admin.query(
        "ALTER TABLE ama_diagnostic_rows ADD CHECK (position('FAIL' in description) = 0)",
      );
      const failing = clone();
      failing[0].description += " updated";
      failing[1].description += " FAIL";
      await assert.rejects(
        importAmaReferenceData(connectionString, failing),
        /check constraint/,
      );
      assert.equal(
        (
          await admin.query(
            "SELECT description FROM ama_diagnostic_rows WHERE row_id = $1",
            [upload[0].row_id],
          )
        ).rows[0].description,
        upload[0].description,
      );
    } finally {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  },
);

test("taxonomy AMA mappings default empty and reject invalid or cross-region references", async () => {
  const { referenceDataSchema, validateAmaDiagnosisMappings } =
    await import("../dist/db/referenceData/referenceDataSchema.js");
  const fixture = {
    manifest: { schema_version: 1, dataset_version: "test" },
    canonicalDiagnoses: [
      {
        id: "lumbar_dx",
        region_id: "lumbar_spine",
        label: "Lumbar diagnosis",
        icd_prefixes: [],
      },
    ],
    treatments: [
      { id: "pt", category: "conservative", label: "Physical therapy" },
    ],
    treatmentAliases: [],
    sources: [],
    ladderEntries: [],
    ladderEntrySources: [],
  };
  assert.deepEqual(
    referenceDataSchema.parse(fixture).canonicalDiagnoses[0].ama_row_ids,
    [],
  );
  fixture.canonicalDiagnoses[0].ama_row_ids = ["17-21-07"];
  const diagnoses = referenceDataSchema.parse(fixture).canonicalDiagnoses;
  const camelCaseFixture = structuredClone(fixture);
  camelCaseFixture.canonicalDiagnoses[0].icdPrefixes = ["M54.16", "M54.17"];
  delete camelCaseFixture.canonicalDiagnoses[0].icd_prefixes;
  const parsedCamelCase =
    referenceDataSchema.parse(camelCaseFixture).canonicalDiagnoses[0];
  assert.deepEqual(parsedCamelCase.icd_prefixes, ["M54.16", "M54.17"]);
  assert.deepEqual(parsedCamelCase.ama_row_ids, ["17-21-07"]);
  assert.doesNotThrow(() =>
    validateAmaDiagnosisMappings(diagnoses, [
      { rowId: "17-21-07", regionId: "lumbar_spine" },
    ]),
  );
  assert.throws(
    () => validateAmaDiagnosisMappings(diagnoses, []),
    /Unknown AMA row/,
  );
  assert.throws(
    () =>
      validateAmaDiagnosisMappings(diagnoses, [
        { rowId: "17-21-07", regionId: "cervical_spine" },
      ]),
    /does not match region/,
  );
  fixture.canonicalDiagnoses[0].ama_row_ids = ["17-21-07", "17-21-07"];
  assert.equal(referenceDataSchema.safeParse(fixture).success, false);
  fixture.canonicalDiagnoses[0].ama_row_ids = ["invalid"];
  assert.equal(referenceDataSchema.safeParse(fixture).success, false);
});

test(
  "diagnosis text-array join returns distinct rows within the requested region",
  {
    skip: !process.env.AMA_TEST_DATABASE_URL,
  },
  async () => {
    const client = new pg.Client({
      connectionString: process.env.AMA_TEST_DATABASE_URL,
    });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "CREATE TEMP TABLE canonical_diagnoses (LIKE public.canonical_diagnoses INCLUDING DEFAULTS) ON COMMIT DROP",
      );
      await client.query(`INSERT INTO canonical_diagnoses (id, region_id, label, icd_prefixes, ama_row_ids) VALUES
      ('dx1', 'lumbar_spine', 'First', '{}', ARRAY['17-21-07', '17-19-08']),
      ('dx2', 'lumbar_spine', 'Second', '{}', ARRAY['17-21-07']),
      ('dx3', 'cervical_spine', 'Third', '{}', ARRAY['17-21-08'])`);
      await client.query(
        "INSERT INTO canonical_diagnoses (id, region_id, label, icd_prefixes) VALUES ('unmapped', 'lumbar_spine', 'Unmapped', '{}')",
      );
      assert.deepEqual(
        (
          await client.query(
            "SELECT ama_row_ids FROM canonical_diagnoses WHERE id = 'unmapped'",
          )
        ).rows[0].ama_row_ids,
        [],
      );
      const result = await client.query(
        `SELECT DISTINCT r.*
      FROM canonical_diagnoses d JOIN public.ama_diagnostic_rows r ON r.row_id = ANY(d.ama_row_ids)
      WHERE d.id = ANY($1::text[]) AND d.region_id = $2 AND r.region_id = $2`,
        [["dx1", "dx2", "dx3", "unmapped"], "lumbar_spine"],
      );
      assert.deepEqual(
        result.rows.map((row) => row.row_id),
        ["17-21-07"],
      );
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  },
);
