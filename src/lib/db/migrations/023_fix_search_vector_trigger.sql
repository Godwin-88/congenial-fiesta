-- Migration 023: Fix devices_search_vector_update() for the enum price_tier.
-- The previous version used `coalesce(NEW.price_tier, '')`. Because
-- price_tier is an ENUM, Postgres tried to cast the '' literal to the enum
-- type, raising "invalid input value for enum enum_devices_category" on
-- EVERY device insert. Casting the enum to text first fixes it.

CREATE OR REPLACE FUNCTION devices_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(NEW.specs_processor->>'chipset', '') || ' ' ||
      coalesce(NEW.specs_display->>'type', '') || ' ' ||
      coalesce(NEW.tagline, '') || ' ' ||
      coalesce(NEW.major_category, '') || ' ' ||
      coalesce(NEW.price_tier::text, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
