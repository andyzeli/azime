import type {
  PhysicianSteering,
  StoredPreExamAnalysis,
} from "@azime/contracts";
import type { PreExamInputSnapshot } from "./preExamInputSnapshot.js";

export class PhysicianSteeringError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 409,
  ) {
    super(message);
    this.name = "PhysicianSteeringError";
  }
}

// Shape validation lives in contracts; these checks bind decisions to the
// actual regional analysis and its frozen evidence, not arbitrary client IDs.
export function validatePhysicianSteeringReferences(
  steering: PhysicianSteering,
  analysis: StoredPreExamAnalysis,
  snapshot: PreExamInputSnapshot,
): void {
  const invalid = (message: string): never => {
    throw new PhysicianSteeringError(message, 400);
  };
  const rows = new Map(analysis.treatmentAnalysis.map((row) => [row.id, row]));

  for (const [id, review] of Object.entries(steering.treatments)) {
    const row = rows.get(id);
    if (!row) invalid(`Unknown treatment row: ${id}`);
    for (const diagnosis of Object.keys(review.assessments ?? {})) {
      if (!row!.assessments.some((item) => item.canonicalDx === diagnosis)) {
        invalid(`Diagnosis ${diagnosis} has no assessment on treatment ${id}`);
      }
    }
  }

  for (const field of ["inconsistencies", "evidenceGaps"] as const) {
    const ids = new Set(analysis[field].map((finding) => finding.id));
    for (const id of Object.keys(steering[field])) {
      if (!ids.has(id)) invalid(`Unknown ${field} item: ${id}`);
    }
  }

  const addedIds = new Set<string>();
  const diagnoses = new Set(snapshot.scope.diagnoses);
  const taxonomyIds = new Set(
    snapshot.ladder.map((entry) => entry.treatmentId),
  );

  for (const treatment of steering.addedTreatments) {
    if (rows.has(treatment.id) || addedIds.has(treatment.id)) {
      invalid(`Duplicate treatment row ID: ${treatment.id}`);
    }
    addedIds.add(treatment.id);
    if (
      treatment.treatmentId !== null &&
      !taxonomyIds.has(treatment.treatmentId)
    ) {
      invalid(
        `Treatment is not in the snapshot taxonomy: ${treatment.treatmentId}`,
      );
    }
    if (Object.keys(treatment.assessments).length === 0) {
      invalid("Added treatments require at least one diagnosis assessment");
    }
    for (const diagnosis of Object.keys(treatment.assessments)) {
      if (!diagnoses.has(diagnosis))
        invalid(`Diagnosis is outside the snapshot scope: ${diagnosis}`);
    }
  }
}
