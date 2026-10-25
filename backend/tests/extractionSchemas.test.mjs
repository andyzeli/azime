import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  createStoredSchema,
  extractionRegistry,
  getExtractionConfig,
  safeParseStoredExtraction,
} from "../dist/ai/gemini/registry.js";
import { buildExtractionPrompt } from "../dist/ai/gemini/buildExtraction.js";
import { buildDiagnosisMentions } from "../dist/records/diagnosisMentions.js";

const caseRegions = ["lumbar_spine", "cervical_spine"];
const context = {
  canonicalDiagnoses: [
    {
      id: "opaque-diagnosis-id",
      regionId: "lumbar_spine",
      label: "disc_herniation",
      definition: "Lumbar disc herniation category",
      icdPrefixes: ["M51"],
    },
  ],
};
const diagnosis = {
  evidence: { page: 1, quote: "Lumbar disc herniation" },
  name: "Lumbar disc herniation",
  icd: null,
  region: "lumbar_spine",
  canonicalDx: "disc_herniation",
};
const liveDiagnosis = {
  evidence: diagnosis.evidence,
  name: diagnosis.name,
  icd: diagnosis.icd,
  canonicalDx: "lumbar_spine.disc_herniation",
};
const treatment = {
  name: "Epidural injection",
  bodySite: "L4-L5",
  region: "lumbar_spine",
  treatmentType: "injection",
  laterality: "midline",
  guidanceMethod: "fluoroscopy",
  medicationsInjected: [{ name: "Lidocaine", dose: "1 mL" }],
  immediate_response: "Tolerated well",
  complications: "",
};

const examples = [
  {
    documentType: "encounter",
    payload: {
      visitType: "follow_up",
      regions: ["lumbar_spine"],
      chiefComplaint: "Low back pain",
      historyOfPresentIllness: "",
      reviewOfSystems: "",
      reportedDateOfInjury: "",
      functionalLimitations: [],
      workStatus: { restrictions: [], status: "unknown" },
      pastMedicalHistory: "",
      objective: "",
      assessment: "",
      medications: [],
      diagnoses: [liveDiagnosis],
      imagingFindings: [],
      treatmentsPerformed: [treatment],
      diagnosticOrders: [],
      referrals: [],
      followUpPlan: "",
    },
    item: (payload) => payload.treatmentsPerformed[0],
    regionSchema: (schema) =>
      schema.properties.treatmentsPerformed.items.properties.region,
  },
  {
    documentType: "intervention_report",
    payload: { ...treatment, indication: "Back pain", followUpPlan: "" },
    item: (payload) => payload,
    regionSchema: (schema) => schema.properties.region,
  },
  {
    documentType: "surgery_report",
    payload: {
      preOpDiagnoses: [liveDiagnosis],
      postOpDiagnoses: [liveDiagnosis],
      proceduresPerformed: [
        { name: "Discectomy", bodySite: "L4-L5", region: "lumbar_spine" },
      ],
      implantsAndHardware: [],
      operativeFindings: "",
      complications: "",
      postOpPlanAndRestrictions: "",
    },
    item: (payload) => payload.proceduresPerformed[0],
    regionSchema: (schema) =>
      schema.properties.proceduresPerformed.items.properties.region,
  },
  {
    documentType: "therapy_note",
    payload: {
      regions: ["lumbar_spine"],
      historyOfPresentIllness: "",
      therapiesPerformed: [],
      objectiveMetrics: [],
      functionalLimitations: [],
      therapistAssessment: "",
      followUpPlan: "",
      noteType: "daily_note",
    },
    item: (payload) => payload,
    regionSchema: (schema) => schema.properties.regions.items,
  },
];

const record = {
  id: 15,
  caseId: 3,
  documentType: "encounter",
  eventDate: "2026-09-18",
};
const expectedMention = {
  caseId: record.caseId,
  recordId: record.id,
  name: diagnosis.name,
  icd: diagnosis.icd,
  region: diagnosis.region,
  canonicalDx: diagnosis.canonicalDx,
  evidencePage: diagnosis.evidence.page,
  evidenceQuote: diagnosis.evidence.quote,
  eventDate: record.eventDate,
};

