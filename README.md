# FweezyTech Website

Kenya's #1 Tech Review Destination — honest device reviews, comparisons, and tech insights.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 15.4.11 |
| CMS | Payload CMS | 3.x |
| Database | Supabase Postgres | — |
| Cache / Search / Rate-limit | Upstash (Redis + QStash + Search + Vector) | — |
| Auth | Supabase Auth (Google OAuth + Magic Link) | — |
| Email | Resend | — |
| Images | Cloudflare Images | — |
| Fonts | Google Fonts (Raleway) | — |
| UI | Tailwind CSS v4 + shadcn/ui | — |
| Deployment | Vercel (Free Tier) | — |

## Project Structure

```
fweezytech/
├── .github/workflows/lighthouse.yml
├── next.config.ts
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.png
│   ├── manifest.json
│   ├── sw.js
│   ├── offline.html
│   ├── screenshots/
│   │   ├── device-mobile.png
│   │   └── home-mobile.png
│   ├── icons/          # PWA icons (8 sizes: 72–512px)
│   └── workbox-87b8d583.js
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Homepage
│   │   ├── favicon.ico
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── about/
│   │   │   ├── page.tsx
│   │   │   └── TimelineClient.tsx
│   │   ├── advertise/page.tsx
│   │   ├── articles/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── auth/
│   │   │   ├── callback/route.ts
│   │   │   └── error/page.tsx
│   │   ├── chat/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── ChatPageClient.tsx
│   │   ├── coming-soon/page.tsx
│   │   ├── compare/page.tsx
│   │   ├── devices/
│   │   │   ├── page.tsx
│   │   │   └── [brand]/[slug]/page.tsx
│   │   ├── press/
│   │   │   ├── page.tsx
│   │   │   ├── CopyButton.tsx
│   │   │   └── PressInquiryForm.tsx
│   │   ├── search/page.tsx
│   │   ├── videos/
│   │   │   ├── page.tsx
│   │   │   └── video-feed.tsx
│   │   ├── admin/
│   │   │   └── analytics/
│   │   │       ├── page.tsx
│   │   │       ├── AffiliateTable.tsx
│   │   │       ├── DeviceTypeChart.tsx
│   │   │       ├── PageViewsChart.tsx
│   │   │       └── TrafficSourcesChart.tsx
│   │   └── (payload)/
│   │       ├── layout.tsx
│   │       ├── admin/
│   │       │   ├── importMap.js
│   │       │   └── [[...segments]]/
│   │       │       ├── page.tsx
│   │       │       └── not-found.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   ├── chat/route.ts           # AI chat (streaming, Groq)
│   │   │   └── export/[report]/route.ts # CSV/PDF export
│   │   ├── award-package/route.ts      # Award submission PDF download
│   │   ├── chat/route.ts               # Public AI chat (streaming)
│   │   ├── chat/session/route.ts       # Chat session management
│   │   ├── community/
│   │   │   ├── comments/route.ts
│   │   │   ├── comments/vote/route.ts
│   │   │   ├── comments/report/route.ts
│   │   │   ├── comparisons/save/route.ts
│   │   │   └── ratings/
│   │   │       ├── route.ts
│   │   │       └── vote/route.ts
│   │   ├── cron/
│   │   │   ├── aggregate-analytics/route.ts
│   │   │   ├── keep-alive/route.ts
│   │   │   ├── seed-coming-soon/route.ts
│   │   │   └── weekly-digest/route.ts
│   │   ├── media-kit/download/route.ts # Media kit PDF download
│   │   ├── notify/route.ts             # Notify Me form submission
│   │   ├── og/                         # Open Graph image generators
│   │   │   ├── article/route.tsx
│   │   │   ├── compare/route.tsx
│   │   │   ├── default/route.tsx
│   │   │   ├── device/route.tsx
│   │   │   └── video/route.tsx
│   │   ├── out/[device]/[retailer]/route.ts  # Affiliate outbound
│   │   ├── press-inquiry/route.ts
│   │   ├── press/logos-zip/route.ts
│   │   ├── search/route.ts
│   │   ├── seed-admin/route.ts
│   │   ├── sponsor-inquiry/route.ts
│   │   ├── track/route.ts              # Analytics beacon
│   │   └── [...slug]/route.ts          # Payload CMS REST API catch-all
│   ├── components/
│   │   ├── a11y/SkipLink.tsx
│   │   ├── admin/
│   │   │   ├── AiAssistant.tsx
│   │   │   ├── AiAssistantWrapper.tsx
│   │   │   ├── AnalyticsNavLink.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Icon.tsx
│   │   │   └── Logo.tsx
│   │   ├── advertise/SponsorInquiryForm.tsx
│   │   ├── analytics/PageViewBeacon.tsx
│   │   ├── articles/ArticleBody.tsx, ArticleCard.tsx
│   │   ├── auth/AuthButton.tsx, AuthModal.tsx
│   │   ├── chat/
│   │   │   ├── ChatBubble.tsx, ChatBubbleWrapper.tsx
│   │   │   ├── ChatHeader.tsx, ChatInput.tsx
│   │   │   ├── ChatMessage.tsx, ChatWindow.tsx
│   │   │   ├── NavigationCard.tsx
│   │   │   └── SuggestedQuestions.tsx
│   │   ├── coming-soon/NotifyForm.tsx, TeaserCard.tsx
│   │   ├── community/
│   │   │   ├── CommentCard.tsx, CommentsSection.tsx
│   │   │   ├── CommentsSkeleton.tsx
│   │   │   ├── RatingCard.tsx, RatingsSection.tsx
│   │   │   └── RatingsSkeleton.tsx
│   │   ├── compare/
│   │   │   ├── CompareDevicePicker.tsx
│   │   │   ├── ComparePageSkeleton.tsx
│   │   │   ├── CompareRadarChart.tsx
│   │   │   ├── CompareSpecTable.tsx
│   │   │   ├── ComparisonTray.tsx
│   │   │   ├── SaveComparisonButton.tsx
│   │   │   └── ShareComparisonButton.tsx
│   │   ├── devices/
│   │   │   ├── AddToCompareButton.tsx
│   │   │   ├── BenchmarkChart.tsx
│   │   │   ├── BuyBox.tsx, DeviceCard.tsx
│   │   │   ├── RadarChart.tsx, ScoreBadge.tsx
│   │   │   ├── SpecTable.tsx, VerdictBlock.tsx
│   │   ├── icons/SocialIcons.tsx
│   │   ├── layout/
│   │   │   ├── AdminRouteGuard.tsx
│   │   │   ├── Footer.tsx, Header.tsx
│   │   │   └── IsAdminRoute.tsx
│   │   ├── pwa/InstallPrompt.tsx
│   │   ├── search/SearchBar.tsx
│   │   ├── seo/JsonLd.tsx
│   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── avatar.tsx, badge.tsx, button.tsx
│   │   │   ├── card.tsx, dialog.tsx, input.tsx
│   │   │   ├── separator.tsx, sheet.tsx
│   │   │   ├── skeleton.tsx, tabs.tsx
│   │   └── videos/
│   │       ├── HeroCarousel.tsx
│   │       ├── VideoCard.tsx
│   │       └── VideoModal.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ChatContext.tsx
│   │   └── ComparisonTrayContext.tsx
│   ├── hooks/useFocusTrap.ts
│   ├── lib/
│   │   ├── admin/access.ts
│   │   ├── analytics/
│   │   │   ├── queries.ts
│   │   │   └── tracker.ts
│   │   ├── articles/queries.ts
│   │   ├── auth/actions.ts
│   │   ├── chat/
│   │   │   ├── admin-system-prompt.ts
│   │   │   ├── retrieval.ts
│   │   │   ├── session-id.ts
│   │   │   ├── session.ts
│   │   │   ├── system-prompt.ts
│   │   │   └── test-prompts.ts
│   │   ├── community/
│   │   │   ├── comments.ts
│   │   │   ├── profanity.ts
│   │   │   └── ratings.ts
│   │   ├── db/
│   │   │   ├── migrations/001_…009_*.sql
│   │   │   └── seed/
│   │   │       ├── run.ts, content.ts
│   │   │       ├── devices.ts, sponsors.ts, about.ts
│   │   ├── devices/queries.ts
│   │   ├── images/cloudflare.ts
│   │   ├── search/indexing.ts
│   │   ├── seo/jsonld.ts
│   │   ├── supabase/
│   │   │   ├── client.ts, middleware.ts, server.ts
│   │   ├── upstash/
│   │   │   ├── qstash.ts, ratelimit.ts
│   │   │   ├── redis.ts, search.ts, vector.ts
│   │   ├── utils.ts
│   │   └── videos/queries.ts
│   ├── lib/youtube/client.ts
│   ├── middleware.ts
│   ├── payload.config.ts
│   ├── payload-types.ts
│   ├── scripts/
│   │   ├── fix-locked-documents.ts
│   │   ├── fix-user-schema.ts
│   │   ├── generate-icons.ts
│   │   ├── register-crons.ts
│   │   ├── register-keepalive-cron.ts
│   │   ├── reindex-all.ts
│   │   ├── run-migrations.ts
│   │   └── seed-admin.ts
│   ├── styles/
│   │   ├── admin.css
│   │   └── globals.css
│   └── types/
│       ├── chat.ts
│       └── next-pwa.d.ts
├── .env.example
├── .env.local
├── eslint.config.mjs
├── postcss.config.mjs
└── vercel.json
```

