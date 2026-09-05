-- Agent automation audit trail (see src/lib/devices/import.ts -> logAgentRun)
-- Each row records one orchestrator / agent run: what ran, when, and the
-- outcome summary so admins can audit + reflect on automation behavior.

CREATE TABLE IF NOT EXISTS agent_run_log (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent        TEXT NOT NULL,
  run_name     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'ok',
  summary      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_run_log_created_at_idx ON agent_run_log (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_run_log_agent_idx ON agent_run_log (agent);

ALTER TABLE agent_run_log ENABLE ROW LEVEL SECURITY;

-- Service role (admin server) can read + write; scheduled cron uses the same.
CREATE POLICY agent_run_log_admin_all ON agent_run_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON agent_run_log TO service_role;
GRANT SELECT ON agent_run_log TO authenticated;