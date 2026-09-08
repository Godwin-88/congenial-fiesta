-- =====================================================================
-- Migration 038: Phase 4 - Goals, Alerts & Automation engine.
--
-- 1. analytics_alert_rules - configurable KPI thresholds evaluated by the
--    /api/cron/alerts job (QStash, daily 06:30 UTC).
-- 2. alert_events          - fired alert log (deduped per rule + period),
--    acknowledged inline from the admin "Goals & Alerts" tab.
--
-- Privacy: no PII here - numeric values and timestamps only. RLS grants
-- mirror the existing 036/037 finance tables (admin read, service write).
-- =====================================================================

-- ---- 1. analytics_alert_rules ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_alert_rules (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  kpi         TEXT NOT NULL,
  operator    TEXT NOT NULL DEFAULT 'gt' CHECK (operator IN ('gt', 'lt')),
  threshold   NUMERIC(14, 2) NOT NULL,
  period      TEXT NOT NULL DEFAULT '30d',
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_alert_rules_enabled_idx ON public.analytics_alert_rules(enabled);

ALTER TABLE public.analytics_alert_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analytics_alert_rules_admin_read ON public.analytics_alert_rules;
CREATE POLICY analytics_alert_rules_admin_read ON public.analytics_alert_rules
  FOR SELECT USING (true);
DROP POLICY IF EXISTS analytics_alert_rules_service_write ON public.analytics_alert_rules;
CREATE POLICY analytics_alert_rules_service_write ON public.analytics_alert_rules
  FOR ALL USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_alert_rules TO service_role;
GRANT SELECT ON public.analytics_alert_rules TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_alert_rules_id_seq TO service_role;

-- Default rules (idempotent - only seed when the table is empty)
INSERT INTO public.analytics_alert_rules (name, kpi, operator, threshold, period, description)
SELECT 'Affiliate CTR below target', 'device_to_ctr', 'lt', 1.5, '30d',
       'Device views to affiliate clicks; below 1.5% means Buy Box placement or link health needs work.'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_alert_rules);

INSERT INTO public.analytics_alert_rules (name, kpi, operator, threshold, period, description)
SELECT 'Traffic below 5k views', 'views', 'lt', 5000, '30d',
       'Total page views over the lookback window dropped below the floor.'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_alert_rules WHERE kpi = 'views');

INSERT INTO public.analytics_alert_rules (name, kpi, operator, threshold, period, description)
SELECT 'Revenue leak: zero-click devices', 'zero_report', 'gt', 100, '30d',
       'Page views on device pages with no affiliate clicks - add links or move Buy Box above the fold.'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_alert_rules WHERE kpi = 'zero_report');

INSERT INTO public.analytics_alert_rules (name, kpi, operator, threshold, period, description)
SELECT 'Zero-result search gap', 'search_gap', 'gt', 20, '30d',
       'Searches that returned no results - content backlog opportunity.'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_alert_rules WHERE kpi = 'search_gap');

INSERT INTO public.analytics_alert_rules (name, kpi, operator, threshold, period, description)
SELECT 'Broken buy links', 'broken_links', 'gt', 0, '7d',
       'Outbound buy links failing HEAD checks - replace or retire the retailer.'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_alert_rules WHERE kpi = 'broken_links');

INSERT INTO public.analytics_alert_rules (name, kpi, operator, threshold, period, description)
SELECT 'High-intent cohort ready', 'hot_leads', 'gt', 2, '30d',
       'Visitors with a hot qualification score - export for CRM / retargeting.'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_alert_rules WHERE kpi = 'hot_leads');

-- ---- 2. alert_events -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alert_events (
  id               BIGSERIAL PRIMARY KEY,
  rule_id          BIGINT REFERENCES public.analytics_alert_rules(id) ON DELETE CASCADE,
  rule_name        TEXT NOT NULL,
  kpi              TEXT NOT NULL,
  operator         TEXT NOT NULL,
  value            NUMERIC(14, 2) NOT NULL,
  threshold        NUMERIC(14, 2) NOT NULL,
  period           TEXT NOT NULL,
  fired_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS alert_events_rule_period_unique ON public.alert_events(rule_id, period);
CREATE INDEX IF NOT EXISTS alert_events_fired_idx ON public.alert_events(fired_at DESC);

ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_events_admin_read ON public.alert_events;
CREATE POLICY alert_events_admin_read ON public.alert_events
  FOR SELECT USING (true);
DROP POLICY IF EXISTS alert_events_service_write ON public.alert_events;
CREATE POLICY alert_events_service_write ON public.alert_events
  FOR ALL USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_events TO service_role;
GRANT SELECT, UPDATE ON public.alert_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.alert_events_id_seq TO service_role;