## API Endpoints

### AI Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Public AI chat with Groq streaming (rate-limited) |
| POST | `/api/chat/session` | Fetch chat session history |
| POST | `/api/admin/chat` | Admin-only AI chat with Groq streaming (no rate limit) |

### Community
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/community/comments` | List comments |
| POST | `/api/community/comments` | Post a comment |
| POST | `/api/community/comments/vote` | Vote on a comment |
| POST | `/api/community/comments/report` | Report a comment |
| GET | `/api/community/ratings` | Get device ratings |
| POST | `/api/community/ratings/vote` | Vote on a rating |
| POST | `/api/community/comparisons/save` | Save a comparison (auth required) |

### Analytics & Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/export/[report]` | Export CSV reports (page views, top pages, affiliate clicks) |
| GET | `/api/seed-admin` | Seed admin user |
| POST | `/api/track` | Analytics beacon (privacy-first page view tracking) |

### Media & Press
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/media-kit/download` | Download media kit PDF |
| GET | `/api/press/logos-zip` | Download sponsor logos ZIP |
| POST | `/api/press-inquiry` | Submit press inquiry |
| POST | `/api/sponsor-inquiry` | Submit sponsor inquiry |
| POST | `/api/award-package` | Download award submission PDF |

### Outbound & Affiliate
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/out/[device]/[retailer]` | Affiliate outbound link (rate-limited, redirects to retailer) |

### Search
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search` | Search devices and articles (Upstash Search + Vector) |

### Open Graph Images
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/og/article` | Article OG image |
| GET | `/api/og/compare` | Comparison OG image |
| GET | `/api/og/device` | Device OG image |
| GET | `/api/og/video` | Video OG image |
| GET | `/api/og/default` | Default OG image |

### Cron Jobs (QStash-signed)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cron/keep-alive` | Keep Supabase free tier DB awake |
| GET | `/api/cron/aggregate-analytics` | Aggregate affiliate click analytics |
| GET | `/api/cron/seed-coming-soon` | Seed coming-soon items from RSS feeds |
| GET | `/api/cron/weekly-digest` | Send weekly digest email |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notify` | Notify Me form submission (rate-limited) |

### Payload CMS REST API
| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH/DELETE/PUT | `/api/[...slug]` | Payload CMS REST API catch-all |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/callback` | OAuth callback (Google, Magic Link) |
| GET | `/auth/error` | Auth error page |

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