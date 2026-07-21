-- Full-text search vector column on devices table (managed by Payload)
-- Run this in Supabase SQL editor after Payload has created the devices table

ALTER TABLE devices ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE devices SET search_vector =
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce("specsProcessor"->>'chipset', '') || ' ' ||
    coalesce("specsDisplay"->>'type', '') || ' ' ||
    coalesce(tagline, '')
  );

CREATE INDEX IF NOT EXISTS devices_search_idx ON devices USING GIN(search_vector);

CREATE OR REPLACE FUNCTION devices_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(NEW."specsProcessor"->>'chipset', '') || ' ' ||
      coalesce(NEW."specsDisplay"->>'type', '') || ' ' ||
      coalesce(NEW.tagline, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devices_search_vector_trigger ON devices;
CREATE TRIGGER devices_search_vector_trigger
  BEFORE INSERT OR UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION devices_search_vector_update();