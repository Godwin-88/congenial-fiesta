-- Links affiliate click sessions to auth users for Verified Owner badge
-- Written by /api/out/[device]/[retailer] when user is authenticated
ALTER TABLE affiliate_clicks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS affiliate_clicks_user_idx ON affiliate_clicks(user_id);

CREATE OR REPLACE VIEW verified_device_owners AS
SELECT DISTINCT device_slug, user_id
FROM affiliate_clicks
WHERE user_id IS NOT NULL;
