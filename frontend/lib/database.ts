import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/database-schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to use the MIRROR database.");
}

declare global {
  var mirrorDatabasePool: Pool | undefined;
}

const pool =
  globalThis.mirrorDatabasePool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.mirrorDatabasePool = pool;
}

export const db = drizzle(pool, { schema });
