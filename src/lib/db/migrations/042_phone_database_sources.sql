-- Migration 042: Phone Database — sources, provenance, import runs, audit trail.
-- Implements "FweezyTech Phone Database.md" §11 (source management), §17–18
-- (provenance + raw data), §19–20 (dupes/variants), §24–25 (runs + audit).
--
-- The existing JSONB specs_* columns on `devices` remain the canonical spec
-- store. These tables ADD source governance around them.
--
-- Secret hygiene mirrors migration 041: source credentials are NEVER stored in
-- the DB — each source row references an ENV variable name (auth_env_key).

-- ── 1. sources ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,           -- 'manufacturer' · 'mobileapi' · 'gsmarena' · 'nanoreview' · 'fweezytech-admin'
  name          TEXT NOT NULL,
  source_type   TEXT NOT NULL CHECK (source_type IN
                  ('manufacturer', 'spec-api', 'aggregator', 'benchmark', 'manual')),
  base_url      TEXT,
  api_endpoint  TEXT,
  auth_type     TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'query', 'basic')),
  auth_env_key  TEXT,                           -- name of the ENV var holding the secret (never the secret)
  adapter_name  TEXT,                           -- e.g. 'mobileapi' | 'gsmarena' | 'nanoreview'
  priority      INTEGER NOT NULL DEFAULT 50,    -- lower = higher priority; configurable (§11a)
  supported_fields JSONB NOT NULL DEFAULT '[]', -- which spec sections/fields this source provides
  active        BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_active_idx ON sources(active, priority);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sources_admin_all ON sources;
CREATE POLICY sources_admin_all ON sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS sources_public_read ON sources;
CREATE POLICY sources_public_read ON sources FOR SELECT USING (true);
GRANT ALL ON sources TO service_role;
GRANT SELECT ON sources TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE sources_id_seq TO service_role;

-- ── 2. device_spec_sources (field-level provenance, §17) ─────────────────────
-- One row per imported field path, e.g. device 42 / 'specs_battery.capacity_mah'.
-- `manual_override` = TRUE protects the value from silent overwrite by future
-- automated imports (§16) — later conflicts must be flagged, not applied.
CREATE TABLE IF NOT EXISTS device_spec_sources (
  id            BIGSERIAL PRIMARY KEY,
  device_id     BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  field_path    TEXT NOT NULL,                  -- 'specs_battery.capacity_mah'
  source_id     BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  source_label  TEXT,                           -- denormalized fallback ('GSMArena')
  source_url    TEXT,
  imported_value JSONB,                         -- value as the source reported it
  current_value JSONB,                          -- value as currently stored (post-correction)
  verification_status TEXT NOT NULL DEFAULT 'pending'
                  CHECK (verification_status IN ('pending', 'verified', 'conflict', 'rejected')),
  manual_override BOOLEAN NOT NULL DEFAULT false,
  import_run_id BIGINT,
  retrieved_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, field_path)
);

CREATE INDEX IF NOT EXISTS device_spec_sources_device_idx ON device_spec_sources(device_id);
CREATE INDEX IF NOT EXISTS device_spec_sources_source_idx ON device_spec_sources(source_id);
CREATE INDEX IF NOT EXISTS device_spec_sources_override_idx ON device_spec_sources(manual_override) WHERE manual_override;

ALTER TABLE device_spec_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_spec_sources_admin_all ON device_spec_sources;
CREATE POLICY device_spec_sources_admin_all ON device_spec_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS device_spec_sources_public_read ON device_spec_sources;
CREATE POLICY device_spec_sources_public_read ON device_spec_sources FOR SELECT USING (true);
GRANT ALL ON device_spec_sources TO service_role;
GRANT SELECT ON device_spec_sources TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE device_spec_sources_id_seq TO service_role;

