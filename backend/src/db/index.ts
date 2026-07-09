import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Client, Pool } = pkg;
import * as schema from "./schema.js";

const isProduction = process.env.NODE_ENV === "production";
const dbClient = isProduction
  ? new Pool({
      connectionString: process.env.NEXT_PUBLIC_SUPABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL in production
    })
  : new Client({
      connectionString: "postgres://localhost/azime",
    });

// Connect only for local development with Client
if (!isProduction) {
  dbClient.connect().catch((err) => {
    console.error("Error connecting to local database:", err);
    process.exit(1);
  });
}

export const db = drizzle(dbClient, { schema });
