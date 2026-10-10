// Creates the database tables. Run with: npm run db:setup
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
process.loadEnvFile?.(join(here, "..", ".env"));

const sql = readFileSync(join(here, "schema.sql"), "utf8");

const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE 'asnislan_%' ORDER BY 1`,
  );
  console.log("Tables ready:", rows.map((r) => r.table_name).join(", "));
} finally {
  await client.end();
}
