-- Migration 033: App secrets vault + owner role + audits
--
-- Pillar 1 of the production settings console. Adds:
--   * an 'owner' role to admin_users (owner is the only role that can write
--     / rotate / reset credentials in the settings UI)
--   * app_secrets: AES-256-GCM encrypted credential overrides. Values are
--     encrypted server-side; the browser only ever sees the masked hint and
--     has_value flag.
--   * app_secrets_audit: who set/reset/deleted which key, when.

-- Owner role ---------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin','editor','viewer','owner'));

-- Secrets vault ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_secrets (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service          TEXT NOT NULL,
  key              TEXT NOT NULL,
  encrypted_value  TEXT NOT NULL,
  salt             TEXT NOT NULL,
  iv               TEXT NOT NULL,
  updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service, key)
);

CREATE INDEX IF NOT EXISTS app_secrets_service_key_idx ON app_secrets (service, key);

-- Secrets audit trail ------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_secrets_audit (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service     TEXT NOT NULL,
  key         TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('set','reset','delete')),
  admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_secrets_audit_created_idx ON app_secrets_audit (created_at DESC);

-- RLS: service_role only (server-side). No anon/authenticated access — these
-- are encrypted credentials and must never be readable from the browser.
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_secrets_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON app_secrets TO service_role;
GRANT SELECT, INSERT ON app_secrets_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE app_secrets_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE app_secrets_audit_id_seq TO service_role;