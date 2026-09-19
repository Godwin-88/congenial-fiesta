-- 046: Camera slot taxonomy — normalise specs_camera lens roles.
-- ============================================================================
-- `devices.specs_camera.rear[].type` was free-form before this point. Two
-- producers wrote it: the admin form (TitleCase tokens, unresolvable values
-- silently coerced to 'Main') and the import agent (source dialects such as
-- 'Ultra-wide', 'Periscope telephoto', 'Primary'). Rows therefore disagree with
-- the taxonomy the UI now renders through src/lib/devices/camera-types.ts.
--
-- This migration aligns every existing row to the shared slot vocabulary:
--   * adds `slot` alongside `type`
--   * folds known dialects onto the canonical token ('Ultra-wide' → 'Ultrawide')
--   * leaves genuinely unknown roles untouched (nothing is invented)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ordered most-specific-first: 'Periscope telephoto' must become 'Periscope',
-- and 'Ultra-wide angle' must become 'Ultrawide' (not fall through to 'Main').
CREATE OR REPLACE FUNCTION fweezy_resolve_camera_slot(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text := lower(coalesce(raw, ''));
BEGIN
  t := regexp_replace(t, '[_-]+', ' ', 'g');
  t := regexp_replace(t, '\\s+', ' ', 'g');
  t := btrim(t);
  IF t = '' THEN
    RETURN NULL;
  END IF;

  IF t ~ 'periscop' THEN RETURN 'Periscope'; END IF;
  IF t ~ 'ultra ?wide|\buw\b|wide angle' THEN RETURN 'Ultrawide'; END IF;
  IF t ~ 'tele ?photo|\btele\b|telefoto|zoom lens' THEN RETURN 'Telephoto'; END IF;
  IF t ~ 'macro|telemacro' THEN RETURN 'Macro'; END IF;
  IF t ~ 'depth|\btof\b|time of flight' THEN RETURN 'Depth'; END IF;
  IF t ~ 'monochrome|\bmono\b' THEN RETURN 'Monochrome'; END IF;
  IF t ~ 'selfie|front' THEN RETURN 'Selfie'; END IF;
  IF t ~ 'main|primary|standard|\bwide\b' THEN RETURN 'Main'; END IF;

  RETURN NULL;
END;
$$;

UPDATE devices
SET specs_camera = jsonb_set(
  specs_camera,
  '{rear}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        CASE
          WHEN unit ? 'type' OR unit ? 'slot' THEN unit
          ELSE unit || jsonb_build_object('type', 'Main')
        END,
        '{slot}',
        to_jsonb(coalesce(fweezy_resolve_camera_slot(unit ->> 'slot'), fweezy_resolve_camera_slot(unit ->> 'type'), 'Main'))
      ) || jsonb_build_object(
        'type',
        coalesce(
          fweezy_resolve_camera_slot(unit ->> 'slot'),
          fweezy_resolve_camera_slot(unit ->> 'type'),
          'Main'
        )
      )
    )
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(specs_camera -> 'rear') = 'array' THEN specs_camera -> 'rear'
        ELSE '[]'::jsonb
      END
    ) AS unit
  )
)
WHERE specs_camera -> 'rear' IS NOT NULL
  AND jsonb_typeof(specs_camera -> 'rear') = 'array'
  AND jsonb_array_length(specs_camera -> 'rear') > 0;
