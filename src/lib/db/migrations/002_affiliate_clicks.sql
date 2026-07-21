CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id           BIGSERIAL PRIMARY KEY,
  device_slug  TEXT NOT NULL,
  retailer     TEXT NOT NULL,
  referrer     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_device_idx ON affiliate_clicks(device_slug);
CREATE INDEX IF NOT EXISTS affiliate_clicks_created_idx ON affiliate_clicks(created_at);

-- No PII stored: no IP addresses, no user IDs