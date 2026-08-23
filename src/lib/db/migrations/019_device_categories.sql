-- Migration 019: Device category taxonomy
-- Introduces a proper schema for the new major categories
-- (Phones [Phones/Tablets/Smartwatch], Televisions, Sound, Macs).
-- The existing `category` column (price tier) is renamed to `price_tier`.
-- A `device_types` lookup table drives the granular sub-types and is
-- admin-manageable. `devices` gains `major_category` (denormalized for
-- fast filtering) and `device_type_id` (FK to device_types).

-- 1. Rename price-tier column (category -> price_tier)
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

SELECT rename_col_if_exists('devices', 'category', 'price_tier');
DROP FUNCTION IF EXISTS rename_col_if_exists(text, text, text);

-- 2. Device types lookup table
CREATE TABLE IF NOT EXISTS device_types (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  major_category  TEXT NOT NULL
                  CHECK (major_category IN ('phones','televisions','sound','macs')),
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. New columns on devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS
  major_category TEXT CHECK (major_category IN ('phones','televisions','sound','macs'));
ALTER TABLE devices ADD COLUMN IF NOT EXISTS
  device_type_id BIGINT REFERENCES device_types(id) ON DELETE SET NULL;

-- 4. Seed the device types (idempotent)
INSERT INTO device_types (slug, label, major_category, display_order) VALUES
  ('phone',      'Phones',       'phones',       1),
  ('tablet',     'Tablets',      'phones',       2),
  ('smartwatch', 'Smartwatches', 'phones',       3),
  ('tv',         'Televisions',  'televisions',  1),
  ('soundbar',   'Soundbars',    'sound',        2),
  ('speaker',    'Speakers',     'sound',        3),
  ('headphone',  'Headphones',   'sound',        4),
  ('macbook',    'MacBooks',     'macs',         1),
  ('imac',       'iMac',         'macs',         2),
  ('mac-mini',   'Mac mini',     'macs',         3)
ON CONFLICT (slug) DO NOTHING;

-- 5. RLS
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Device types are public" ON device_types FOR SELECT USING (true);

-- 6. Keep the full-text search vector in sync (was referencing `category`)
CREATE OR REPLACE FUNCTION devices_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(NEW.specs_processor->>'chipset', '') || ' ' ||
      coalesce(NEW.specs_display->>'type', '') || ' ' ||
      coalesce(NEW.tagline, '') || ' ' ||
      coalesce(NEW.major_category, '') || ' ' ||
      coalesce(NEW.price_tier, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
