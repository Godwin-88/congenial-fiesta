-- Migration 010: Admin CMS tables
-- Run this in Supabase SQL Editor
-- Creates all tables needed for the custom CMS admin

-- Admin staff roles (separate from community_profiles)
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  website       TEXT,
  featured      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  brand_id            BIGINT REFERENCES brands(id),
  release_year        INTEGER,
  category            TEXT CHECK (category IN ('flagship','mid-range','budget','ultra-premium')),
  price_kes           INTEGER,
  price_usd           INTEGER,
  tagline             TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  -- Scores
  score_display       NUMERIC(4,1),
  score_performance   NUMERIC(4,1),
  score_camera        NUMERIC(4,1),
  score_battery       NUMERIC(4,1),
  score_value         NUMERIC(4,1),
  score_overall       NUMERIC(4,1),
  -- Verdict
  verdict_pros        JSONB DEFAULT '[]',
  verdict_cons        JSONB DEFAULT '[]',
  verdict_bottom_line TEXT,
  verdict_full        TEXT,
  -- Images
  images              JSONB DEFAULT '[]',
  -- Specs (stored as JSONB for flexibility)
  specs_design        JSONB DEFAULT '{}',
  specs_display       JSONB DEFAULT '{}',
  specs_processor     JSONB DEFAULT '{}',
  specs_memory        JSONB DEFAULT '{}',
  specs_camera        JSONB DEFAULT '{}',
  specs_battery       JSONB DEFAULT '{}',
  specs_connectivity  JSONB DEFAULT '{}',
  specs_software      JSONB DEFAULT '{}',
  -- Benchmarks
  benchmark_geekbench_single  INTEGER,
  benchmark_geekbench_multi   INTEGER,
  benchmark_antutu            INTEGER,
  benchmark_pcmark            INTEGER,
  -- Buy links
  buy_links           JSONB DEFAULT '[]',
  -- Related content
  related_video_id    TEXT,
  related_tiktok_url  TEXT,
  -- SEO
  seo_title           TEXT,
  seo_description     TEXT,
  seo_og_image        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id                  BIGSERIAL PRIMARY KEY,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  excerpt             TEXT,
  featured_image      TEXT,
  body                JSONB,          -- Tiptap JSON output
  body_html           TEXT,           -- Rendered HTML (for public display)
  category            TEXT CHECK (category IN ('review','comparison','news','buying-guide','opinion')),
  associated_device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  tags                TEXT[] DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at        TIMESTAMPTZ,
  reading_time_minutes INTEGER,
  seo_title           TEXT,
  seo_description     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('youtube','tiktok','instagram','facebook')),
  embed_id        TEXT NOT NULL,
  thumbnail_url   TEXT,
  view_count      INTEGER,
  duration        TEXT,
  associated_device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  published_at    TIMESTAMPTZ,
  featured        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coming Soon
CREATE TABLE IF NOT EXISTS coming_soon (
  id              BIGSERIAL PRIMARY KEY,
  device_name     TEXT NOT NULL,
  silhouette_url  TEXT,
  expected_week   TEXT NOT NULL,
  teaser          TEXT,
  notify_emails   TEXT[] DEFAULT '{}',
  notify_count    INTEGER NOT NULL DEFAULT 0,
  linked_device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id                BIGSERIAL PRIMARY KEY,
  company_name      TEXT NOT NULL,
  logo_url          TEXT NOT NULL,
  website           TEXT,
  associated_video  TEXT,
  partnership_type  TEXT CHECK (partnership_type IN ('shoutout','dedicated-video','full-campaign','product-seeding')),
  display_order     INTEGER NOT NULL DEFAULT 0,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsorship Packages
CREATE TABLE IF NOT EXISTS sponsorship_packages (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK (tier IN ('starter','pro','premium')),
  description   TEXT NOT NULL,
  deliverables  TEXT[] DEFAULT '{}',
  highlighted   BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id            BIGSERIAL PRIMARY KEY,
  year          INTEGER NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Awards
CREATE TABLE IF NOT EXISTS awards (
  id                  BIGSERIAL PRIMARY KEY,
  award_name          TEXT NOT NULL,
  awarding_body       TEXT NOT NULL,
  year                INTEGER NOT NULL,
  certificate_image   TEXT,
  award_url           TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media Kit (singleton — always one active record)
CREATE TABLE IF NOT EXISTS media_kit (
  id                  BIGSERIAL PRIMARY KEY,
  short_bio           TEXT,
  long_bio            TEXT,
  total_followers     TEXT,
  total_views         TEXT,
  years_active        INTEGER,
  youtube_followers   TEXT,
  tiktok_followers    TEXT,
  instagram_followers TEXT,
  facebook_followers  TEXT,
  logo_light_url      TEXT,
  logo_dark_url       TEXT,
  logo_svg_light_url  TEXT,
  logo_svg_dark_url   TEXT,
  headshots           JSONB DEFAULT '[]',
  brand_colours       JSONB DEFAULT '[]',
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Site Settings (singleton)
CREATE TABLE IF NOT EXISTS site_settings (
  id                        BIGSERIAL PRIMARY KEY,
  score_weight_display      NUMERIC(4,2) NOT NULL DEFAULT 0.20,
  score_weight_performance  NUMERIC(4,2) NOT NULL DEFAULT 0.25,
  score_weight_camera       NUMERIC(4,2) NOT NULL DEFAULT 0.25,
  score_weight_battery      NUMERIC(4,2) NOT NULL DEFAULT 0.15,
  score_weight_value        NUMERIC(4,2) NOT NULL DEFAULT 0.15,
  admin_email               TEXT,
  advertise_page_indexed    BOOLEAN NOT NULL DEFAULT false,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coming_soon ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorship_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_kit ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read on published content
CREATE POLICY "Published devices are public" ON devices FOR SELECT USING (status = 'published');
CREATE POLICY "Published articles are public" ON articles FOR SELECT USING (status = 'published');
CREATE POLICY "Videos are public" ON videos FOR SELECT USING (true);
CREATE POLICY "Active coming soon is public" ON coming_soon FOR SELECT USING (active = true);
CREATE POLICY "Active sponsors are public" ON sponsors FOR SELECT USING (active = true);
CREATE POLICY "Packages are public" ON sponsorship_packages FOR SELECT USING (true);
CREATE POLICY "Milestones are public" ON milestones FOR SELECT USING (true);
CREATE POLICY "Awards are public" ON awards FOR SELECT USING (true);
CREATE POLICY "Brands are public" ON brands FOR SELECT USING (true);
CREATE POLICY "Active media kit is public" ON media_kit FOR SELECT USING (active = true);

-- Admin write access via service role (API routes use service role key)
-- No INSERT/UPDATE/DELETE policies needed — API routes use service role key
-- which bypasses RLS entirely