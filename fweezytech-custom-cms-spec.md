# FweezyTech Custom CMS — Product Specification

**Document type:** Solutions Architecture — Epics, Features, User Stories & Acceptance Criteria  
**Prepared by:** Solutions Architect (G)  
**Framework:** Digital Capability Canvas v3 (capability_canvas_3.cypher)  
**Replaces:** Payload CMS v3 (removed due to ESM/importMap/vendor lock-in)  
**Reference:** README.md (current repo state — July 2026)  
**CMS stack:** Next.js 15 App Router · Supabase Postgres · Upstash Redis · Tiptap · Cloudflare Images  
**Date:** July 2026

---

## 1. Context & Decision Record

Payload CMS v3 was removed after 2 days of unresolvable ESM conflicts (`ERR_REQUIRE_ASYNC_MODULE`), broken `importMap` auto-generation injecting a non-existent `CollectionCards` export from `@payloadcms/next/rsc`, and white-screen crashes on every article create/edit attempt caused by `useConfig()` returning `undefined` inside `@payloadcms/richtext-lexical`.

The replacement is a **fully custom CMS admin** built inside the existing Next.js app, using infrastructure already deployed and proven:

| Removed | Replaced With |
|---|---|
| Payload CMS collections | Supabase Postgres tables (migrations 001–009 already run) |
| Payload Lexical rich text editor | Tiptap v2 (battle-tested, zero config hell) |
| Payload REST API (`/api/[...slug]`) | Custom Next.js API routes (already exist for community, analytics, etc.) |
| Payload Auth | Supabase Auth (already wired — Google OAuth + magic link) |
| Payload admin UI (`/admin`) | Custom Next.js admin pages at `/admin/*` |
| Payload importMap / `payload.config.ts` | Deleted entirely |
| `payload-types.ts` | TypeScript interfaces derived from Supabase schema |

### What already exists (DO NOT rebuild)
- `/admin/analytics/` — analytics dashboard with charts (fully working)
- All public-facing pages — devices, articles, videos, compare, search, chat, etc.
- Supabase Auth — `src/lib/auth/actions.ts`, `src/context/AuthContext.tsx`
- Supabase client/server utilities — `src/lib/supabase/`
- Upstash Redis, Search, Vector, QStash — `src/lib/upstash/`
- All 9 SQL migrations — tables exist in Supabase Postgres
- `src/lib/admin/access.ts` — `adminOnly`, `adminOrEditor`, `adminOrSelf` functions
- `src/components/layout/AdminRouteGuard.tsx` — auth protection component
- `src/components/admin/` — Dashboard, Logo, Icon, AnalyticsNavLink, AiAssistant (keep, repurpose)

---

## 2. Digital Capability Canvas Alignment

| Canvas Domain | Canvas SubDomain | Canvas Capability | CMS Feature |
|---|---|---|---|
| Manage Digital Channels | Manage Online Channels (Web) | Manage Content Publishing | Article / Device publish workflow |
| Manage Digital Channels | Manage Online Channels (Web) | Manage Content Authoring | Tiptap rich text editor |
| Manage Digital Channels | Manage Online Channels (Web) | Manage Content Management | Admin CRUD for all collections |
| Manage Digital Channels | Manage Online Channels (Web) | Manage Content Library | Media library (Cloudflare Images) |
| Manage Digital Channels | Manage Field Channels | Manage Video Media | YouTube / TikTok video management |
| Manage MarCom Orchestration | Manage Marketing Planning | Manage Campaign Planning | Coming Soon / Content Calendar |
| Manage MarCom Orchestration | Manage Digital MarCom Campaigns | Manage Brand Positioning | Sponsors, Awards, Milestones mgmt |
| Manage Digital Intelligence | Horizontal Intelligence | Manage Channel Engagement Analytics | Analytics dashboard (existing) |
| Manage Digital Backoffice | Manage Legal | Manage Intellectual Property | Media Kit management |
| Manage Digital Security | — | Manage Identity & Access Security | Supabase Auth RBAC on all routes |

---

## 3. Admin Information Architecture

```
/admin                          ← Dashboard (landing page)
/admin/articles                 ← Article list
/admin/articles/create          ← Create article (Tiptap editor) ← MVP PRIORITY
/admin/articles/[id]/edit       ← Edit article
/admin/devices                  ← Device list
/admin/devices/create           ← Create device
/admin/devices/[id]/edit        ← Edit device
/admin/brands                   ← Brand list + create/edit
/admin/videos                   ← Video list + create/edit
/admin/coming-soon              ← Coming Soon teasers list + create/edit
/admin/sponsors                 ← Sponsors list + create/edit
/admin/packages                 ← Sponsorship packages list + create/edit
/admin/milestones               ← Milestones list + create/edit
/admin/awards                   ← Awards list + create/edit
/admin/media-kit                ← Media Kit singleton edit
/admin/users                    ← User list (admin only)
/admin/analytics                ← Analytics dashboard (ALREADY EXISTS — keep)
/admin/settings                 ← Site settings (weights, emails, toggles)
```

