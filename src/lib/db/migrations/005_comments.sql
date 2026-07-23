CREATE TABLE IF NOT EXISTS comments (
  id            BIGSERIAL PRIMARY KEY,
  content_type  TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'device')),
  content_slug  TEXT NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id     BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  helpful_count INTEGER NOT NULL DEFAULT 0,
  reported      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_content_idx ON comments(content_type, content_slug);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_id);
CREATE INDEX IF NOT EXISTS comments_user_idx ON comments(user_id);

CREATE TABLE IF NOT EXISTS comment_votes (
  id         BIGSERIAL PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote       SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
CREATE POLICY "Comments viewable by everyone"
  ON comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can post comments" ON comments;
CREATE POLICY "Authenticated users can post comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can edit their own comments" ON comments;
CREATE POLICY "Users can edit their own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Votes viewable by everyone" ON comment_votes;
CREATE POLICY "Votes viewable by everyone"
  ON comment_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can vote" ON comment_votes;
CREATE POLICY "Authenticated users can vote"
  ON comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can change their own vote" ON comment_votes;
CREATE POLICY "Users can change their own vote"
  ON comment_votes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their own vote" ON comment_votes;
CREATE POLICY "Users can remove their own vote"
  ON comment_votes FOR DELETE USING (auth.uid() = user_id);