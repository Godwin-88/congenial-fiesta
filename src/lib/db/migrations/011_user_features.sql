-- Migration 011: User features (saved items, ratings)
-- Run this in Supabase SQL Editor

-- Saved items (bookmarks for articles, devices, comparisons)
CREATE TABLE IF NOT EXISTS user_saved_items (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type  TEXT NOT NULL CHECK (content_type IN ('article', 'device', 'comparison')),
  content_id    TEXT NOT NULL, -- slug for articles/devices, or comparison hash
  metadata      JSONB DEFAULT '{}', -- stores title, image, etc. for display
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- User device ratings
CREATE TABLE IF NOT EXISTS user_ratings (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  score         NUMERIC(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Saved comparisons (persistent across sessions)
CREATE TABLE IF NOT EXISTS user_comparisons (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT DEFAULT 'Untitled Comparison',
  device_slugs  TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_comparisons ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users manage their own saved items" ON user_saved_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own ratings" ON user_ratings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own comparisons" ON user_comparisons
  FOR ALL USING (auth.uid() = user_id);

-- Grant anon role SELECT (RLS will filter)
GRANT SELECT, INSERT, DELETE ON user_saved_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_comparisons TO anon;
GRANT USAGE ON SEQUENCE user_saved_items_id_seq TO anon;
GRANT USAGE ON SEQUENCE user_ratings_id_seq TO anon;
GRANT USAGE ON SEQUENCE user_comparisons_id_seq TO anon;