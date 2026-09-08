-- =====================================================================
-- Migration 040: Phase 6 — scheduled exports registry.
--
-- The scheduled-exports ledger lets owner/admins schedule recurring CSV
-- report delivery (email or Slack webhook) without code. The cron
-- /api/cron/scheduled-exports checks due jobs (by cadence), generates the
-- report via the shared export generator (lib/analytics/export.ts) and
-- delivers it, tracking last_run_at / last_error for the admin UI.
--
-- Governance: admin-only surface. RLS service_role full; SELECT for
-- authenticated admins via the admin API (writes gated owner/admin).
-- =====================================================================

CREATE TABLE IF NOT EXISTS scheduled_exports (
  id            BIGSERIAL PRIMARY KEY,
  report        TEXT NOT NULL,   -- page-views | top-pages | affiliate-clicks | qualified-leads | earnings-reconciliation | link-health | explore
  period        TEXT NOT NULL DEFAULT '30d', -- 7d | 30d | 90d
  cadence       TEXT NOT NULL DEFAULT 'weekly'
                  CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  destination   TEXT NOT NULL DEFAULT 'email'
                  CHECK (destination IN ('email', 'slack')),
  recipients    TEXT[] NOT NULL DEFAULT '{}',
  config        JSONB NOT NULL DEFAULT '{}',  -- e.g. {"metric":"views","dimension":"path"} for explore
  enabled       BOOLEAN NOT NULL DEFAULT true,
  last_run_at   TIMESTAMPTZ,
  last_error    TEXT,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_exports_enabled_idx
  ON scheduled_exports(enabled, cadence);
CREATE INDEX IF NOT EXISTS scheduled_exports_created_idx
  ON scheduled_exports(created_at DESC);

ALTER TABLE public.scheduled_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduled_exports_admin_read ON public.scheduled_exports;
CREATE POLICY scheduled_exports_admin_read ON public.scheduled_exports
  FOR SELECT USING (true);
DROP POLICY IF EXISTS scheduled_exports_service_write ON public.scheduled_exports;
CREATE POLICY scheduled_exports_service_write ON public.scheduled_exports
  FOR ALL USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_exports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_exports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.scheduled_exports_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.scheduled_exports_id_seq TO authenticated;