CREATE TABLE IF NOT EXISTS device_ratings (
  id            BIGSERIAL PRIMARY KEY,
  device_slug   TEXT NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  experience    TEXT CHECK (char_length(experience) <= 280),
  verified_owner BOOLEAN NOT NULL DEFAULT false,
  helpful_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_slug, user_id)
);

CREATE INDEX IF NOT EXISTS ratings_device_idx ON device_ratings(device_slug);
CREATE INDEX IF NOT EXISTS ratings_user_idx ON device_ratings(user_id);

CREATE OR REPLACE VIEW device_community_scores AS
SELECT
  device_slug,
  ROUND(AVG(rating)::numeric, 1) AS avg_rating,
  COUNT(*) AS total_ratings
FROM device_ratings
GROUP BY device_slug;

CREATE TABLE IF NOT EXISTS rating_votes (
  id         BIGSERIAL PRIMARY KEY,
  rating_id  BIGINT NOT NULL REFERENCES device_ratings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote       SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rating_id, user_id)
);

ALTER TABLE device_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ratings viewable by everyone" ON device_ratings;
CREATE POLICY "Ratings viewable by everyone"
  ON device_ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON device_ratings;
CREATE POLICY "Authenticated users can insert ratings"
  ON device_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own ratings within 48h" ON device_ratings;
CREATE POLICY "Users can update their own ratings within 48h"
  ON device_ratings FOR UPDATE
  USING (auth.uid() = user_id AND created_at > now() - interval '48 hours');

ALTER TABLE rating_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Votes viewable by everyone" ON rating_votes;
CREATE POLICY "Votes viewable by everyone"
  ON rating_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can vote" ON rating_votes;
CREATE POLICY "Authenticated users can vote"
  ON rating_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can change their own vote" ON rating_votes;
CREATE POLICY "Users can change their own vote"
  ON rating_votes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their own vote" ON rating_votes;
CREATE POLICY "Users can remove their own vote"
  ON rating_votes FOR DELETE USING (auth.uid() = user_id);