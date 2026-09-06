-- Migration 034: Managed app configuration (non-secret) + audit
--
-- Pillar 3 of the production settings console. app_config holds typed,
-- non-secret site settings (feature flags, SEO defaults, analytics switches)
-- managed from the admin Settings UI. Public pages read defaults server-side.
-- Each change is audited (old_value / new_value).

CREATE TABLE IF NOT EXISTS app_config (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL,
  category     TEXT NOT NULL DEFAULT 'general',
  description  TEXT,
  updated_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_config_category_idx ON app_config (category);

CREATE TABLE IF NOT EXISTS app_config_audit (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key         TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('set','delete')),
  old_value   JSONB,
  new_value   JSONB,
  admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_config_audit_created_idx ON app_config_audit (created_at DESC);

-- RLS: service_role only. Public pages get values via the server API.
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config_audit ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON app_config TO service_role;
GRANT SELECT, INSERT ON app_config_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE app_config_audit_id_seq TO service_role;