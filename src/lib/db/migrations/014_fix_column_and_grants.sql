-- Migration 014: Fix column name & grant permissions
-- 1. Rename score_overall → scores_overall (if old column exists)
-- 2. Grant table-level privileges on saved_comparisons to authenticated role

-- Fix column name if the old migration created score_overall
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'score_overall'
  ) THEN
    ALTER TABLE devices RENAME COLUMN score_overall TO scores_overall;
  END IF;
END $$;

-- Grant table-level SELECT on saved_comparisons to authenticated role
-- (RLS policies exist but table-level privilege may be missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_comparisons TO authenticated;
