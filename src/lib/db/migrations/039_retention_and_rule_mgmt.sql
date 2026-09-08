-- =====================================================================
-- Migration 039: Phase 5 - Data retention & purge policy (Kenya DPA)
--                + alert-rule lifecycle support.
--
-- 1. retention_policy   - per-table TTL governance over the raw analytics
--    store (page_views, affiliate_clicks, interactions, search_queries).
--    Values chosen against PII-class expectations (fp_id cookie = 395 days).
-- 2. data_retention_log - append-only audit of every purge / expunge run
--    (who/what/when), satisfying "governed data lifecycle" + DPA
--    accountability for expunge-on-request.
--
-- RLS: service_role owns everything; authenticated (admins) may read
-- policy + view the audit log. anon never touches either.
-- =====================================================================

-- ---- 1. retention_policy ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retention_policy (
  id             BIGSERIAL PRIMARY KEY,
  table_name     TEXT NOT NULL UNIQUE,
  retention_days INT  NOT NULL DEFAULT 730,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  note           TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.retention_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_policy_admin_read ON public.retention_policy;
CREATE POLICY retention_policy_admin_read ON public.retention_policy
  FOR SELECT USING (true);
DROP POLICY IF EXISTS retention_policy_service_write ON public.retention_policy;
CREATE POLICY retention_policy_service_write ON public.retention_policy
  FOR ALL USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retention_policy TO service_role;
GRANT SELECT ON public.retention_policy TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.retention_policy_id_seq TO service_role;

-- Defaults (seed only when the table is empty so admins can change them)
INSERT INTO public.retention_policy (table_name, retention_days, note)
SELECT 'page_views', 730, 'Raw page-view events - 24 months (PII: fp_id/IP-scoped headers)'
WHERE NOT EXISTS (SELECT 1 FROM public.retention_policy);

INSERT INTO public.retention_policy (table_name, retention_days, note)
SELECT 'affiliate_clicks', 730, 'Outbound click log - 24 months (conversion attribution window)'
WHERE NOT EXISTS (SELECT 1 FROM public.retention_policy WHERE table_name = 'affiliate_clicks');

INSERT INTO public.retention_policy (table_name, retention_days, note)
SELECT 'interactions', 540, 'First-party intent events - 18 months (matches fp_id 395-day cookie + margin)'
WHERE NOT EXISTS (SELECT 1 FROM public.retention_policy WHERE table_name = 'interactions');

INSERT INTO public.retention_policy (table_name, retention_days, note)
SELECT 'search_queries', 365, 'Search logging - 12 months (zero-result gap mining)'
WHERE NOT EXISTS (SELECT 1 FROM public.retention_policy WHERE table_name = 'search_queries');

-- ---- 2. data_retention_log --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_retention_log (
  id            BIGSERIAL PRIMARY KEY,
  action        TEXT NOT NULL CHECK (action IN ('purge', 'expunge')),
  table_name    TEXT,
  rows_affected BIGINT NOT NULL DEFAULT 0,
  older_than    TIMESTAMPTZ,
  fp_id         TEXT,
  triggered_by  TEXT NOT NULL DEFAULT 'cron',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_retention_log_created_idx ON public.data_retention_log(created_at DESC);
CREATE INDEX IF NOT EXISTS data_retention_log_fp_idx ON public.data_retention_log(fp_id);

ALTER TABLE public.data_retention_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS data_retention_log_admin_read ON public.data_retention_log;
CREATE POLICY data_retention_log_admin_read ON public.data_retention_log
  FOR SELECT USING (true);
DROP POLICY IF EXISTS data_retention_log_service_write ON public.data_retention_log;
CREATE POLICY data_retention_log_service_write ON public.data_retention_log
  FOR ALL USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_log TO service_role;
GRANT SELECT ON public.data_retention_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.data_retention_log_id_seq TO service_role;