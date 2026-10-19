import "server-only";
import { pool } from "./db";

let ensured = false;

/** Idempotent migrations so production picks up attendance/cash columns without a manual SQL run. */
export async function ensureSchema() {
  if (ensured) return;
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE asnislan_registrations
        ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT false
    `);

    // Expand payment_method to allow 'cash' (admin walk-in registrations).
    await client.query(`
      DO $$
      DECLARE
        cname text;
        cdef text;
      BEGIN
        SELECT conname, pg_get_constraintdef(oid) INTO cname, cdef
        FROM pg_constraint
        WHERE conrelid = 'asnislan_registrations'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%payment_method%'
        LIMIT 1;
        IF cdef IS NOT NULL AND cdef NOT ILIKE '%cash%' THEN
          EXECUTE format('ALTER TABLE asnislan_registrations DROP CONSTRAINT %I', cname);
          ALTER TABLE asnislan_registrations
            ADD CONSTRAINT asnislan_registrations_payment_method_check
            CHECK (payment_method IN ('baridimob', 'dahabia', 'cash'));
        ELSIF cname IS NULL THEN
          ALTER TABLE asnislan_registrations
            ADD CONSTRAINT asnislan_registrations_payment_method_check
            CHECK (payment_method IN ('baridimob', 'dahabia', 'cash'));
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS asnislan_registrations_attended_at_idx
        ON asnislan_registrations (attended_at DESC NULLS LAST)
    `);

    ensured = true;
  } finally {
    client.release();
  }
}
