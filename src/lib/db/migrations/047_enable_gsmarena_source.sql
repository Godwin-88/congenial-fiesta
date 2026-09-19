-- Migration 047: enable the GSMArena import source.
-- ============================================================================
-- The adapter was seeded INACTIVE (042) pending verification that server-side
-- access was viable. Verified: device pages, maker listings (makers.php3,
-- <maker>-phones-<id>.php) and the phones.xml sitemap are plain GETs; only
-- the results.php3 search endpoint is Turnstile-challenged (the adapter
-- falls back to maker/sitemap browsing). The runtime gate
-- (GSMARENA_IMPORT_ENABLED) stays — the admin opts in per environment.

UPDATE sources
SET active = true
WHERE slug = 'gsmarena' AND adapter_name = 'gsmarena';
