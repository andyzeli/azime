import { z } from "zod";
import { NotImplementedError } from "../errors/notImplementedError.js";

// TODO: Replace this placeholder with the authoritative physician-steering
// schema before enabling steering writes.
export const physicianSteeringSchema = z.object({});

export type PhysicianSteering = z.infer<typeof physicianSteeringSchema>;

export const assertPhysicianSteeringReady = () => {
  throw new NotImplementedError(
    "Physician steering is scaffolded but its schema is not implemented",
  );
};
