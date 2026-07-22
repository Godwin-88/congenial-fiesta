-- Privacy-first page view tracking
-- No IP addresses stored. No user IDs. No cookies required.
-- Identifies sessions via a hashed daily rotating token (computed server-side)

CREATE TABLE IF NOT EXISTS page_views (
  id            BIGSERIAL PRIMARY KEY,
  path          TEXT NOT NULL,
  referrer      TEXT,
  -- Traffic source classification
  source        TEXT NOT NULL DEFAULT 'direct'
                CHECK (source IN ('direct','search','social','referral')),
  platform      TEXT,
                -- social platform if source=social: youtube|tiktok|instagram|facebook|twitter|other
  country_code  TEXT,
                -- derived from Vercel geo headers — 2-letter ISO code
  device_type   TEXT CHECK (device_type IN ('mobile','tablet','desktop')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No PII columns. No user_id. No session_id. No IP.
-- Analytics queries aggregate over time windows only.

CREATE INDEX IF NOT EXISTS page_views_path_idx    ON page_views(path);
CREATE INDEX IF NOT EXISTS page_views_created_idx ON page_views(created_at);
CREATE INDEX IF NOT EXISTS page_views_source_idx  ON page_views(source);

-- Materialised daily summary (refresh via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_page_view_summary AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  path,
  source,
  platform,
  device_type,
  COUNT(*) AS views
FROM page_views
GROUP BY 1, 2, 3, 4, 5
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_unique_idx
  ON daily_page_view_summary(day, path, source, platform, device_type);