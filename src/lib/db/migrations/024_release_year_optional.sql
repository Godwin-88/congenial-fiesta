-- Migration 024: Make release_year optional.
-- Ingestion may not always have a parsed release year (some source
-- records lack a date), and forcing a year would be inaccurate. Allow NULL.

ALTER TABLE public.devices ALTER COLUMN release_year DROP NOT NULL;
