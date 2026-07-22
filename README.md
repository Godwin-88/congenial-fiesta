# FweezyTech Website

Kenya's #1 Tech Review Destination — honest device reviews, comparisons, and tech insights.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.2.10 |
| CMS | Payload CMS | 3.x |
| Database | Supabase Postgres | — |
| Cache / Search / Rate-limit | Upstash (Redis + QStash + Search + Vector) | — |
| Auth | Supabase Auth (Google OAuth + Magic Link) | — |
| Email | Resend | — |
| Images | Cloudflare Images | — |
| Fonts | Google Fonts (Raleway) | — |
| UI | Tailwind CSS v4 + shadcn/ui | — |
| Deployment | Vercel (Free Tier) | — |

## Prerequisites

- Node.js 20+
- Supabase account (free tier)
- Upstash account (free tier) — Redis + QStash + Search + Vector
- Resend account (free tier)
- Cloudflare Images account (free tier)
- YouTube Data API v3 key
- Vercel account (free tier)

## Local Development Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd fweezytech
   npm install
   ```

2. **Environment variables**
   ```bash
   cp .env.example .env.local
   # Fill in all values from .env.example
   ```

3. **Run SQL migrations** (in order via Supabase SQL editor):
   - `001_device_search.sql` — Full-text search indexes for devices
   - `002_affiliate_clicks.sql` — Click tracking for affiliate outbound links
   - `003_community_users.sql` — Community profiles table
   - `004_ratings.sql` — Device rating system
   - `005_comments.sql` — Comment system
   - `006_verified_owner.sql` — Verified owner badge system
   - `007_page_views.sql` — Privacy-first page view analytics
   - `008_sponsor_inquiries.sql` — Sponsor inquiry submissions
   - `009_analytics_aggregate.sql` — Analytics aggregate tables

   Or use the migration script:
   ```bash
   npm run db:migrate
   ```

4. **Generate PWA icons**
   ```bash
   npm run icons:generate
   ```

5. **Seed the database**
   ```bash
   npm run db:seed          # Full database seed
   npm run db:seed:content  # CMS content seed
   npm run db:seed:sponsors # Sponsor/packages seed
   npm run db:seed:about    # About page milestones seed
   ```

6. **Index content for search**
   ```bash
   npm run search:reindex
   ```

7. **Start development**
   ```bash
   npm run dev
   ```

8. Visit:
   - Site: http://localhost:3000
   - CMS Admin: http://localhost:3000/admin

## Supabase Auth Setup

1. In Supabase Dashboard → Authentication → Providers
2. Enable Google OAuth:
   - Configure Google Cloud Console OAuth with redirect URI: `https://<your-domain>/auth/callback`
   - Add Client ID and Secret to Supabase
3. Enable Magic Link (email):
   - Configure Resend SMTP in Supabase Auth settings
   - Add confirmation/redirect URLs: `https://<your-domain>/auth/callback`
4. Add your Supabase URL and anon key to `.env.local`

## PWA Features

- **Offline fallback**: `public/offline.html` served when no network
- **Install prompt**: Slide-up banner triggered by `beforeinstallprompt` event
- **Service worker**: Caches Google Fonts, Cloudflare Images, pages, and API routes
- **Manifest**: Full PWA manifest at `public/manifest.json` with 8 icon sizes
- **Screenshots**: Home and device page previews for Play Store listing

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo to Vercel
3. Add all environment variables from `.env.example` to Vercel dashboard
4. Deploy

## Post-Deployment Checklist (MUST DO AFTER EVERY FRESH DEPLOY)

- [ ] Run SQL migrations in Supabase SQL editor (if first deploy)
- [ ] `npm run crons:register` (registers all 3 QStash cron jobs)
- [ ] `npm run search:reindex` (indexes all content into Upstash Search + Vector)
- [ ] Verify `/admin/analytics` is accessible with admin email
- [ ] Verify `/api/cron/keep-alive` returns `{ status: 'alive' }`
- [ ] Test Notify Me form on `/coming-soon` — check email received

## CMS Usage Guide

### Devices
- Add brands first, then devices linked to each brand
- Fweezy Score is auto-computed from 5 sub-scores
- Set `status: published` to make devices visible on the site

### Articles
- Supports rich text via Lexical editor
- Reading time is auto-computed
- Link devices to articles via `associatedDevice` field

### Videos
- YouTube videos: just set `embedId` — thumbnail and view count are auto-fetched
- TikTok/IG/Facebook: provide full URL as `embedId` + manual thumbnail + view count

### Coming Soon Items
- Add teaser devices with silhouette images
- `linkedDevice` auto-hides the teaser once the real device is published

### Sponsors & Packages
- Sponsor logos appear on the `/advertise` page partner grid
- Three-tier packages (Starter, Pro, Premium) with configurable deliverables

### Milestones & Awards
- Add milestones for the About page timeline
- Add awards with certificates and links for the Awards grid

### Media Kit
- Press bio (short + long), headshots, brand colours, logos
- Follower counts across all platforms

## Analytics Guide

The admin analytics dashboard (`/admin/analytics`) provides:

- **Page Views**: Daily time-series chart with 7/30/90-day toggles
- **Traffic Sources**: Donut chart breakdown (direct, social, search, referral)
- **Device Types**: Bar chart (mobile, desktop, tablet)
- **Top Pages**: Table of most-viewed pages with view counts
- **Affiliate CTR**: Click-through rate table per device
- **Top Retailers**: Clicks by retailer breakdown
- **Top Search Queries**: Most common search terms
- **Award Submission**: Download a pre-built 6-page award submission PDF

### CSV Export
Available for: Page Views, Top Pages, Affiliate Clicks

## Award Submission Guide

1. Add milestones and awards via CMS (`/admin` → Milestones / Awards)
2. Update MediaKit with current follower counts
3. Visit `/admin/analytics?period=90d`
4. Click "Download Award Submission Package"
5. The generated PDF (6 pages) is ready for award bodies:
   - Kenya ICT Awards
   - Bloggers Association of Kenya Awards (BAK Awards)
   - Africa Digital Media Awards
   - Any tech content creator awards

## Updating Brand Assets

When Fweezy has real logo files:
1. Upload to Cloudflare Images
2. Update MediaKit record in `/admin` CMS
3. Update `src/scripts/generate-icons.ts` to use real logo SVG
4. Run: `npm run icons:generate`
5. Commit updated `public/icons/` files

## Lighthouse Performance Targets

| Metric | Target |
|--------|--------|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 90 |
| SEO | ≥ 95 |
| First Contentful Paint | ≤ 1500ms |
| Largest Contentful Paint | ≤ 2500ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Total Blocking Time | ≤ 300ms |

## License

Private — All rights reserved.