import { z } from "zod";
import { NotImplementedError } from "../errors/notImplementedError.js";
import type { CaseArtifactBundle } from "./caseArtifactQueries.js";

// TODO: Replace this placeholder with the authoritative deterministic-signal
// schema when the signal catalog and UI contract are defined.
export const deterministicSignalsSchema = z.array(z.unknown());

export type DeterministicSignals = z.infer<typeof deterministicSignalsSchema>;

export const getDeterministicSignals = async (
  _artifacts: CaseArtifactBundle,
): Promise<DeterministicSignals> => {
  throw new NotImplementedError(
    "getDeterministicSignals is scaffolded but its signal rules are not implemented",
  );
};
