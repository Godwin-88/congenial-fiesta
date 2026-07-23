-- Migration 007: Saved Comparisons
-- Enables authenticated users to save and retrieve device comparisons

CREATE TABLE IF NOT EXISTS saved_comparisons (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Comparison',
  device_slugs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_comparisons_user_id ON saved_comparisons(user_id);

-- Enable RLS
ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved comparisons
DROP POLICY IF EXISTS "Users can view own comparisons" ON saved_comparisons;
CREATE POLICY "Users can view own comparisons"
  ON saved_comparisons FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own comparisons
DROP POLICY IF EXISTS "Users can insert own comparisons" ON saved_comparisons;
CREATE POLICY "Users can insert own comparisons"
  ON saved_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comparisons
DROP POLICY IF EXISTS "Users can update own comparisons" ON saved_comparisons;
CREATE POLICY "Users can update own comparisons"
  ON saved_comparisons FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comparisons
DROP POLICY IF EXISTS "Users can delete own comparisons" ON saved_comparisons;
CREATE POLICY "Users can delete own comparisons"
  ON saved_comparisons FOR DELETE
  USING (auth.uid() = user_id);