-- ── 3. device_source_raw_data (§18) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_source_raw_data (
  id            BIGSERIAL PRIMARY KEY,
  device_id     BIGINT REFERENCES devices(id) ON DELETE CASCADE,
  source_id     BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  external_id   TEXT,                           -- the source's own id for the device
  raw_response  JSONB NOT NULL,                 -- preserved raw payload
  source_url    TEXT,
  import_run_id BIGINT,
  retrieved_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_source_raw_data_device_idx ON device_source_raw_data(device_id);

ALTER TABLE device_source_raw_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_source_raw_data_admin_all ON device_source_raw_data;
CREATE POLICY device_source_raw_data_admin_all ON device_source_raw_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON device_source_raw_data TO service_role;
GRANT SELECT ON device_source_raw_data TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE device_source_raw_data_id_seq TO service_role;


-- ── 4. import_runs (§24) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_runs (
  id              BIGSERIAL PRIMARY KEY,
  device_id       BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  source_id       BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  run_name        TEXT NOT NULL,                -- e.g. 'import-mobileapi-specs'
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'success', 'partial', 'error')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  fields_imported INTEGER NOT NULL DEFAULT 0,
  fields_missing  INTEGER NOT NULL DEFAULT 0,
  conflicts_detected INTEGER NOT NULL DEFAULT 0,
  duplicates_detected INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  summary         JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS import_runs_started_idx ON import_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS import_runs_device_idx ON import_runs(device_id);

ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS import_runs_admin_all ON import_runs;
CREATE POLICY import_runs_admin_all ON import_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON import_runs TO service_role;
GRANT SELECT ON import_runs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE import_runs_id_seq TO service_role;

-- ── 5. device_changes (audit trail, §25) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_changes (
  id            BIGSERIAL PRIMARY KEY,
  device_id     BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  field_path    TEXT NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  changed_by    TEXT,                           -- admin user id or 'system'
  reason        TEXT,
  import_run_id BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_changes_device_idx ON device_changes(device_id, created_at DESC);

ALTER TABLE device_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_changes_admin_all ON device_changes;

-- ── 6. devices: variant + verification columns (§13, §20) ────────────────────
ALTER TABLE devices ADD COLUMN IF NOT EXISTS model_number    TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS variant_label   TEXT;  -- e.g. 'Global', 'India', '12/256'
ALTER TABLE devices ADD COLUMN IF NOT EXISTS region          TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS parent_device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS import_status   TEXT
  CHECK (import_status IN ('manual', 'imported', 'verified', 'conflict')) DEFAULT 'manual';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS verified_at     TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS import_run_id   BIGINT;

CREATE INDEX IF NOT EXISTS devices_parent_idx ON devices(parent_device_id);
CREATE INDEX IF NOT EXISTS devices_import_status_idx ON devices(import_status);

-- ── 7. Seed the initial sources (spec §10a + §11a hierarchy) ─────────────────
-- Priority: lower number wins. Manufacturer > structured API > GSMArena >
-- NanoReview > manual correction (manual = admin authority, §2 Principle 2).
INSERT INTO sources (slug, name, source_type, base_url, auth_type, auth_env_key, adapter_name, priority, supported_fields, active)
VALUES
  ('manufacturer',     'Manufacturer (official specs)',        'manufacturer', NULL,                          'none',   NULL,            'manufacturer', 10, '["specs_design","specs_display","specs_battery","specs_connectivity","specs_software","specs_network"]', true),
  ('mobileapi',        'MobileAPI.dev (structured spec API)',  'spec-api',     'https://api.mobileapi.dev',   'bearer', 'MOBILEAPI_KEY', 'mobileapi',    20, '["specs_design","specs_display","specs_processor","specs_memory","specs_camera","specs_battery","specs_connectivity","specs_network"]', true),
  ('gsmarena',         'GSMArena',                             'aggregator',   'https://www.gsmarena.com',    'none',   NULL,            'gsmarena',     30, '["specs_design","specs_display","specs_processor","specs_memory","specs_camera","specs_battery","specs_connectivity","specs_network","specs_software"]', false),
  ('nanoreview',       'NanoReview (chipset benchmarks)',      'benchmark',    'https://www.nanoreview.net',  'none',   NULL,            'nanoreview',   40, '["chipset_benchmarks"]', false),
  ('fweezytech-admin', 'FweezyTech Admin (manual correction)', 'manual',       NULL,                          'none',   NULL,            NULL,           50, '["*"]', true)
ON CONFLICT (slug) DO NOTHING;

CREATE POLICY device_changes_admin_all ON device_changes FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON device_changes TO service_role;
GRANT SELECT ON device_changes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE device_changes_id_seq TO service_role;
