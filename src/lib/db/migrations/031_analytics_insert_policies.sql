-- Migration 031: Restore INSERT access that 030's RLS enablement would have blocked.
--
-- 030 enabled RLS on affiliate_clicks / page_views and added permissive SELECT
-- policies. But the affiliate click tracker (/api/out/...) inserts via the
-- anon (session) Supabase client, and page_views are inserted by /api/track.
-- Without explicit INSERT policies, RLS would silently drop those writes.
--
-- These tables store NO PII (per their original design notes), so a permissive
-- INSERT policy is consistent with their privacy model and the pre-030 state.

-- affiliate_clicks ---------------------------------------------------------
DROP POLICY IF EXISTS affiliate_clicks_public_insert ON public.affiliate_clicks;
CREATE POLICY affiliate_clicks_public_insert ON public.affiliate_clicks
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS affiliate_clicks_public_update ON public.affiliate_clicks;
CREATE POLICY affiliate_clicks_public_update ON public.affiliate_clicks
  FOR UPDATE USING (true) WITH CHECK (true);

-- page_views ---------------------------------------------------------------
DROP POLICY IF EXISTS page_views_public_insert ON public.page_views;
CREATE POLICY page_views_public_insert ON public.page_views
  FOR INSERT WITH CHECK (true);