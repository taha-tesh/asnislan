import "server-only";
import { Pool, type QueryResultRow } from "pg";

declare global {
  var __asnislanPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

// Reuse the pool across hot reloads in development.
const pool = globalThis.__asnislanPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__asnislanPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<T>(text, params);
}

export { pool };
