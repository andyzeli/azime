import { and, eq } from "drizzle-orm";
import {
  regionDiagnosesResponseSchema,
  saveRegionDiagnosesRequestSchema,
  type DiagnosisState,
  type Region,
  type RegionDiagnosesResponse,
  type SaveRegionDiagnosesRequest,
} from "@azime/contracts";
import { db } from "../db/index.js";
import { CaseRegionDiagnoses, PatientCase } from "../db/schema.js";
import { MissingPrerequisiteError } from "../errors/missingPrerequisiteError.js";
import { getCanonicalDiagnoses } from "./canonicalDiagnosesQueries.js";
import { getStoredPreExamAnalysis } from "./preExamAnalysisQueries.js";
import { getRegionDiagnoses } from "./preExamInputSnapshotQueries.js";

export class InvalidRegionDiagnosesError extends Error {}

const entry = (
  canonicalDx: string,
  source: DiagnosisState["source"],
  status: DiagnosisState["status"]
): DiagnosisState => ({ canonicalDx, source, status, reason: null });

// Record diagnoses plus any canonical one for the region (same rule as the 3A snapshot).
const allowedDiagnoses = async (inRecords: string[], region: Region) =>
  new Set([
    ...inRecords,
    ...(await getCanonicalDiagnoses(region)).map((d) => d.canonicalDx),
  ]);

// Before the first save the list is derived: the 3A scope if one was taken, else nothing;
// every record diagnosis is then appended as working, including ones found after a save.
// Entries that are no longer allowed (e.g. left behind after re-extraction) are dropped.
export async function getRegionDiagnosisList(
  caseId: number,
  region: Region
): Promise<RegionDiagnosesResponse> {
  const [row, inRecords, preExam] = await Promise.all([
    db.query.CaseRegionDiagnoses.findFirst({
      where: and(
        eq(CaseRegionDiagnoses.caseId, caseId),
        eq(CaseRegionDiagnoses.region, region)
      ),
    }),
    getRegionDiagnoses(caseId, region),
    getStoredPreExamAnalysis(caseId, region),
  ]);
  const allowed = await allowedDiagnoses(inRecords, region);
  const scope = preExam?.inputSnapshot?.scope.diagnoses;
  const saved = (
    row?.diagnoses ??
    (scope ?? []).map((dx) =>
      entry(dx, inRecords.includes(dx) ? "records" : "added", "working")
    )
  ).filter((d) => allowed.has(d.canonicalDx));
  const diagnoses = [
    ...saved,
    ...inRecords
      .filter((dx) => !saved.some((d) => d.canonicalDx === dx))
      .map((dx) => entry(dx, "records", "working")),
  ];
  return regionDiagnosesResponseSchema.parse({
    caseId,
    region,
    diagnoses,
    revision: row?.revision ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  });
}

export async function saveRegionDiagnosisList(
  caseId: number,
  region: Region,
  input: SaveRegionDiagnosesRequest
) {
  const { diagnoses, expectedRevision } =
    saveRegionDiagnosesRequestSchema.parse(input);
  const ids = diagnoses.map((d) => d.canonicalDx);
  if (new Set(ids).size !== ids.length)
    throw new InvalidRegionDiagnosesError("A diagnosis is listed twice");
  const allowed = await allowedDiagnoses(
    await getRegionDiagnoses(caseId, region),
    region
  );
  const unknown = ids.filter((id) => !allowed.has(id));
  if (unknown.length)
    throw new InvalidRegionDiagnosesError(
      `Not a ${region} diagnosis: ${unknown.join(", ")}`
    );

  await db.transaction(async (tx) => {
    // Lock the parent so two first saves cannot both create revision 1.
    const [patientCase] = await tx
      .select({ regions: PatientCase.regions })
      .from(PatientCase)
      .where(eq(PatientCase.id, caseId))
      .for("update");
    if (!patientCase?.regions.includes(region))
      throw new InvalidRegionDiagnosesError("Region is not in scope for this case");

    const existing = await tx.query.CaseRegionDiagnoses.findFirst({
      where: and(
        eq(CaseRegionDiagnoses.caseId, caseId),
        eq(CaseRegionDiagnoses.region, region)
      ),
    });
    if ((existing?.revision ?? 0) !== expectedRevision)
      throw new MissingPrerequisiteError("Diagnoses changed. Reload before saving");

    if (existing)
      await tx
        .update(CaseRegionDiagnoses)
        .set({ diagnoses, revision: existing.revision + 1, updatedAt: new Date() })
        .where(eq(CaseRegionDiagnoses.id, existing.id));
    else await tx.insert(CaseRegionDiagnoses).values({ caseId, region, diagnoses });
  });
  return getRegionDiagnosisList(caseId, region);
}
