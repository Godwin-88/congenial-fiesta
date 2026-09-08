-- Migration 037: Phase 3 — affiliate earnings ledger + finance reconciliation.
--
-- 1. affiliate_earnings — actual/confirmed/paid commission imported from affiliate
--    network statements (CSV first, then APIs). Drives Finance reconciliation against
--    the revenue proxy (clicks × commission rate) on the same admin analytics screen.
-- 2. link_health_checks already exists (036) — the link-health cron writes to it.
--
-- Privacy note: finance data is admin-only. RLS: SELECT for authenticated (admins) +
--    service_role; writes restricted to service_role. anon never touches earnings.

-- ── 1. affiliate_earnings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id                BIGSERIAL PRIMARY KEY,
  retailer          TEXT NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  gross_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'KES',
  status            TEXT NOT NULL DEFAULT 'estimated'
                      CHECK (status IN ('estimated', 'confirmed', 'paid')),
  source            TEXT,
  note              TEXT,
  imported_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_earnings_retailer_idx ON affiliate_earnings(retailer);
CREATE INDEX IF NOT EXISTS affiliate_earnings_period_idx ON affiliate_earnings(period_start, period_end);
CREATE INDEX IF NOT EXISTS affiliate_earnings_status_idx ON affiliate_earnings(status);

ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_earnings_admin_read ON public.affiliate_earnings;
CREATE POLICY affiliate_earnings_admin_read ON public.affiliate_earnings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS affiliate_earnings_service_write ON public.affiliate_earnings;
CREATE POLICY affiliate_earnings_service_write ON public.affiliate_earnings
  FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_earnings TO service_role;
GRANT SELECT ON public.affiliate_earnings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_earnings_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_earnings_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_earnings_id_seq TO authenticated;