-- Migration 032: Content index state + Knowledge Graph storage.
--
-- Part 1: content_index_state — reconciles what's been indexed into Upstash
--   (Search + Vector) so we can detect staleness, prune orphans, and rebuild
--   idempotently. Every indexDevice/indexArticle run records a content hash.
--
-- Part 2: knowledge graph (entities + relations) — the GraphRAG layer.
--   The book's "G-indexing → G-retrieval → G-generation" pattern, stored in
--   Postgres (graph logic lives in the API). Entities are devices, articles,
--   brands, specs, categories, authors … Relations are typed triples
--   (subject, predicate, object) enabling 1–2 hop retrieval.

-- ── Part 1: content_index_state ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_index_state (
  id            TEXT PRIMARY KEY,               -- same id used in Upstash: "device:slug" | "article:slug"
  content_type  TEXT NOT NULL CHECK (content_type IN ('device','article','video')),
  slug          TEXT NOT NULL,
  content_hash  TEXT NOT NULL,                  -- sha256 of the indexed text snapshot
  indexed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_index_state_type_idx ON content_index_state (content_type);
CREATE INDEX IF NOT EXISTS content_index_state_indexed_at_idx ON content_index_state (indexed_at DESC);

ALTER TABLE content_index_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_index_state_admin_all ON content_index_state;
CREATE POLICY content_index_state_admin_all ON content_index_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON content_index_state TO service_role;
GRANT SELECT ON content_index_state TO authenticated;

-- ── Part 2: knowledge graph ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entities (
  id          TEXT PRIMARY KEY,                 -- normalized entity id e.g. "device:xiaomi-poco-f9-pro"
  entity_type TEXT NOT NULL CHECK (entity_type IN ('device','article','brand','feature','spec','category','person','video','price_tier')),
  label       TEXT NOT NULL,                    -- display label
  meta        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entities_type_idx ON entities (entity_type);
CREATE INDEX IF NOT EXISTS entities_label_idx ON entities (label);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS entities_admin_all ON entities;
CREATE POLICY entities_admin_all ON entities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS entities_public_read ON entities;
CREATE POLICY entities_public_read ON entities
  FOR SELECT USING (true);
GRANT ALL ON entities TO service_role;
GRANT SELECT ON entities TO anon, authenticated;

CREATE TABLE IF NOT EXISTS relations (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id   TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  predicate    TEXT NOT NULL,                   -- e.g. "HAS_SPEC", "REVIEWS", "COMPETES_WITH", "IN_CATEGORY"
  object_id    TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  weight       REAL NOT NULL DEFAULT 1,
  source       TEXT NOT NULL DEFAULT 'kg-extractor',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, predicate, object_id)
);

CREATE INDEX IF NOT EXISTS relations_subject_idx ON relations (subject_id);
CREATE INDEX IF NOT EXISTS relations_object_idx ON relations (object_id);
CREATE INDEX IF NOT EXISTS relations_predicate_idx ON relations (predicate);

ALTER TABLE relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relations_admin_all ON relations;
CREATE POLICY relations_admin_all ON relations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS relations_public_read ON relations;
CREATE POLICY relations_public_read ON relations
  FOR SELECT USING (true);
GRANT ALL ON relations TO service_role;
GRANT SELECT ON relations TO anon, authenticated;