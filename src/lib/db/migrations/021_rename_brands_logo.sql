-- Migration 021: Rename brands.logo -> logo_url
-- The application code, the Brand type, and the admin brands API all use
-- `logo_url`, but the column was created as `logo`. Renaming keeps the
-- schema consistent so selects like `brand:brands(logo_url)` and the
-- admin CRUD (which inserts/updates `logo_url`) work.

ALTER TABLE public.brands RENAME COLUMN logo TO logo_url;

-- Refresh PostgREST's schema cache so it picks up the renamed column
SELECT pg_notify('pgrst', 'reload schema');
