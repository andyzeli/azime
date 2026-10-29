import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema.js";

// Cloud Run connects to Cloud SQL over a unix socket:
// postgresql://USER:PASS@/DB?host=/cloudsql/PROJECT:REGION:INSTANCE
const dbClient = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://localhost/azime",
  max: 5,
});

export const db = drizzle(dbClient, { schema });
