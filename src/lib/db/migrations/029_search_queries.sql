-- First-party search query logging (replaces the non-functional Upstash /analytics/top REST call)
CREATE TABLE IF NOT EXISTS search_queries (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_queries_created_idx ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS search_queries_query_idx ON search_queries(query);

-- RPC used by the aggregate-analytics cron to refresh the daily materialised view.
-- (Previously the cron called this name but the function didn't exist — silently failing.)
CREATE OR REPLACE FUNCTION refresh_daily_summary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_page_view_summary;
END;
$$;