test("stored encounter and surgery schemas split canonical diagnosis labels", () => {
  for (const example of examples.filter(({ documentType }) =>
    ["encounter", "surgery_report"].includes(documentType),
  )) {
    const config = getExtractionConfig(
      example.documentType,
      caseRegions,
      context,
    );
    const stored = createStoredSchema(
      config.schema,
      example.documentType,
    ).parse({ ...structuredClone(example.payload), schemaVersion: "v1" });
    const diagnoses =
      example.documentType === "encounter"
        ? stored.diagnoses
        : [...stored.preOpDiagnoses, ...stored.postOpDiagnoses];

    for (const storedDiagnosis of diagnoses) {
      assert.equal(storedDiagnosis.region, "lumbar_spine");
      assert.equal(storedDiagnosis.canonicalDx, "disc_herniation");
    }
  }
});

test("unresolved diagnoses are stored with an unclear region", () => {
  const config = getExtractionConfig("encounter", caseRegions, context);
  const stored = createStoredSchema(config.schema, "encounter").parse({
    ...structuredClone(examples[0].payload),
    diagnoses: [{ ...liveDiagnosis, canonicalDx: "unresolved" }],
    schemaVersion: "v1",
  });

  assert.equal(stored.diagnoses[0].region, "unclear");
  assert.equal(stored.diagnoses[0].canonicalDx, "unresolved");
});

test("encounter diagnoses project to source-linked mentions", () => {
  assert.deepEqual(
    buildDiagnosisMentions(record, {
      ...examples[0].payload,
      diagnoses: [diagnosis],
      schemaVersion: "v1",
    }),
    [expectedMention],
  );
});

test("surgery projects both pre-op and post-op mentions without deduplicating evidence", () => {
  const postOpDiagnosis = {
    ...diagnosis,
    icd: "M51.26",
    evidence: { page: 2, quote: "Post-op diagnosis: Lumbar disc herniation" },
  };
  assert.deepEqual(
    buildDiagnosisMentions(
      { ...record, documentType: "surgery_report" },
      {
        ...examples[2].payload,
        preOpDiagnoses: [diagnosis],
        postOpDiagnoses: [postOpDiagnosis],
        schemaVersion: "v1",
      },
    ),
    [
      expectedMention,
      {
        ...expectedMention,
        icd: "M51.26",
        evidencePage: 2,
        evidenceQuote: postOpDiagnosis.evidence.quote,
      },
    ],
  );
});

test("diagnosis projection preserves unresolved mappings and nullable source dates", () => {
  const summary = {
    ...examples[0].payload,
    diagnoses: [{ ...diagnosis, region: "unclear", canonicalDx: "unresolved" }],
    schemaVersion: "v1",
  };
  assert.deepEqual(
    buildDiagnosisMentions({ ...record, eventDate: null }, summary),
    [
      {
        ...expectedMention,
        region: "unclear",
        canonicalDx: "unresolved",
        eventDate: null,
      },
    ],
  );
});

test("empty diagnosis arrays and other document types produce no mentions", () => {
  assert.deepEqual(
    buildDiagnosisMentions(record, {
      ...examples[0].payload,
      diagnoses: [],
      schemaVersion: "v1",
    }),
    [],
  );
  assert.deepEqual(
    buildDiagnosisMentions(
      { ...record, documentType: "surgery_report" },
      {
        ...examples[2].payload,
        preOpDiagnoses: [],
        postOpDiagnoses: [],
        schemaVersion: "v1",
      },
    ),
    [],
  );
  for (const documentType of [
    "intervention_report",
    "therapy_note",
    "imaging_report",
    "generic",
  ]) {
    assert.deepEqual(
      buildDiagnosisMentions({ ...record, documentType }, {}),
      [],
    );
  }
});

test("diagnosis projection rejects missing case IDs and invalid source evidence", () => {
  const summary = { ...examples[0].payload, schemaVersion: "v1" };
  assert.throws(
    () => buildDiagnosisMentions({ ...record, caseId: null }, summary),
    /case id/,
  );
  assert.throws(() =>
    buildDiagnosisMentions(record, {
      ...summary,
      diagnoses: [{ ...diagnosis, evidence: { page: 1 } }],
    }),
  );
});

function setRegion(example, payload, region) {
  if (example.documentType === "therapy_note") {
    payload.regions = [region];
  } else {
    example.item(payload).region = region;
  }
}

