-- Drop NOT NULL on devices form-editable columns so admins can save DRAFTS
-- with incomplete data (e.g. no scores, no brand yet). Only `name` (and the
-- app-managed `slug`/`status` with defaults) remain required.
-- See: admin devices edit form (src/app/admin/devices/[id]/edit/page.tsx) which
-- sends `null` for every empty form field when saving a draft.

ALTER TABLE devices ALTER COLUMN brand_id DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN score_display DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN score_performance DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN score_camera DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN score_battery DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN score_value DROP NOT NULL;