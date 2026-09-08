-- Migration 041: Phase 7 — affiliate-network API connectors (zero-touch reconciliation).
--
-- Turns the manual CSV earnings pipeline (Phase 6) into automated network syncs:
--   1. affiliate_networks  — every network (Amazon/Jumia/Kilimall/… ) is a row: the
--      report endpoint, auth scheme, env-var key name, JSON/CSV format, field mapping,
--      retailer/label aliases, enabled flag and last-run state.
--   2. affiliate_sync_logs — append-only run audit (status · rows · errors) so the
--      finance team can see exactly when/why a pull failed (DPA-governed).
--
-- Secret hygiene: network secrets are NEVER stored in the DB. Each row references an
-- ENV variable name (auth_env_key, e.g. JUMIA_API_KEY) that the cron/route reads from
-- process.env at sync time. Finance data is admin-only (mirrors 037).

-- ── 1. affiliate_networks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_networks (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,           -- 'jumia' · 'amazon' · 'kilimall'
  label          TEXT NOT NULL,                  -- human title for the admin UI
  base_url       TEXT NOT NULL,                  -- API endpoint / report download URL
  auth_type      TEXT NOT NULL DEFAULT 'bearer'
                   CHECK (auth_type IN ('none', 'bearer', 'query', 'basic')),
  auth_env_key   TEXT,                           -- name of the ENV var holding the secret
  auth_query_param TEXT,                         -- for 'query': ?access_token=…
  mapping        JSONB NOT NULL DEFAULT '{}',    -- { retailer, period_start, period_end,
                                                 --   gross, commission, currency, status }
                                                 --   keys on the left (our ledger) are optional;
                                                 --   eg { "gross": "commission_amount", ... }
                                                 --   maps network fields → ledger fields.
  note           TEXT,
  enabled        BOOLEAN NOT NULL DEFAULT true,
  last_sync_at   TIMESTAMPTZ,
  last_sync_status TEXT,                         -- 'idle' | 'success' | 'error'
  last_sync_error TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_networks_enabled_idx ON affiliate_networks(enabled);

ALTER TABLE public.affiliate_networks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_networks_admin_read ON public.affiliate_networks;
CREATE POLICY affiliate_networks_admin_read ON public.affiliate_networks
  FOR SELECT USING (true);
DROP POLICY IF EXISTS affiliate_networks_admin_write ON public.affiliate_networks;
CREATE POLICY affiliate_networks_admin_write ON public.affiliate_networks
  FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_networks TO service_role;
GRANT SELECT ON public.affiliate_networks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_networks_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_networks_id_seq TO authenticated;

-- ── 2. affiliate_sync_logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_sync_logs (
  id             BIGSERIAL PRIMARY KEY,
  network_id     BIGINT NOT NULL REFERENCES affiliate_networks(id) ON DELETE CASCADE,
  status         TEXT NOT NULL CHECK (status IN ('success', 'error')),
  rows_inserted  INTEGER NOT NULL DEFAULT 0,
  rows_skipped   INTEGER NOT NULL DEFAULT 0,
  rows_errors    INTEGER NOT NULL DEFAULT 0,
  message        TEXT,
  duration_ms    INTEGER,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_sync_logs_network_idx ON affiliate_sync_logs(network_id, started_at DESC);

ALTER TABLE public.affiliate_sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_sync_logs_admin_read ON public.affiliate_sync_logs;
CREATE POLICY affiliate_sync_logs_admin_read ON public.affiliate_sync_logs
  FOR SELECT USING (true);
DROP POLICY IF EXISTS affiliate_sync_logs_service_write ON public.affiliate_sync_logs;
CREATE POLICY affiliate_sync_logs_service_write ON public.affiliate_sync_logs
  FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_sync_logs TO service_role;
GRANT SELECT ON public.affiliate_sync_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_sync_logs_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_sync_logs_id_seq TO authenticated;

-- ── 3. Seed the Big Three (all disabled — configure + enable in the UI) ──────
INSERT INTO affiliate_networks (name, label, base_url, auth_type, auth_env_key, auth_query_param, mapping, enabled)
VALUES
  ('jumia',   'Jumia Marketplace',   'https://partners.jumia.com/api/earnings', 'bearer', 'JUMIA_API_KEY',   NULL, '{"gross": "gross", "commission": "commission", "period_start": "period_start", "period_end": "period_end", "retailer": "jumia", "currency": "KES"}', false),
  ('amazon',  'Amazon Associates',   'https://affiliate-program.amazon.com/api/earnings', 'query', 'AMAZON_API_KEY', 'access_token', '{"gross": "gross", "commission": "commission", "period_start": "period_start", "period_end": "period_end", "retailer": "amazon", "currency": "USD"}', false),
  ('kilimall', 'Kilimall Affiliates', 'https://affiliate.kilimall.co.ke/api/earnings', 'bearer', 'KILIMALL_API_KEY', NULL, '{"gross": "gross", "commission": "commission", "period_start": "period_start", "period_end": "period_end", "retailer": "kilimall", "currency": "KES"}', false)
ON CONFLICT (name) DO NOTHING;