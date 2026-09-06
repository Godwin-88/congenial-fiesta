-- Migration 030: Restore analytics table privileges for the app roles.
--
-- The analytics tables (page_views, affiliate_clicks, affiliate_click_stats,
-- top_content_stats, search_queries) and the daily materialised view were
-- created WITHOUT grants or RLS policies, so even the service_role (used by
-- the admin API and server queries) could not read them. This silently made
-- every analytics metric return 0 / [].
--
-- We mirror the working pattern from migration 020 (device_types):
--   * enable RLS
--   * add a permissive public SELECT policy for privacy-safe analytics data
--     (no PII stored in these tables)
--   * grant full DML to service_role and SELECT to anon/authenticated
--   * grant sequence usage for the SERIAL/BIGSERIAL columns

-- page_views ---------------------------------------------------------------
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS page_views_public_read ON public.page_views;
CREATE POLICY page_views_public_read ON public.page_views
  FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_views TO service_role;
GRANT SELECT, INSERT ON public.page_views TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.page_views_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.page_views_id_seq TO anon, authenticated;

-- affiliate_clicks ---------------------------------------------------------
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_clicks_public_read ON public.affiliate_clicks;
CREATE POLICY affiliate_clicks_public_read ON public.affiliate_clicks
  FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_clicks TO service_role;
GRANT SELECT, INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_clicks_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.affiliate_clicks_id_seq TO anon, authenticated;

-- affiliate_click_stats ----------------------------------------------------
ALTER TABLE public.affiliate_click_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS affiliate_click_stats_public_read ON public.affiliate_click_stats;
CREATE POLICY affiliate_click_stats_public_read ON public.affiliate_click_stats
  FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_click_stats TO service_role;
GRANT SELECT ON public.affiliate_click_stats TO anon, authenticated;

-- top_content_stats --------------------------------------------------------
ALTER TABLE public.top_content_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS top_content_stats_public_read ON public.top_content_stats;
CREATE POLICY top_content_stats_public_read ON public.top_content_stats
  FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.top_content_stats TO service_role;
GRANT SELECT ON public.top_content_stats TO anon, authenticated;

-- search_queries -----------------------------------------------------------
-- Admin-team search-intent analytics. Only service_role (server queries) can
-- READ these, plus INSERT from the search route. No public/anon access.
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_queries TO service_role;
GRANT SELECT ON public.search_queries TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.search_queries_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.search_queries_id_seq TO authenticated;

-- Daily materialised view --------------------------------------------------
GRANT SELECT ON public.daily_page_view_summary TO service_role;
GRANT SELECT ON public.daily_page_view_summary TO anon, authenticated;