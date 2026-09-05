-- Migration 028: device purchase-journey features
--  1. availability column on devices (admin set)
--  2. device_watchers table (device-specific "Notify me when available")

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS availability TEXT
    CHECK (availability IN ('in-stock', 'coming-soon', 'out-of-stock'));

-- Device-specific watch list ("Notify me when this device is available / back in stock")
CREATE TABLE IF NOT EXISTS device_watchers (
  id          BIGSERIAL PRIMARY KEY,
  device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, email)
);

ALTER TABLE device_watchers ENABLE ROW LEVEL SECURITY;