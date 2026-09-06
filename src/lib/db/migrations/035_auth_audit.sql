-- Migration 035: Auth / account-change audit trail
--
-- Backs the "Account & Security" tab in the Settings console:
--   auth_audit: records who changed their own password/email or (owner) reset
--   another admin's password, when, and for which account. Mirrors the
--   app_secrets_audit pattern from migration 033.

CREATE TABLE IF NOT EXISTS auth_audit (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action           TEXT NOT NULL CHECK (action IN ('change_password','change_email','reset_password')),
  target_admin_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email     TEXT,
  admin_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_audit_created_idx ON auth_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_target_idx ON auth_audit (target_admin_id);

-- Server-side only (service_role). Admins read it through the API.
ALTER TABLE auth_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON auth_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE auth_audit_id_seq TO service_role;