-- Migration 043: Fair Phone Ranking engine storage ("FweezyTech Device
-- Ranking System.md" §30, §32, §38–40).
--
-- Layered separation (§47): raw device specs (devices.*) → chipset/benchmark
-- tables (this migration) → ranking configuration → device_rankings output.
-- The score is deterministic given (spec data, benchmarks, formula version).
--
-- Dynamic global benchmark principle (§14, §30): current-best values live in
-- ranking_benchmarks and evolve as technology improves; admin can override any
-- value; when a benchmark moves, affected device scores are recalculated.

-- ── 1. chipsets (SoC table, §38) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chipsets (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,         -- canonical SoC name 'Snapdragon 8 Elite Gen 5'
  slug            TEXT NOT NULL UNIQUE,
  manufacturer    TEXT,                         -- 'Qualcomm', 'MediaTek', 'Apple', 'Google', 'Samsung'
  cpu_architecture TEXT,
  gpu             TEXT,
  process_node    TEXT,
  npu             TEXT,
  release_year    INTEGER,
  aliases         TEXT[] DEFAULT '{}',          -- marketing variants for matching
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chipsets_manufacturer_idx ON chipsets(manufacturer);
CREATE INDEX IF NOT EXISTS chipsets_aliases_idx ON chipsets USING GIN (aliases);

ALTER TABLE chipsets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chipsets_admin_all ON chipsets;
CREATE POLICY chipsets_admin_all ON chipsets FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS chipsets_public_read ON chipsets;
CREATE POLICY chipsets_public_read ON chipsets FOR SELECT USING (true);
GRANT ALL ON chipsets TO service_role;
GRANT SELECT ON chipsets TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE chipsets_id_seq TO service_role;

-- ── 2. chipset_benchmarks (multiple results per SoC, §15) ────────────────────
-- The scoring engine aggregates these with a consistent median policy — never
-- cherry-picking the highest result. Benchmarks are stored SEPARATELY from raw
-- device specifications (§42).
CREATE TABLE IF NOT EXISTS chipset_benchmarks (
  id              BIGSERIAL PRIMARY KEY,
  chipset_id      BIGINT NOT NULL REFERENCES chipsets(id) ON DELETE CASCADE,
  benchmark_name  TEXT NOT NULL,                -- 'geekbench6' | 'antutu10' | '3dmark_wild_life_extreme'
  benchmark_version TEXT,
  single_core     NUMERIC,
  multi_core      NUMERIC,
  gpu_score       NUMERIC,
  gpu_score_metric TEXT,                        -- what gpu_score measures, e.g. '3DMark WLE'
  source_id       BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  source_label    TEXT,                         -- 'Geekbench Browser', 'NanoReview'
  source_url      TEXT,
  date_collected  DATE,
  confidence      TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  active          BOOLEAN NOT NULL DEFAULT true,
  import_run_id   BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chipset_benchmarks_chipset_idx ON chipset_benchmarks(chipset_id, benchmark_name);
CREATE INDEX IF NOT EXISTS chipset_benchmarks_active_idx ON chipset_benchmarks(active);

ALTER TABLE chipset_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chipset_benchmarks_admin_all ON chipset_benchmarks;
CREATE POLICY chipset_benchmarks_admin_all ON chipset_benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS chipset_benchmarks_public_read ON chipset_benchmarks;
CREATE POLICY chipset_benchmarks_public_read ON chipset_benchmarks FOR SELECT USING (true);
GRANT ALL ON chipset_benchmarks TO service_role;
GRANT SELECT ON chipset_benchmarks TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE chipset_benchmarks_id_seq TO service_role;


-- ── 3. ranking_benchmarks (dynamic global benchmark table, §30) ──────────────
-- Each row = a current-global-best reference value used by the formula. Values
-- can be recalculated from the approved dataset (auto_calculated = true) or
-- overridden by the administrator (§50). Versioned (e.g. 'GB-2026-09').
CREATE TABLE IF NOT EXISTS ranking_benchmarks (
  id              BIGSERIAL PRIMARY KEY,
  key             TEXT NOT NULL UNIQUE,         -- 'best_single_core' · 'best_multi_core' · ...
  label           TEXT NOT NULL,
  value           NUMERIC NOT NULL,
  reference_label TEXT,                         -- device/SoC the value came from
  source_id       BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  auto_calculated BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  benchmark_version TEXT NOT NULL DEFAULT 'GB-2026-09',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ranking_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ranking_benchmarks_admin_all ON ranking_benchmarks;
CREATE POLICY ranking_benchmarks_admin_all ON ranking_benchmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ranking_benchmarks_public_read ON ranking_benchmarks;
CREATE POLICY ranking_benchmarks_public_read ON ranking_benchmarks FOR SELECT USING (true);
GRANT ALL ON ranking_benchmarks TO service_role;
GRANT SELECT ON ranking_benchmarks TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE ranking_benchmarks_id_seq TO service_role;

-- ── 4. ranking_formula_versions (§29, §32) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ranking_formula_versions (
  id            BIGSERIAL PRIMARY KEY,
  version       TEXT NOT NULL UNIQUE,           -- 'FTS-1.0'
  config        JSONB NOT NULL,                 -- factor tables + thresholds (src/lib/ranking/config.ts)
  notes         TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ranking_formula_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ranking_formula_versions_admin_all ON ranking_formula_versions;
CREATE POLICY ranking_formula_versions_admin_all ON ranking_formula_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ranking_formula_versions_public_read ON ranking_formula_versions;
CREATE POLICY ranking_formula_versions_public_read ON ranking_formula_versions FOR SELECT USING (true);

-- ── 5. device_rankings (§38 ranking calculation table) ───────────────────────
-- Deterministic output. Public visibility follows the DEVICE's status: draft
-- scores are never publicly visible (phone spec §31).
CREATE TABLE IF NOT EXISTS device_rankings (
  id              BIGSERIAL PRIMARY KEY,
  device_id       BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  scoring_version TEXT NOT NULL DEFAULT 'FTS-1.0',
  benchmark_version TEXT NOT NULL DEFAULT 'GB-2026-09',
  total           NUMERIC(6,3),                 -- high precision internally (§34)
  breakdown       JSONB NOT NULL DEFAULT '{}',  -- full component tree for admin verification (§36)
  chipset_id      BIGINT REFERENCES chipsets(id) ON DELETE SET NULL,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, scoring_version, benchmark_version)
);

CREATE INDEX IF NOT EXISTS device_rankings_total_idx ON device_rankings(total DESC);
CREATE INDEX IF NOT EXISTS device_rankings_device_idx ON device_rankings(device_id);

ALTER TABLE device_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_rankings_admin_all ON device_rankings;
CREATE POLICY device_rankings_admin_all ON device_rankings FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS device_rankings_public_published_only ON device_rankings;
CREATE POLICY device_rankings_public_published_only ON device_rankings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_rankings.device_id
        AND devices.status = 'published'
    )
  );
GRANT ALL ON device_rankings TO service_role;
GRANT SELECT ON device_rankings TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE device_rankings_id_seq TO service_role;

-- ── 6. Seed ranking formula version FTS-1.0 + initial global benchmarks ──────
-- The authoritative factor tables live in src/lib/ranking/config.ts; the DB row
-- records the same snapshot so calculations are traceable (§32).
INSERT INTO ranking_formula_versions (version, config, notes, active)
VALUES (
  'FTS-1.0',
  '{"categoryMax": {"build": 10, "display": 20, "performance": 25, "cameras": 25, "battery": 20},
    "thresholds": {"brightnessNits": 2500, "batteryMah": 7500, "wiredW": 150, "wirelessW": 100,
                   "ramGb": 16, "storageGb": 512, "mpMain": 200, "ppi": 500, "refreshHz": 120},
    "doc": "See src/lib/ranking/config.ts for the full factor tables"}'::jsonb,
  'Initial formula per FweezyTech Device Ranking System.md §46. Factor tables versioned in app config.',
  true
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO ranking_benchmarks (key, label, value, reference_label, auto_calculated, benchmark_version)
VALUES
  ('best_single_core',   'Current best single-core (Geekbench 6)',  3850, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_multi_core',    'Current best multi-core (Geekbench 6)',  11200, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_gpu',           'Current best GPU score',                  5000, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_sensor_area_mm2', 'Current best main-camera sensor area (mm²)', 100, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_aperture',      'Current best (widest) main-camera aperture', 1.5, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_brightness_nits', 'Current best measured peak brightness (nits)', 2500, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_battery_mah',   'Current best battery capacity (mAh)',     7500, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_wired_w',       'Current best wired charging (W)',          150, 'placeholder — update from verified data', false, 'GB-2026-09'),
  ('best_wireless_w',    'Current best wireless charging (W)',       100, 'placeholder — update from verified data', false, 'GB-2026-09')
ON CONFLICT (key) DO NOTHING;

GRANT ALL ON ranking_formula_versions TO service_role;
GRANT SELECT ON ranking_formula_versions TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE ranking_formula_versions_id_seq TO service_role;
