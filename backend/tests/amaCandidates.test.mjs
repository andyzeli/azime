import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAmaRegion } from "@azime/contracts";
import { selectAmaCandidates } from "../dist/ama/candidates.js";

const rows = JSON.parse(
  await readFile(new URL("../../docs/ama-spine.upload.json", import.meta.url), "utf8"),
).map((row) => ({ ...row, region_id: normalizeAmaRegion(row.region_id) }));
const lumbarRootRows = ["17-21-03", "17-21-04", "17-21-05", "17-21-06", "17-21-07", "17-21-08"];
const select = (region, diagnoses, mappings) =>
  selectAmaCandidates(region, diagnoses, new Map(Object.entries(mappings)), rows);

test("L5 narrows radiculopathy rows to the L5 row", () => {
  const result = select(
    "lumbar_spine",
    [{ canonicalDx: "lumbar_radiculopathy", affectedRoots: ["L5"] }],
    { lumbar_radiculopathy: lumbarRootRows },
  );
  assert.deepEqual(result.diagnoses[0].candidateRowIds, ["17-21-07"]);
  assert.deepEqual(result.rows.map((r) => r.row_id), ["17-21-07"]);
});

test("unknown roots keep every mapped root row; [] keeps only non-root rows", () => {
  const nonRoot = rows.find((r) => r.region_id === "lumbar_spine" && r.nerve_roots.length === 0);
  const mappings = { lumbar_disc_herniation: [nonRoot.row_id, ...lumbarRootRows] };
  const unknown = select("lumbar_spine", [{ canonicalDx: "lumbar_disc_herniation", affectedRoots: null }], mappings);
  assert.equal(unknown.diagnoses[0].candidateRowIds.length, 7);
  const none = select("lumbar_spine", [{ canonicalDx: "lumbar_disc_herniation", affectedRoots: [] }], mappings);
  assert.deepEqual(none.diagnoses[0].candidateRowIds, [nonRoot.row_id]);
});

test("T2-T12 row matches any root in its range", () => {
  const result = select(
    "thoracic_spine",
    [{ canonicalDx: "thoracic_radiculopathy", affectedRoots: ["T7"] }],
    { thoracic_radiculopathy: ["17-20-04"] },
  );
  assert.deepEqual(result.diagnoses[0].candidateRowIds, ["17-20-04"]);
});

test("unmapped diagnoses, other-region rows and shared rows", () => {
  const result = select(
    "lumbar_spine",
    [
      { canonicalDx: "lumbar_radiculopathy", affectedRoots: ["L5"] },
      { canonicalDx: "lumbar_disc_herniation", affectedRoots: ["L5"] },
      { canonicalDx: "lumbar_nonspecific_strain_sprain", affectedRoots: null },
    ],
    {
      lumbar_radiculopathy: lumbarRootRows,
      lumbar_disc_herniation: ["17-21-07", "17-20-04"],
      lumbar_nonspecific_strain_sprain: [],
    },
  );
  assert.deepEqual(result.diagnoses[1].candidateRowIds, ["17-21-07"]);
  assert.deepEqual(result.diagnoses[2], {
    canonicalDx: "lumbar_nonspecific_strain_sprain",
    affectedRoots: null,
    mappedRowIds: [],
    candidateRowIds: [],
    candidateTableIds: [],
  });
  assert.deepEqual(result.rows.map((r) => r.row_id), ["17-21-07"]);
});
