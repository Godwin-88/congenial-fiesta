-- Migration 016: Align live `devices` table with the application's expected schema
-- The table was originally created with a Payload-style schema (flat specs_*
-- columns, `benchmarks_antutu`, `price_k_e_s`, etc.) which does not match the
-- schema the admin CMS / public site code expects (migration 010_admin_cms.sql).
-- This reconciles the column names and types so device inserts/reads work.

-- Helper to rename a column only if the old name exists (RENAME COLUMN has no
-- native IF EXISTS support on older Postgres versions).
CREATE OR REPLACE FUNCTION rename_col_if_exists(t text, oldc text, newc text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = t AND column_name = oldc
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', t, oldc, newc);
  END IF;
END $$ LANGUAGE plpgsql;

SELECT rename_col_if_exists('devices', 'price_k_e_s', 'price_kes');
SELECT rename_col_if_exists('devices', 'price_u_s_d', 'price_usd');
SELECT rename_col_if_exists('devices', 'verdict_full_verdict', 'verdict_full');
SELECT rename_col_if_exists('devices', 'benchmarks_geekbench_single', 'benchmark_geekbench_single');
SELECT rename_col_if_exists('devices', 'benchmarks_geekbench_multi', 'benchmark_geekbench_multi');
SELECT rename_col_if_exists('devices', 'benchmarks_antutu', 'benchmark_antutu');
SELECT rename_col_if_exists('devices', 'benchmarks_pcmark', 'benchmark_pcmark');
SELECT rename_col_if_exists('devices', 'related_video', 'related_video_id');
SELECT rename_col_if_exists('devices', 'related_tiktok', 'related_tiktok_url');
SELECT rename_col_if_exists('devices', 'seo_meta_title', 'seo_title');
SELECT rename_col_if_exists('devices', 'seo_meta_description', 'seo_description');
SELECT rename_col_if_exists('devices', 'seo_og_image_url', 'seo_og_image');

-- Score columns are named `scores_*` (plural) in the live table but the app
-- code expects the singular `score_*` (migration 010_admin_cms.sql).
SELECT rename_col_if_exists('devices', 'scores_display', 'score_display');
SELECT rename_col_if_exists('devices', 'scores_performance', 'score_performance');
SELECT rename_col_if_exists('devices', 'scores_camera', 'score_camera');
SELECT rename_col_if_exists('devices', 'scores_battery', 'score_battery');
SELECT rename_col_if_exists('devices', 'scores_value', 'score_value');

DROP FUNCTION IF EXISTS rename_col_if_exists(text, text, text);

-- Add JSONB columns the application expects but the live table is missing
ALTER TABLE devices ADD COLUMN IF NOT EXISTS verdict_pros JSONB DEFAULT '[]';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS verdict_cons JSONB DEFAULT '[]';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS buy_links JSONB DEFAULT '[]';

-- Convert flat specs_* columns into the JSONB specs_* columns the app reads/writes.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_design JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_display JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_processor JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_memory JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_camera JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_battery JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_connectivity JSONB DEFAULT '{}';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS specs_software JSONB DEFAULT '{}';

DO $$
DECLARE
  col text;
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'devices'
      AND column_name LIKE 'specs_%'
      AND data_type <> 'jsonb'
  LOOP
    EXECUTE format('ALTER TABLE devices DROP COLUMN IF EXISTS %I', col);
  END LOOP;
END $$;

-- The full-text search trigger (migration 001) referenced the now-removed flat
-- specs_* columns. Recreate it to read from the JSONB specs_* columns instead.
CREATE OR REPLACE FUNCTION devices_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(NEW.specs_processor->>'chipset', '') || ' ' ||
      coalesce(NEW.specs_display->>'type', '') || ' ' ||
      coalesce(NEW.tagline, '') || ' ' ||
      coalesce(NEW.category::text, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devices_search_vector_trigger ON devices;
CREATE TRIGGER devices_search_vector_trigger
  BEFORE INSERT OR UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION devices_search_vector_update();
