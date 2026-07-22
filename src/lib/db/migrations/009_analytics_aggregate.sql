-- Pre-aggregated affiliate click stats (updated by cron, not on every click)
-- Avoids expensive COUNT queries on the analytics dashboard

CREATE TABLE IF NOT EXISTS affiliate_click_stats (
  device_slug   TEXT NOT NULL,
  retailer      TEXT NOT NULL,
  period        TEXT NOT NULL CHECK (period IN ('7d','30d','90d','all')),
  click_count   INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_slug, retailer, period)
);

-- Top content summary (pre-aggregated page views per path per period)
CREATE TABLE IF NOT EXISTS top_content_stats (
  path          TEXT NOT NULL,
  period        TEXT NOT NULL CHECK (period IN ('7d','30d','90d')),
  view_count    INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (path, period)
);