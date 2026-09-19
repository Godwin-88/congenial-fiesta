-- Migration 045: Device-type aliases — taxonomy vocabulary as DATA, not code.
-- ============================================================================
-- The major-category detector (src/lib/devices/category-detect.ts) classifies a
-- device by matching its name against the live `device_types` taxonomy. A label
-- alone cannot know that an "iPhone 16 Pro Max" is a phone, so each device type
-- gains an `aliases` array: model-family and common-name vocabulary.
--
-- These are DATA, not hardcoded logic. An admin extends a category by adding an
-- alias row/value; no code change or deploy is required. The detector reads the
-- aliases at request time, so new model families are recognised immediately.
--
-- Table shape only changes additively (DEFAULT '{}'), so existing rows and the
-- device-types admin API keep working unchanged.

ALTER TABLE device_types
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

-- Seed vocabulary per device type. Idempotent: re-running only appends new
-- aliases and never duplicates an existing one.
UPDATE device_types SET aliases = (
  SELECT ARRAY(SELECT DISTINCT a FROM unnest(aliases || additions) AS a)
) FROM (VALUES
  ('phone', ARRAY['iphone','iphon','galaxy','pixel','redmi','poco','oneplus','xiaomi','mi ','oppo','vivo','honor','tecno','infinix','itel','nokia','huawei','realme','nothing phone','asus zenfone','sony xperia','smartphone','handset','5g phone']),
  ('tablet', ARRAY['ipad','galaxy tab','matepad','tab s','tab a','pad 6','pad 7','pad pro','windows tablet']),
  ('smartwatch', ARRAY['apple watch','galaxy watch','watch','smartwatch','fitbit','band 9','band 8','wear os']),
  ('tv', ARRAY['smart tv','oled','qled','neo qled','led tv','uhd tv','4k tv','8k tv','bravia','hisense','tcl tv','android tv','google tv','the frame','webos','tizen tv']),
  ('soundbar', ARRAY['sound bar','soundbar','atmos bar','q-series soundbar']),
  ('speaker', ARRAY['bluetooth speaker','wireless speaker','party speaker','boombox','portable speaker','smart speaker','sound system','home theatre']),
  ('headphone', ARRAY['headphone','headphones','headset','earbuds','earbud','earphone','earphones','airpods','galaxy buds','buds','tws','wh-1000','wf-1000','noise cancelling headphones']),
  ('macbook', ARRAY['macbook','macbook air','macbook pro','mac book']),
  ('imac', ARRAY['imac','imac pro','imac 24']),
  ('mac-mini', ARRAY['mac mini','mac studio','mac pro'])
) AS t(slug, additions)
WHERE device_types.slug = t.slug;
