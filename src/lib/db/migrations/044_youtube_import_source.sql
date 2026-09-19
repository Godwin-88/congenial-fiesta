-- Migration 044: Register YouTube reviews as a first-class import source.
-- ============================================================================
-- Implements the merged pipeline: a YouTube review supplies the device NAME
-- (from the video title / description) plus any specs the creator wrote into
-- the description. The SAME import agent that serves the Phone Database panel
-- then merges those with the other configured sources and drafts the device
-- for admin review (spec 13: drafts only, never auto-publish).
--
-- The row deliberately has NO adapter_name. YouTube is driven by the admin
-- action (the "Import from YouTube" modal), not by `searchAllSources`, so an
-- adapter-less row is exactly right: it exists so provenance (device_spec_sources)
-- and import_runs can attribute fields to the review video, and so the admin can
-- disable or re-prioritise the channel from /admin/sources like any other source.
--
-- Priority 25 sits between the structured spec API (20) and the aggregators (30):
-- a creator-supplied spec sheet is more trustworthy than a scraped aggregator but
-- still loses to the manufacturer's own page in a conflict.

INSERT INTO sources (
  slug, name, source_type, base_url, auth_type, auth_env_key, adapter_name, priority, supported_fields, active
)
VALUES (
  'youtube',
  'YouTube reviews (FweezyTech channel)',
  'manual',
  'https://www.youtube.com',
  'none',
  NULL,
  NULL,
  25,
  '["specs_design","specs_display","specs_processor","specs_memory","specs_camera","specs_battery","specs_connectivity","specs_network","specs_software"]',
  true
)
ON CONFLICT (slug) DO NOTHING;
