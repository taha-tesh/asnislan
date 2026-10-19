-- جداول تسجيل دورة المقبلين على الزواج - آس نيسلان الطبعة 17
-- Tables are prefixed with "asnislan_" because the database is shared with other apps.

CREATE TABLE IF NOT EXISTS asnislan_registrations (
  id                BIGSERIAL PRIMARY KEY,
  full_name         TEXT        NOT NULL,
  birth_date        DATE        NOT NULL,
  residence         TEXT        NOT NULL,                 -- القصر
  profession        TEXT        NOT NULL,                 -- المهنة
  wedding_month     SMALLINT    NOT NULL CHECK (wedding_month BETWEEN 1 AND 12),
  wedding_year      SMALLINT    NOT NULL CHECK (wedding_year BETWEEN 2026 AND 2027),
  phone             TEXT        NOT NULL,                 -- رقم الهاتف (الواتساب)
  blood_type        TEXT        NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  payment_method    TEXT        NOT NULL CHECK (payment_method IN ('baridimob','dahabia','cash')),
  payment_status    TEXT        NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','rejected')),
  amount_dzd        INTEGER     NOT NULL DEFAULT 3000,
  card_holder       TEXT,                                 -- only for dahabia
  card_last4        TEXT,                                 -- only the last 4 digits are stored
  payment_reference TEXT,                                 -- gateway / transaction reference
  admin_note        TEXT,
  badge_token       TEXT        NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''), -- encoded in the badge QR code
  attended_at       TIMESTAMPTZ,                          -- set when QR is scanned (or admin marks present)
  created_by_admin  BOOLEAN     NOT NULL DEFAULT false,   -- walk-in registrations (cash)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asnislan_wedding_range CHECK (
    (wedding_year = 2026 AND wedding_month = 12) OR
    (wedding_year = 2027 AND wedding_month BETWEEN 1 AND 11)
  )
);

-- Migration for databases created before the badge feature
ALTER TABLE asnislan_registrations
  ADD COLUMN IF NOT EXISTS badge_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');
UPDATE asnislan_registrations SET badge_token = replace(gen_random_uuid()::text, '-', '') WHERE badge_token IS NULL;
ALTER TABLE asnislan_registrations ALTER COLUMN badge_token SET NOT NULL;

-- Attendance + admin walk-in (cash)
ALTER TABLE asnislan_registrations
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'asnislan_registrations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%payment_method%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE asnislan_registrations DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE asnislan_registrations
    ADD CONSTRAINT asnislan_registrations_payment_method_check
    CHECK (payment_method IN ('baridimob', 'dahabia', 'cash'));
END $$;

CREATE INDEX IF NOT EXISTS asnislan_registrations_created_at_idx ON asnislan_registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS asnislan_registrations_phone_idx      ON asnislan_registrations (phone);
CREATE INDEX IF NOT EXISTS asnislan_registrations_attended_at_idx ON asnislan_registrations (attended_at DESC NULLS LAST);

-- وصل التحويل (بريدي موب) — يُرفع إلى Cloudinary؛ تُحفظ البيانات الوصفية + الرابط هنا
CREATE TABLE IF NOT EXISTS asnislan_receipts (
  id                    BIGSERIAL PRIMARY KEY,
  registration_id       BIGINT      NOT NULL UNIQUE REFERENCES asnislan_registrations(id) ON DELETE CASCADE,
  file_name             TEXT        NOT NULL,
  mime_type             TEXT        NOT NULL,
  size_bytes            INTEGER     NOT NULL,
  data                  BYTEA,      -- legacy only (older rows); new uploads store bytes on Cloudinary
  cloudinary_url        TEXT,
  cloudinary_public_id  TEXT,
  cloudinary_resource_type TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration: allow Cloudinary-backed receipts (no local BYTEA required)
ALTER TABLE asnislan_receipts ALTER COLUMN data DROP NOT NULL;
ALTER TABLE asnislan_receipts ADD COLUMN IF NOT EXISTS cloudinary_url TEXT;
ALTER TABLE asnislan_receipts ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE asnislan_receipts ADD COLUMN IF NOT EXISTS cloudinary_resource_type TEXT;

CREATE OR REPLACE FUNCTION asnislan_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asnislan_registrations_updated_at ON asnislan_registrations;
CREATE TRIGGER asnislan_registrations_updated_at
  BEFORE UPDATE ON asnislan_registrations
  FOR EACH ROW EXECUTE FUNCTION asnislan_set_updated_at();