### Role matrix

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| Create / Edit articles | ✅ | ✅ | ❌ |
| Delete articles | ✅ | ❌ | ❌ |
| Create / Edit devices | ✅ | ✅ | ❌ |
| Delete devices | ✅ | ❌ | ❌ |
| Create / Edit videos | ✅ | ✅ | ❌ |
| Delete videos | ✅ | ✅ | ❌ |
| Manage brands | ✅ | ✅ | ❌ |
| Manage sponsors / packages | ✅ | ❌ | ❌ |
| Manage milestones / awards | ✅ | ❌ | ❌ |
| Manage media kit | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ |
| View all lists | ✅ | ✅ | ✅ |
| Access /admin/* | ✅ | ✅ | ✅ |

Role stored in `community_profiles.role` column (add via migration 010).

---

## 4. Database Schema (Supabase Postgres)

All tables below map directly to the existing 9 migrations plus new migration 010.

### Migration 010 — CMS tables

```sql
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
```

---

## 5. Epics Overview

| # | Epic | Canvas Domain | Priority |
|---|---|---|---|
| EP-A1 | Admin Shell & Auth | Manage Digital Security | 🔴 Must (blocks everything) |
| EP-A2 | Article Management | Manage Digital Channels | 🔴 Must (MVP) |
| EP-A3 | Device Management | Manage Digital Channels | 🔴 Must |
| EP-A4 | Brand Management | Manage Digital Channels | 🔴 Must |
| EP-A5 | Video Management | Manage Digital Channels | 🟡 Should |
| EP-A6 | Coming Soon Management | Manage MarCom Orchestration | 🟡 Should |
| EP-A7 | Media Library | Manage Digital Channels | 🟡 Should |
| EP-A8 | Sponsor & Package Management | Manage MarCom Orchestration | 🟢 Could |
| EP-A9 | Brand Assets Management | Manage Digital Backoffice | 🟢 Could |
| EP-A10 | User Management | Manage Digital Security | 🟢 Could |
| EP-A11 | Site Settings | Manage Digital IT | 🟢 Could |
| EP-A12 | Admin Dashboard | Manage Digital Intelligence | 🟢 Could |

---

## 6. Detailed Epics, Features, User Stories & Acceptance Criteria

---

### EP-A1 — Admin Shell & Authentication

**Canvas trace:** `Manage Digital Security` → `Manage Identity & Access Security`  
**Depends on:** Supabase Auth (already wired), `src/lib/auth/actions.ts` (exists), `AdminRouteGuard.tsx` (exists)

---

#### Feature A1.1 — Admin Route Protection

**User Story A1.1.1**
> As the system, I want every `/admin/*` route protected so that unauthenticated users and non-staff visitors are redirected to the login page.

**Acceptance Criteria:**
- `src/app/admin/layout.tsx` wraps all admin routes
- On mount: calls `getUser()` from `src/lib/auth/actions.ts`
- If no session: redirect to `/auth/login?next=/admin`
- If session but user not in `admin_users` table: redirect to `/` with toast "Access denied"
- If session and user in `admin_users`: render admin shell
- Role stored in `admin_users.role` — fetched once per session and stored in context
- `src/context/AdminContext.tsx` exposes `{ user, role, isAdmin, isEditor }` to all admin pages

**User Story A1.1.2**
> As an admin staff member, I want a persistent sidebar navigation so that I can move between CMS sections without losing context.

**Acceptance Criteria:**
- Admin layout renders: `<AdminSidebar />` (left, fixed, w-64) + `<main>` (flex-1)
- Sidebar sections match Information Architecture from Section 3
- Active route highlighted with brand primary colour
- FweezyTech logo + "CMS" wordmark at sidebar top (reuse `src/components/admin/Logo.tsx`)
- User avatar + display name + role badge at sidebar bottom
- "Sign Out" button calls `signOut()` from `src/lib/auth/actions.ts`
- Sidebar collapses to icon-only on mobile (hamburger toggle)
- All sidebar links are Next.js `<Link>` — no page reload on navigation

#### Feature A1.2 — Admin Login Page

**User Story A1.2.1**
> As a staff member, I want a dedicated login page at `/auth/login` so that I can sign in with Google or magic link to access the CMS.

**Acceptance Criteria:**
- Route: `/auth/login`
- FweezyTech logo centred
- "Sign in to FweezyTech CMS" heading
- Google OAuth button → calls `signInWithGoogle('/admin')` 
- Magic link email input + "Send Magic Link" button → calls `signInWithMagicLink(email, '/admin')`
- Success state for magic link: "Check your email — link sent!"
- Error state: inline error message
- If already authenticated and in `admin_users`: redirect to `/admin`
- No `<form>` tags — use `onClick` handlers throughout

---

### EP-A2 — Article Management (MVP PRIORITY)

**Canvas trace:** `Manage Digital Channels` → `Manage Online Channels (Web)` → `Manage Content Authoring` · `Manage Content Publishing`

---

#### Feature A2.1 — Article List Page

**User Story A2.1.1**
> As an editor, I want to see all articles in a table with their status, category, and publish date so that I can manage the content pipeline at a glance.

**Acceptance Criteria:**
- Route: `/admin/articles`
- Fetches from `articles` table via Supabase server client (service role)
- Table columns: Title · Category · Status badge (Draft=amber, Published=green) · Associated Device · Reading Time · Published Date · Actions
- Actions column: "Edit" button → `/admin/articles/[id]/edit` | "Delete" button (admin only, confirm dialog)
- "Create Article" button top-right → `/admin/articles/create`
- Filter tabs: All · Draft · Published
- Search input filters by title client-side
- Sorted by `updated_at` descending
- Empty state: "No articles yet — create your first one"
- Skeleton loaders while fetching
- Pagination: 20 per page

**User Story A2.1.2**
> As an admin, I want to delete an article with a confirmation step so that I don't accidentally remove published content.

**Acceptance Criteria:**
- Delete button opens a shadcn `AlertDialog`: "Delete '{title}'? This cannot be undone."
- Confirm → `DELETE /api/admin/articles/[id]`
- Success: toast "Article deleted", row removed from table optimistically
- Error: toast "Failed to delete — try again"
- Delete button only visible to admin role — hidden for editor role

---

#### Feature A2.2 — Article Create Page (MVP #1 PRIORITY)

**User Story A2.2.1**
> As an editor, I want to create a new article with a rich text editor, metadata fields, and a publish button so that I can produce content for FweezyTech without any white screens or crashes.

**Acceptance Criteria:**
- Route: `/admin/articles/create`
- Page renders without any console errors — zero white screens
- Two-column layout (desktop): main content (left, flex-1) + sidebar (right, w-72)

**MAIN CONTENT AREA:**
- Title input: large text input, placeholder "Article title…", `autoFocus`
- Slug input: auto-generated from title (kebab-case), editable, shows live preview URL: `fweezytech.com/articles/{slug}`
- Excerpt textarea: 2-line, placeholder "Short summary shown in search results and article cards…", max 300 chars with counter
- Tiptap rich text editor (see Feature A2.3 for full editor spec)
- Editor area min-height: 500px, grows with content

**SIDEBAR:**
- Status select: Draft / Published (default: Draft)
- Published At date picker (only enabled when status = Published)
- Category select: Review / Comparison / News / Buying Guide / Opinion
- Associated Device: searchable select (queries `devices` table, shows name + brand)
- Featured Image: URL input + preview thumbnail (Cloudflare Images URL)
- Tags input: comma-separated, rendered as pills
- SEO section (collapsible):
  - Meta Title (default: article title)
  - Meta Description (default: excerpt)
- Reading time: auto-computed display (not editable): "{n} min read"

**ACTIONS:**
- "Save Draft" button: saves with `status: 'draft'`
- "Publish" button: saves with `status: 'published'`, sets `published_at: now()`
- "Preview" button: opens `/articles/{slug}` in new tab (draft preview via query param)
- Auto-save: every 30 seconds if content has changed — shows "Saving…" / "Saved" indicator
- Keyboard shortcut: Cmd/Ctrl+S triggers Save Draft

**ON SAVE:**
- POST `/api/admin/articles` with full article body
- API computes `reading_time_minutes` = word count / 200 rounded up
- API triggers Upstash Search + Vector reindex for this article
- Redirects to `/admin/articles/[id]/edit` on first save
- Toast: "Article saved" / "Article published"

**Acceptance Criteria — data:**
- `body` column stores Tiptap JSON (`editor.getJSON()`)
- `body_html` column stores rendered HTML (`editor.getHTML()`) — used by public article page
- Slug uniqueness validated server-side — returns 409 if duplicate
- Empty title prevented: "Save Draft" disabled until title has ≥ 3 characters

---

#### Feature A2.3 — Tiptap Rich Text Editor

**User Story A2.3.1**
> As an editor, I want a full-featured rich text editor with toolbar so that I can write formatted articles with headings, lists, links, images, and blockquotes without needing to know HTML.

**Acceptance Criteria:**

**Editor extensions (install: `@tiptap/starter-kit` covers most):**
- Bold, Italic, Underline, Strikethrough
- Heading (H2, H3, H4 only — H1 is the article title)
- Bullet list, Ordered list
- Blockquote (styled with brand primary left border)
- Code block (monospace, dark bg)
- Horizontal rule
- Link (with `target="_blank"` + `rel="noopener noreferrer"` enforced)
- Image (URL-based — paste Cloudflare Images URL, renders inline)
- Hard break (Shift+Enter)

**Custom blocks (implement as Tiptap Node extensions):**
- **Pros/Cons block:** Two-column layout, green ✓ pros list + red ✗ cons list — for verdict sections
- **Buy Box block:** Retailer name + price + affiliate URL — renders as styled CTA on public page
- **Pull Quote block:** Large italic quote with brand primary accent — for highlighting key statements
- **Info Box block:** Brand primary bg, info icon, text content — for tips and notes

**Toolbar:**
Sticky toolbar above editor. Groups:
- Text style: Bold · Italic · Underline · Strike
- Headings: H2 · H3 · H4
- Lists: Bullet · Ordered
- Blocks: Blockquote · Code · HR
- Insert: Link · Image · Pros/Cons · Buy Box · Pull Quote · Info Box
- Alignment: Left · Centre · Right (using Tiptap TextAlign extension)

**Toolbar behaviour:**
- Active state on buttons matches current cursor position
- Link modal: URL input + "Open in new tab" checkbox
- Image insert: URL input with preview before inserting
- Keyboard shortcuts labelled in tooltips on toolbar buttons

**Install packages:**
```
@tiptap/react
@tiptap/pm
@tiptap/starter-kit
@tiptap/extension-underline
@tiptap/extension-link
@tiptap/extension-image
@tiptap/extension-text-align
@tiptap/extension-placeholder
@tiptap/extension-character-count
@tiptap/extension-code-block
```

---

#### Feature A2.4 — Article Edit Page

**User Story A2.4.1**
> As an editor, I want to edit an existing article with all its current content pre-populated so that I can make updates and republish without data loss.

**Acceptance Criteria:**
- Route: `/admin/articles/[id]/edit`
- Fetches article by `id` from Supabase on server
- If not found: 404 with "Article not found" + "Back to Articles" link
- All fields pre-populated from database
- Tiptap editor initialised with `body` JSON: `editor.commands.setContent(article.body)`
- Same layout as create page
- "Unpublish" button visible if `status === 'published'`: sets status back to draft
- "Delete" button (admin only): confirm dialog then DELETE
- Last saved timestamp shown: "Last saved 3 minutes ago"
- PATCH `/api/admin/articles/[id]` on save
- Optimistic UI: button shows "Saving…" during request
- If another user is editing: no conflict detection at MVP — last write wins (note in UI)

---

### EP-A3 — Device Management

**Canvas trace:** `Manage Digital Channels` → `Manage Online Channels (Web)` → `Manage Content Library` · `Manage Content Formats`

---

#### Feature A3.1 — Device List Page

**User Story A3.1.1**
> As an editor, I want to see all devices in a table with their brand, category, Fweezy Score, and status so that I can manage the device review catalogue.

**Acceptance Criteria:**
- Route: `/admin/devices`
- Table columns: Image (40px thumbnail) · Name · Brand · Category · Score (colour-coded badge) · Status · Year · Actions
- "Add Device" button → `/admin/devices/create`
- Filter: All / Draft / Published + Brand dropdown filter
- Search by device name (client-side)
- Sorted by `updated_at` descending
- Score badge: green ≥ 80 / amber 60–79 / red < 60 (reuse `ScoreBadge` component from `src/components/devices/`)

---

#### Feature A3.2 — Device Create/Edit Form

**User Story A3.2.1**
> As an editor, I want to fill in a structured device form with all spec groups, Fweezy Score dimensions, and buy links so that a complete device review page is generated on the public site.

**Acceptance Criteria:**
- Routes: `/admin/devices/create` and `/admin/devices/[id]/edit`
- Form organised in collapsible sections using shadcn `Accordion`:
  1. **Identity** — Name · Slug · Brand (select) · Year · Category · Price KES · Price USD · Tagline · Status
  2. **Images** — Repeatable rows: URL + Alt + Colour variant + isPrimary checkbox (max 10)
  3. **Fweezy Score** — 5 sliders (0–10 each): Display · Performance · Camera · Battery · Value. Overall score displayed live as they adjust: `(d×0.20 + p×0.25 + c×0.25 + b×0.15 + v×0.15) × 10`
  4. **Verdict** — Pros (repeatable text inputs, max 5) · Cons (repeatable, max 5) · Bottom Line (single text) · Full Verdict (Tiptap mini-editor, no custom blocks)
  5. **Specs: Design** — Dimensions · Weight · Build · Colours · Water Resistance
  6. **Specs: Display** — Size · Type · Resolution · Refresh Rate · Brightness · Protection
  7. **Specs: Processor** — Chipset · CPU · GPU · Process node
  8. **Specs: Memory** — RAM · Storage · Expandable checkbox
  9. **Specs: Camera** — Main · Ultrawide · Telephoto · Video (main) · Front · Video (front)
  10. **Specs: Battery** — Capacity · Wired charging · Wireless charging · Reverse charging
  11. **Specs: Connectivity** — Network · WiFi · Bluetooth · NFC · USB · Satellite
  12. **Specs: Software** — OS · UI layer · Update policy
  13. **Benchmarks** — Geekbench Single · Multi · AnTuTu · PCMark (number inputs)
  14. **Buy Links** — Repeatable rows: Retailer (select) · URL · Price · Price Date (max 4)
  15. **Related Content** — YouTube video ID · TikTok URL
  16. **SEO** — Meta title · Meta description

**Sidebar (sticky):**
- Status select (Draft/Published)
- Brand select (quick-select from brands table)
- "Save Draft" + "Publish" buttons
- "Preview on site" link → `/devices/{brandSlug}/{deviceSlug}` (new tab)
- Score overall display: large number, colour-coded, updates live

**On save:**
- POST `/api/admin/devices` (create) or PATCH `/api/admin/devices/[id]` (edit)
- API computes `score_overall` server-side from 5 sub-scores + weights from `site_settings`
- API triggers Upstash Search + Vector reindex
- Toast confirmation

---

### EP-A4 — Brand Management

**Canvas trace:** `Manage Digital Channels` → `Manage Content Library`

---

#### Feature A4.1 — Brand List & Create/Edit

**User Story A4.1.1**
> As an editor, I want to create and manage device brands so that devices can be correctly categorised and filterable on the public site.

**Acceptance Criteria:**
- Route: `/admin/brands`
- Table: Logo (32px) · Name · Slug · Device count · Featured · Actions
- Inline create row at top of table (name + slug + logo URL + featured toggle + Save)
- Edit in modal (shadcn Dialog): same fields
- Delete: only if no devices linked to brand (returns 409 if devices exist)
- "Featured" toggle: featured brands appear in homepage brand grid
- Slug auto-generated from name, editable

---

### EP-A5 — Video Management

**Canvas trace:** `Manage Digital Channels` → `Manage Video Media`

---

#### Feature A5.1 — Video List & Create/Edit

**User Story A5.1.1**
> As an editor, I want to add videos from TikTok, Instagram, and Facebook to the video feed so that all of Fweezytech's content appears on the site regardless of platform.

**Acceptance Criteria:**
- Route: `/admin/videos`
- Table: Thumbnail · Title · Platform badge · View count · Featured · Published Date · Actions
- Create/Edit form (modal or page):
  - Title · Platform (select) · Embed ID / URL · Thumbnail URL · View count · Duration · Associated Device · Published At · Featured toggle
  - YouTube: helper text "Paste YouTube video ID only (not full URL)"
  - TikTok/IG/FB: "Paste full URL"
- Featured toggle: featured videos appear in homepage hero carousel

---

### EP-A6 — Coming Soon Management

**Canvas trace:** `Manage MarCom Orchestration` → `Manage Campaign Planning`

---

#### Feature A6.1 — Coming Soon Teasers

**User Story A6.1.1**
> As an editor, I want to create coming-soon teasers for upcoming device reviews so that visitors can sign up to be notified and anticipate the content.

**Acceptance Criteria:**
- Route: `/admin/coming-soon`
- Table: Device name · Expected week · Notify count · Linked device · Active toggle · Actions
- Create/Edit form:
  - Device Name · Silhouette Image URL · Expected Week (text, e.g. "February 2026") · Teaser text · Active toggle · Linked Device (select from devices)
- Notify Emails column: admin-only view of email list — shown as count chip, expandable to list
- "Mark as Published" shortcut: sets `active: false` + prompts to link a device
- When `linked_device_id` is set: teaser auto-hides on public site

---

### EP-A7 — Media Library

**Canvas trace:** `Manage Digital Channels` → `Manage Content Library`

---

#### Feature A7.1 — Image Upload & Management

**User Story A7.1.1**
> As an editor, I want to upload images directly from the CMS and get a Cloudflare Images URL back so that I don't have to leave the admin to manage media.

**Acceptance Criteria:**
- Route: `/admin/media`
- Grid of uploaded images: thumbnail · filename · upload date · copy URL button
- Upload button: file picker → POST to `/api/admin/media/upload`
- Upload API: receives image file, uploads to Cloudflare Images via their Upload API, returns the Cloudflare Images URL
- Supported formats: JPG, PNG, WebP, GIF — max 10MB per file
- URL format returned: `https://imagedelivery.net/{accountHash}/{imageId}/public`
- "Copy URL" button: copies URL to clipboard with toast "URL copied"
- Search by filename
- Delete: calls Cloudflare Images delete API, removes from grid
- Image picker modal: appears when editor clicks image insert in Tiptap — shows media library grid with "Select" button per image

---

### EP-A8 — Sponsor & Package Management

**Canvas trace:** `Manage MarCom Orchestration` → `Manage Brand Positioning`

---

#### Feature A8.1 — Sponsors

**User Story A8.1.1**
> As an admin, I want to manage the brand partner logos displayed on the /advertise page so that the sponsor showcase stays current.

**Acceptance Criteria:**
- Route: `/admin/sponsors`
- Table: Logo · Company name · Type · Display order · Active · Actions
- Create/Edit modal: Company name · Logo URL · Website · Associated Video · Partnership type · Display order · Active
- Drag-to-reorder display order (or numeric input)

#### Feature A8.2 — Sponsorship Packages

**User Story A8.2.1**
> As an admin, I want to manage the three-tier sponsorship packages on the /advertise page so that pricing and deliverables stay current.

**Acceptance Criteria:**
- Route: `/admin/packages`
- Table: Name · Tier · Highlighted · Display order · Actions
- Create/Edit: Name · Tier · Description · Deliverables (repeatable text inputs) · Highlighted toggle · Display order

---

### EP-A9 — Brand Assets Management

**Canvas trace:** `Manage Digital Backoffice` → `Manage Intellectual Property`

---

#### Feature A9.1 — Milestones

**User Story A9.1.1**
> As an admin, I want to manage the milestone timeline entries on the /about page so that Fweezytech's journey is accurately represented.

**Acceptance Criteria:**
- Route: `/admin/milestones`
- Table: Year · Title · Display order · Actions
- Create/Edit modal: Year (number) · Title · Description · Display order

#### Feature A9.2 — Awards

**Acceptance Criteria:**
- Route: `/admin/awards`
- Create/Edit: Award name · Awarding body · Year · Certificate image URL · Award URL · Display order

#### Feature A9.3 — Media Kit

**User Story A9.3.1**
> As an admin, I want to edit the media kit singleton so that press kit downloads and the /press page always show current follower counts and bios.

**Acceptance Criteria:**
- Route: `/admin/media-kit`
- Single form (no list — singleton):
  - Short bio (textarea, 100 word limit + counter)
  - Long bio (textarea, 300 word limit + counter)
  - Platform followers: YouTube · TikTok · Instagram · Facebook (text inputs, e.g. "150K+")
  - Total followers + Total views (text inputs)
  - Years active (number)
  - Logo URLs: Light PNG · Dark PNG · Light SVG · Dark SVG
  - Headshots: repeatable rows (URL + label)
  - Brand colours: repeatable rows (Name + Hex + RGB + CMYK)
- "Save" button: PATCH `/api/admin/media-kit`
- Last updated timestamp shown

---

### EP-A10 — User Management

**Canvas trace:** `Manage Digital Security` → `Manage Identity & Access Security`

---

#### Feature A10.1 — Admin User List

**User Story A10.1.1**
> As an admin, I want to see all CMS staff accounts and manage their roles so that access control is maintained as the team grows.

**Acceptance Criteria:**
- Route: `/admin/users`
- Visible to admin role only — editors see 403 page
- Table: Avatar · Display name · Email · Role badge · Created · Actions
- "Add User" button: opens modal — Email input + Role select + Display name. Creates `admin_users` record (does NOT create Supabase Auth user — user must sign up themselves first)
- Edit: change role only (name and email not editable here)
- Delete: removes from `admin_users` (does not delete Supabase Auth account)
- Cannot delete own account
- Cannot demote own role

---

### EP-A11 — Site Settings

**Canvas trace:** `Manage Digital IT` → `Manage Platform Configuration`

---

#### Feature A11.1 — Settings Page

**User Story A11.1.1**
> As an admin, I want to configure global site settings such as Fweezy Score dimension weights so that scoring is consistent without code changes.

**Acceptance Criteria:**
- Route: `/admin/settings`
- Visible to admin role only
- Sections:
  1. **Score Weights** — 5 number inputs (0.00–1.00 each) for Display / Performance / Camera / Battery / Value. Live sum shown: must equal 1.00 or Save is disabled. Helper: "Weights must add up to 1.00"
  2. **Admin Email** — text input: email that receives weekly digests and sponsor inquiries
  3. **Advertise Page** — toggle: "Index /advertise page in search engines"
  4. **Content** — "Reindex all content" button → POST `/api/admin/reindex` (triggers `search:reindex` equivalent server-side)
- Save: PATCH `/api/admin/settings`
- Success toast: "Settings saved"

---

### EP-A12 — Admin Dashboard

**Canvas trace:** `Manage Digital Intelligence` → `Horizontal Intelligence`

---

#### Feature A12.1 — Dashboard Home

**User Story A12.1.1**
> As any staff member, I want to land on a useful dashboard after logging in so that I immediately know what needs attention and can navigate to the right section fast.

**Acceptance Criteria:**
- Route: `/admin`
- Time-based greeting: "Good morning/afternoon/evening, {displayName}!"
- **Quick Actions grid** (2×2):
  - "Write Article" → `/admin/articles/create`
  - "Add Device" → `/admin/devices/create`
  - "Add Video" → `/admin/videos/create`
  - "Add Teaser" → `/admin/coming-soon/create`
- **Content Status chips** (fetched client-side):
  - Draft articles count (amber if > 0)
  - Draft devices count (amber if > 0)
  - Active teasers count
- **Recent Activity** (last 5 updated articles + devices, from Supabase):
  - Content type icon · Title · "Updated X minutes ago"
  - Clickable → edit page
- **Daily tip** (rotates by day of week — 7 tips, same array as before)
- **Analytics snapshot** (3 stat cards, from `/api/admin/analytics-summary`):
  - Page views today
  - Top device page (today)
  - Affiliate clicks this week
- Skeleton loaders for all fetched data

---

## 7. API Routes (Admin)

All routes under `/api/admin/*` require:
1. Valid Supabase session (checked via `createServerClient`)
2. User present in `admin_users` table (checked via service role query)
3. Role check where specified

| Method | Route | Role | Description |
|---|---|---|---|
| GET | `/api/admin/articles` | any | List articles with filters |
| POST | `/api/admin/articles` | editor+ | Create article |
| GET | `/api/admin/articles/[id]` | any | Get single article |
| PATCH | `/api/admin/articles/[id]` | editor+ | Update article |
| DELETE | `/api/admin/articles/[id]` | admin | Delete article |
| GET | `/api/admin/devices` | any | List devices |
| POST | `/api/admin/devices` | editor+ | Create device |
| PATCH | `/api/admin/devices/[id]` | editor+ | Update device |
| DELETE | `/api/admin/devices/[id]` | admin | Delete device |
| GET | `/api/admin/brands` | any | List brands |
| POST | `/api/admin/brands` | editor+ | Create brand |
| PATCH | `/api/admin/brands/[id]` | editor+ | Update brand |
| DELETE | `/api/admin/brands/[id]` | admin | Delete brand (fails if devices linked) |
| GET | `/api/admin/videos` | any | List videos |
| POST | `/api/admin/videos` | editor+ | Create video |
| PATCH | `/api/admin/videos/[id]` | editor+ | Update video |
| DELETE | `/api/admin/videos/[id]` | editor+ | Delete video |
| GET | `/api/admin/coming-soon` | any | List teasers |
| POST | `/api/admin/coming-soon` | editor+ | Create teaser |
| PATCH | `/api/admin/coming-soon/[id]` | editor+ | Update teaser |
| DELETE | `/api/admin/coming-soon/[id]` | editor+ | Delete teaser |
| POST | `/api/admin/media/upload` | editor+ | Upload to Cloudflare Images |
| GET | `/api/admin/media` | any | List Cloudflare Images |
| DELETE | `/api/admin/media/[id]` | admin | Delete from Cloudflare Images |
| GET | `/api/admin/sponsors` | any | List sponsors |
| POST | `/api/admin/sponsors` | admin | Create sponsor |
| PATCH | `/api/admin/sponsors/[id]` | admin | Update sponsor |
| DELETE | `/api/admin/sponsors/[id]` | admin | Delete sponsor |
| GET/PATCH | `/api/admin/media-kit` | admin | Get/update media kit singleton |
| GET/PATCH | `/api/admin/settings` | admin | Get/update site settings |
| GET | `/api/admin/users` | admin | List admin users |
| POST | `/api/admin/users` | admin | Add admin user |
| PATCH | `/api/admin/users/[id]` | admin | Update user role |
| DELETE | `/api/admin/users/[id]` | admin | Remove admin user |
| POST | `/api/admin/reindex` | admin | Trigger full Upstash reindex |
| GET | `/api/admin/analytics-summary` | any | Dashboard stat cards |

---

## 8. Shared Admin Components

| Component | Path | Description |
|---|---|---|
| `AdminSidebar` | `src/components/admin/Sidebar.tsx` | Navigation sidebar with role-aware links |
| `AdminHeader` | `src/components/admin/AdminHeader.tsx` | Top bar: breadcrumb + user avatar |
| `TiptapEditor` | `src/components/admin/TiptapEditor.tsx` | Full rich text editor with toolbar |
| `TiptapMini` | `src/components/admin/TiptapMini.tsx` | Minimal editor (no custom blocks) for verdicts |
| `MediaPicker` | `src/components/admin/MediaPicker.tsx` | Image picker modal using media library |
| `FormField` | `src/components/admin/FormField.tsx` | Label + input + error message wrapper |
| `RepeatableField` | `src/components/admin/RepeatableField.tsx` | Add/remove rows (pros, cons, buy links, etc.) |
| `StatusBadge` | `src/components/admin/StatusBadge.tsx` | Draft (amber) / Published (green) badge |
| `ScoreSliders` | `src/components/admin/ScoreSliders.tsx` | 5 sliders + live overall score display |
| `ConfirmDialog` | `src/components/admin/ConfirmDialog.tsx` | Reusable delete confirmation dialog |
| `SaveBar` | `src/components/admin/SaveBar.tsx` | Sticky bottom bar: Save Draft + Publish + Preview |
| `AdminToast` | `src/components/admin/AdminToast.tsx` | Success/error toast notifications |

---

## 9. Payload Removal Checklist

Before building the custom CMS, remove Payload cleanly:

```bash
# Remove packages
npm uninstall payload @payloadcms/next @payloadcms/richtext-lexical \
  @payloadcms/db-postgres @payloadcms/graphql

# Remove Payload files
rm -rf src/app/\(payload\)
rm -f src/payload.config.ts
rm -f src/payload-types.ts
rm -f src/styles/admin.css   # Will create new admin styles

# Remove Payload API catch-all (replace with custom routes)
rm -f src/app/api/\[...slug\]/route.ts

# Update next.config.ts — remove any Payload-related config
# Update middleware.ts — remove Payload session refresh if present
```

Also update `README.md` CMS row from `Payload CMS 3.x` to `Custom (Supabase + Tiptap)`.

---

## 10. Tech Stack for Custom CMS

| Layer | Technology | Purpose |
|---|---|---|
| **Pages** | Next.js 15 App Router | `/admin/*` server + client components |
| **Auth** | Supabase Auth (existing) | Admin login, session, role check |
| **Database** | Supabase Postgres (existing) | All CMS data via service role key |
| **Cache** | Upstash Redis (existing) | Admin API response cache where applicable |
| **Rich text** | Tiptap v2 | Article body editor — zero config hell |
| **Search index** | Upstash Search + Vector (existing) | Reindex on publish |
| **Images** | Cloudflare Images (existing) | Media library upload/serve |
| **Email** | Resend (existing) | Publish notifications |
| **UI** | Tailwind CSS v4 + shadcn/ui (existing) | Same design system as public site |
| **Icons** | Lucide React (existing) | Toolbar and UI icons |

**New packages to install (only these):**
```bash
npm install \
  @tiptap/react \
  @tiptap/pm \
  @tiptap/starter-kit \
  @tiptap/extension-underline \
  @tiptap/extension-link \
  @tiptap/extension-image \
  @tiptap/extension-text-align \
  @tiptap/extension-placeholder \
  @tiptap/extension-character-count \
  @tiptap/extension-code-block-lowlight \
  lowlight
```

---

## 11. Build Sequence (Implementation Order)

| Step | Deliverable | Rationale |
|---|---|---|
| 1 | Remove Payload, install Tiptap | Unblock build |
| 2 | Migration 010 SQL in Supabase | Tables needed for all admin routes |
| 3 | `/api/admin/articles` CRUD routes | Backend before UI |
| 4 | `TiptapEditor` component | Core editor — needed by articles + devices |
| 5 | `/admin/layout.tsx` + `AdminSidebar` | Shell needed before any admin pages |
| 6 | `/admin/articles/create` | **MVP — first page to deliver** |
| 7 | `/admin/articles` list + edit | Complete article workflow |
| 8 | `/api/admin/brands` + `/admin/brands` | Needed before device create |
| 9 | `/api/admin/devices` CRUD + `/admin/devices/*` | Device management |
| 10 | `/admin/videos`, `/admin/coming-soon` | Content pipeline |
| 11 | `/admin/media` + upload API | Media library |
| 12 | `/admin/sponsors`, `/admin/milestones`, `/admin/awards`, `/admin/media-kit` | Brand management |
| 13 | `/admin/users`, `/admin/settings` | Admin-only tools |
| 14 | `/admin` dashboard | Polish — last |

---

## 12. Definition of Done

A user story is **Done** when:
1. Route renders without console errors on first load
2. All acceptance criteria manually verified in browser
3. Role access control confirmed (test with editor + admin accounts)
4. Supabase write/read operations confirmed in Supabase Table Editor
5. Toast notifications appear on success and error states
6. Mobile responsive — usable on 390px wide screen
7. `npx tsc --noEmit` passes — no TypeScript errors
8. `npm run build` passes

---

*End of Specification — FweezyTech Custom CMS v1.0*  
*Solutions Architect: G | Canvas: capability_canvas_3.cypher | July 2026*  
*Replaces: Payload CMS v3 (removed July 2026)*
