-- 048: Score provenance — who owns devices.scores_overall.
-- ============================================================================
-- Two scoring systems write devices.scores_overall:
--   * 'engine' — the deterministic ranking agent (recalculateDevice mirror)
--   * 'admin'  — the Fweezy Score the administrator enters in the form
--                (5 sub-scores weighted by site_settings)
-- The rule (2026-09-19): the ADMIN's computation supersedes the agent's in any
-- event. recalculateDevice may fill scores_overall only when the score is not
-- admin-owned, so an editorial 80.5 can never be stomped by a partial-coverage
-- engine number (the OnePlus 15 = 9.1 class of incident).
--
-- Backfill heuristic: every editorially scored device has at least one
-- sub-score set (the form writes all five together); engine-written scores
-- never touch sub-scores.

ALTER TABLE devices ADD COLUMN IF NOT EXISTS score_source TEXT;

UPDATE devices
SET score_source = CASE
  WHEN scores_overall IS NOT NULL
       AND (score_display IS NOT NULL OR score_performance IS NOT NULL
            OR score_camera IS NOT NULL OR score_battery IS NOT NULL
            OR score_value IS NOT NULL) THEN 'admin'
  WHEN scores_overall IS NOT NULL THEN 'engine'
  ELSE NULL
END
WHERE score_source IS NULL;

COMMENT ON COLUMN devices.score_source IS
  '''admin'' (manual Fweezy Score — engine must never overwrite) | ''engine'' (auto-computed) | NULL (not scored yet)';
