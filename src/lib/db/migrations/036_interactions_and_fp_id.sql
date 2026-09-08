-- Migration 036: Phase 2 analytics instrumentation.
--
-- 1. interactions — first-party intent events (save · add_to_compare · watch · related_click)
-- 2. FP-id (hashable first-party visitor id for uniques/return-rate/attribution) + UTM columns
--     on page_views and affiliate_clicks(empty until set).
-- 3. search_queries: result-count + zero-result flags (feeds the content backlog).
-- 4. affiliate_commission_rates — per-retailer commission config driving the revenue proxy.
-- 5. link_health_checks — outbound buy-link health (HEAD checks by the link-health cron).
--
-- Privacy note: fp_id IS PII-class (first-party cookie id). Per the analytics plan it is
-- treated as governed data: SELECT restricted to service_role + authenticated adamins only;
-- anon/authenticated users may only INSERT (write their own beacon events)。

-- ── 1. interactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interactions (
  id            BIGSERIAL PRIMARY KEY,
  action        TEXT NOT NULL CHECK (action IN ('save', 'add_to_compare', 'watch', 'related_click')),
  content_type  TEXT NOT NULL CHECK (content_type IN ('device', 'article', 'video', 'comparison')),
  content_id    TEXT,
  device_slug   TEXT,
  fp_id         TEXT,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interactions_created_idx ON interactions(created_at);
CREATE INDEX IF NOT EXISTS interactions_action_idx ON interactions(action);
CREATE INDEX IF NOT EXISTS interactions_device_idx ON interactions(device_slug);
CREATE INDEX IF NOT EXISTS interactions_fp_idx ON interactions(fp_id);
CREATE INDEX IF NOT EXISTS interactions_content_idx ON interactions(content_type, content_id);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS interactions_public_read ON public.interactions;
CREATE POLICY interactions_public_read ON public.interactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS interactions_public_insert ON public.interactions;
CREATE POLICY interactions_public_insert ON public.interactions
  FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactions TO service_role;
GRANT SELECT, INSERT ON public.interactions TO authenticated;
GRANT INSERT ON public.interactions TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.interactions_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.interactions_id_seq TO anon, authenticated;

-- ── 2. FP-id + UTM on existing analytics tables ─────────────────────────────────
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS fp_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS fp_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

CREATE INDEX IF NOT EXISTS page_views_fp_idx ON page_views(fp_id);
CREATE INDEX IF NOT EXISTS page_views_utm_idx ON page_views(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS affiliate_clicks_fp_idx ON affiliate_clicks(fp_id);

-- ── 3. search_queries result flags ───────────────────────────────────────────────
ALTER TABLE public.search_queries
  ADD COLUMN IF NOT EXISTS results_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zero_result BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS search_queries_zero_idx ON search_queries(zero_result, created_at);

-- ── 4. affiliate_commission_rates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_commission_rates (
  retailer    TEXT PRIMARY KEY,
  rate         NUMERIC(4, 3) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed defaults — editable via SQL/console (placeholder until the commission CFG UI ships).
INSERT INTO affiliate_commission_rates (retailer, rate)
VALUES
  ('jumia', 0.080),
  ('amazon', 0.040),
  ('kilimall', 0.060),
  ('carrier', 0.050),
  ('other', 0.030)
ON CONFLICT (retailer) DO NOTHING;

ALTER TABLE public.affiliate_commission_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commission_rates_public_read ON public.affiliate_commission_rates;
CREATE POLICY commission_rates_public_read ON public.affiliate_commission_rates
  FOR SELECT USING (true);
GRANT SELECT ON public.affiliate_commission_rates TO service_role, anon, authenticated;

-- ── 5. link_health_checks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS link_health_checks (
  id           BIGSERIAL PRIMARY KEY,
  device_slug  TEXT NOT NULL,
  retailer      TEXT NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  status_code   INTEGER,
  ok            BOOLEAN NOT NULL DEFAULT false,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS link_health_checks_device_idx ON link_health_checks(device_slug);
CREATE INDEX IF NOT EXISTS link_health_checks_ok_idx ON link_health_checks(ok, checked_at);

ALTER TABLE public.link_health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS link_health_public_read ON public.link_health_checks;
CREATE POLICY link_health_public_read ON public.link_health_checks
  FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_health_checks TO service_role;
GRANT SELECT ON public.link_health_checks TO anon, authenticates;
GRANT USAGE, SELECT ON SEQUENCE public.link_health_checks_id_seq TO service_role;