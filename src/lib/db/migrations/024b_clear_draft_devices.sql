-- ============================================================
-- Migration 024b: Clear improperly-ingested draft devices
-- ------------------------------------------------------------
-- Removes ALL devices with status = 'draft' so the proper seed
-- in 025_seed_phones_batch1.sql can land without slug conflicts
-- (its inserts use ON CONFLICT (slug) DO NOTHING and would
-- otherwise silently skip over the bad pre-existing drafts).
--
-- Safety notes:
--  * Only drafts are touched. Published devices are preserved.
--  * Community ratings (device_ratings) and comments key off the
--    device SLUG, not the id, so they survive the delete.
--  * user_ratings.device_id has ON DELETE CASCADE (harmless here —
--    improperly ingested drafts have no real user ratings).
--  * articles/videos/coming_soon.associated_device_id are
--    ON DELETE SET NULL, so those links just null out.
--  * Idempotent: re-running this (then 025) yields the same state.
-- ============================================================

DO $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM devices WHERE status = 'draft';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '024b: removed % draft device(s).', deleted_count;
END $$;
