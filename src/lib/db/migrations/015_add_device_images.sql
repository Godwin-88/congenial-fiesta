-- Migration 015: Ensure devices.images column exists
-- The images column was defined in migration 010 but may not have been applied
-- to existing deployments. This migration adds it idempotently.
-- Images are stored as a JSONB array of { url, alt, isPrimary } objects,
-- e.g. [{ "url": "https://img.youtube.com/vi/xxx/hqdefault.jpg", "alt": "Device", "isPrimary": true }]

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';