for (const example of examples) {
  test(`${example.documentType}: live schema preserves fields and closes region enum`, () => {
    const config = getExtractionConfig(
      example.documentType,
      caseRegions,
      context,
    );
    assert.deepEqual(config.schema.parse(example.payload), example.payload);
    const json = z.toJSONSchema(config.schema);
    assert.deepEqual(example.regionSchema(json).enum, [
      "other_body_part",
      "unclear",
      ...caseRegions,
    ]);
    assert.deepEqual(
      Object.keys(json.properties).sort(),
      Object.keys(example.payload).sort(),
    );

    for (const region of [...caseRegions, "other_body_part", "unclear"]) {
      const payload = structuredClone(example.payload);
      setRegion(example, payload, region);
      assert.equal(config.schema.safeParse(payload).success, true);
    }
    const payload = structuredClone(example.payload);
    setRegion(example, payload, "shoulder");
    assert.equal(config.schema.safeParse(payload).success, false);
    assert.throws(
      () => getExtractionConfig(example.documentType, [], context),
      /Case regions are required/,
    );
  });

  test(`${example.documentType}: stored reader preserves historical regions and nested fields`, () => {
    const config = getExtractionConfig(
      example.documentType,
      caseRegions,
      context,
    );
    const stored = createStoredSchema(
      config.schema,
      example.documentType,
    ).parse({ ...structuredClone(example.payload), schemaVersion: "v1" });
    setRegion(example, stored, "historical_region");
    const parsed = safeParseStoredExtraction(example.documentType, stored);
    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data, stored);
  });
}

test("intervention and therapy need regions but no diagnosis catalog", () => {
  for (const example of examples.filter(({ documentType }) =>
    ["intervention_report", "therapy_note"].includes(documentType),
  )) {
    assert.deepEqual(
      getExtractionConfig(example.documentType, caseRegions).schema.parse(
        example.payload,
      ),
      example.payload,
    );
  }
});

test("encounter and surgery require a diagnosis catalog and retain closed diagnosis enums", () => {
  for (const documentType of ["encounter", "surgery_report"]) {
    assert.throws(
      () => getExtractionConfig(documentType, caseRegions),
      /Canonical diagnoses are required/,
    );
    assert.throws(
      () =>
        getExtractionConfig(documentType, caseRegions, {
          canonicalDiagnoses: [],
        }),
      /Canonical diagnoses are required/,
    );
    const schema = getExtractionConfig(
      documentType,
      caseRegions,
      context,
    ).schema;
    const arrays =
      documentType === "encounter"
        ? [schema.shape.diagnoses]
        : [schema.shape.preOpDiagnoses, schema.shape.postOpDiagnoses];
    for (const array of arrays) {
      assert.ok(array.description);
      const item = array.element;
      assert.equal(
        item.safeParse({ ...diagnosis, canonicalDx: "unresolved" }).success,
        true,
      );
      assert.equal(item.safeParse(liveDiagnosis).success, true);
      assert.equal(
        item.safeParse({
          ...liveDiagnosis,
          canonicalDx: "lumbar_spine.opaque-diagnosis-id",
        }).success,
        false,
      );
      assert.equal(
        item.safeParse({ ...diagnosis, canonicalDx: "outside_catalog" })
          .success,
        false,
      );
    }
  }
});

test("documents without region fields retain their static config", () => {
  assert.equal(
    getExtractionConfig("imaging_report", []),
    extractionRegistry.imaging_report,
  );
});

test("the region enum uses the provided case values rather than a hardcoded catalog", () => {
  const schema = getExtractionConfig("intervention_report", [
    "shoulder",
  ]).schema;
  assert.equal(
    schema.safeParse({
      ...treatment,
      region: "shoulder",
      indication: "",
      followUpPlan: "",
    }).success,
    true,
  );
  assert.equal(
    schema.safeParse({
      ...treatment,
      region: "lumbar_spine",
      indication: "",
      followUpPlan: "",
    }).success,
    false,
  );
});

test("region prompt context is independent of the diagnosis catalog", () => {
  const prompt = buildExtractionPrompt({
    documentType: "therapy_note",
    date: null,
    documentMetadata: null,
    caseRegions,
  });
  assert.ok(prompt.includes(JSON.stringify(caseRegions)));
  assert.ok(prompt.includes("other_body_part"));
  assert.ok(!prompt.includes("Canonical diagnosis taxonomy"));
});
