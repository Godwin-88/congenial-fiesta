# FweezyTech Creator Website — Product Specification

**Document type:** Solutions Architecture — Epics, Features, User Stories & Acceptance Criteria  
**Prepared by:** Solutions Architect (G)  
**Framework:** Digital Capability Canvas v3 (capability_canvas_3.cypher)  
**Reference templates:** GSMArena Mobile (m.gsmarena.com) · NanoReview (nanoreview.net)  
**Brand:** FweezyTech — multi-platform tech content creator  
**Platforms:** TikTok · YouTube · Instagram · Facebook  
**Date:** July 2026

---

## 1. Digital Capability Canvas Alignment

The FweezyTech website is architected against **six Domain nodes** extracted from the Canvas graph. Each Epic is formally traced to a Canvas Domain → SubDomain → Capability chain. This mapping is the authoritative justification for every feature in this specification.

```
Manage Digital Core (root hub)
│
├── Manage Digital Channels              → EP-01 Device Intelligence Hub
│   ├── Manage Online Channels (Web)     → EP-01, EP-02
│   ├── Manage Online Channels (Mobile)  → PWA / mobile-first shell
│   ├── Manage Field Channels            → Social embeds (TikTok, YT, IG, FB)
│   └── Capabilities: Content Publishing · Content Management · Content Library
│       Content Authoring · Content Formats · Video Media · User Generated Content
│
├── Manage MarCom Orchestration          → EP-02 Content Hub · EP-06 Monetisation
│   ├── Manage Digital MarCom Campaigns  → Sponsor showcase, affiliate campaigns
│   ├── Manage Marketing Planning        → Content calendar & roadmap
│   └── Capabilities: Brand Positioning · Campaign Planning · Outreach Content
│       Digital MarCom Analytics · Digital MarCom Strategy
│
├── Manage Digital Service Orchestration → EP-03 Comparison Engine · EP-04 Search
│   ├── Manage Customer Care             → Community reviews & comments
│   ├── Manage Partners Relations        → Affiliate & sponsor relations
│   └── Capabilities: Recommendation Engine · Omni-Channel Delivery
│       Service Engagement Optimisation · Omni-Channel Interfaces
│
├── Manage Digital Intelligence          → EP-05 Community · EP-08 Analytics
│   ├── Horizontal Intelligence          → Cross-site analytics layer
│   ├── Intelligence Infrastructure      → Search index · data warehouse
│   └── Capabilities: Channel Engagement Analytics · Experience Analytics
│       Experience Growth Analytics · Predictive Analytics · Media Monitoring
│
├── Manage Digital Backoffice            → EP-07 Brand & Awards · EP-09 Admin CMS
│   ├── Manage Finance                   → Affiliate revenue management
│   ├── Manage Legal                     → Content licensing & IP
│   └── Capabilities: Content Licensing · Revenue (affiliate commissions)
│
├── Manage Digital IT                    → Non-Functional / Infrastructure
│   ├── Manage Digital Platforms         → Hosting, CDN, CI/CD
│   └── Capabilities: Platform Performance · Platform Interoperability
│       Content Delivery Networks · Platform Configuration
│
└── Manage Digital Security              → Non-Functional / Security
    └── Capabilities: Content Security · Identity & Access Security
        Platform Security · Platform Security Monitoring
```

---

## 2. Design System Principles (Architect Constraints)

| Principle | Specification |
|---|---|
| **Mobile-first PWA** | Primary audience arrives via social links on mobile; installable, offline fallback |
| **Performance budget** | LCP ≤ 1.5 s · CLS < 0.1 · FID < 100 ms on 4G mobile (Lighthouse ≥ 90) |
| **Design inspiration** | GSMArena — search-first density; NanoReview — radar score clarity |
| **Colour palette** | Electric blue `#0066FF` (primary) · Charcoal `#111827` (bg) · Amber `#F59E0B` (accent) |
| **Typography** | `Space Grotesk` (headings) · `Inter` (body) — Google Fonts |
| **Dark/Light mode** | Toggle persistent in `localStorage`; dark default |
| **Accessibility** | WCAG 2.1 AA minimum; keyboard-navigable tables; `prefers-reduced-motion` respected |
| **SEO** | Schema.org `Product`, `Review`, `VideoObject`, `Article`, `Person` on all relevant pages |

---

## 3. Epics Overview

| # | Epic | Canvas Domain | Canvas SubDomain | GSMArena / NanoReview Inspiration |
|---|---|---|---|---|
| EP-01 | Device Intelligence Hub | Manage Digital Channels | Manage Online Channels (Web) | GSMArena device DB + NanoReview score cards |
| EP-02 | Content & Video Hub | Manage MarCom Orchestration | Manage Digital MarCom Campaigns | Creator-native YT/TikTok/IG/FB aggregation |
| EP-03 | Smart Comparison Engine | Manage Digital Service Orchestration | Manage Customer Care | NanoReview radar charts + GSMArena tables |
| EP-04 | Search & Discovery | Manage Digital Service Orchestration | Manage Partners Relations | GSMArena search-first entry UX |
| EP-05 | Community & Social Proof | Manage Digital Intelligence | Horizontal Intelligence | GSMArena user reviews + community voting |
| EP-06 | Monetisation & Sponsorship | Manage MarCom Orchestration | Manage Digital MarCom Campaigns | Affiliate engine + sponsor deal showcase |
| EP-07 | Creator Brand & Awards | Manage Digital Backoffice | Manage Legal | Press room · media kit · awards portfolio |
| EP-08 | Analytics & Growth Intelligence | Manage Digital Intelligence | Intelligence Infrastructure | Privacy-first analytics dashboard |
| EP-09 | Admin & CMS | Manage Digital Backoffice | Manage Finance | Headless CMS · RBAC · publish workflow |

---

## 4. Epics, Features, User Stories & Acceptance Criteria

---

### EP-01 — Device Intelligence Hub

**Canvas trace:** `Manage Digital Core` → `Manage Digital Channels` → `Manage Online Channels (Web)` → `Manage Content Publishing` · `Manage Content Library` · `Manage Content Management`  
**Business outcome:** SEO authority and audience acquisition via high-intent device search queries  
**Template inspiration:** GSMArena's device catalogue depth + NanoReview's score-card visual clarity

---

#### Feature 1.1 — Device Catalogue & Listing Page

**Canvas capability:** `Manage Content Library` · `Manage Channel Mix`

**User Story 1.1.1**
> As a visitor, I want to browse devices by brand, category, and year so that I can find phones relevant to my buying decision without using a search engine.

**Acceptance Criteria:**
- Route `/devices` renders brand logo grid; tapping a brand filters to that brand's device list
- Filter controls (Brand · Category: Flagship/Mid-range/Budget · Price Range · Year) update results client-side without full page reload
- Each device card displays: thumbnail image, device name, price range badge, **Fweezy Score** badge (colour-coded: green ≥ 80, amber 60–79, red < 60), short tagline
- Infinite scroll loads 24 additional devices per batch with skeleton loaders (no spinner)
- Filter state encoded in URL query params (`/devices?brand=samsung&category=flagship`) — links are shareable
- Empty-state shows illustration + "Suggest a device" CTA linking to a Google Form or internal request form
- Page title and H1 update dynamically to reflect active filters for SEO

**User Story 1.1.2**
> As a mobile visitor arriving from a TikTok link, I want the catalogue to load and feel native so that I don't leave before seeing content.

**Acceptance Criteria:**
- First Contentful Paint ≤ 1.2 s on simulated Moto G4 / throttled 4G (measured in Lighthouse CI)
- Touch targets ≥ 48 × 48 px on all filter controls and device cards
- Horizontal brand filter strip uses momentum scroll with snapping; no layout overflow
- Images served via CDN with WebP format, appropriate `sizes` attribute, and lazy-load attribute

---

#### Feature 1.2 — Device Detail Page

**Canvas capability:** `Manage Content Authoring` · `Manage Content Formats` · `Manage Video Media`

**User Story 1.2.1**
> As a buyer, I want a single device page that shows specs, benchmark scores, Fweezy's review video, and purchase links so that I can complete my research without visiting other sites.

**Acceptance Criteria:**
- Route: `/devices/{brand-slug}/{device-slug}` (e.g. `/devices/samsung/galaxy-s25-ultra`)
- **Hero section:** device image gallery (≥ 3 images, swipeable carousel); colour variant picker updates active hero image
- **Fweezy Score card** (NanoReview-style): overall score 0–100 displayed large; five sub-scores (Display · Performance · Camera · Battery · Value) rendered as animated SVG radar/spider chart on page load
- **Quick-specs strip:** six key specs as icon + value pills (e.g. 📱 6.9" AMOLED · ⚡ Snapdragon 8 Elite · 🔋 5000mAh) displayed immediately below score card
- **Full Spec Table:** collapsible sections — Design · Display · Processor · Memory · Camera System · Battery · Connectivity · OS & Software; each row has label column and value column
- **Benchmark section:** Geekbench Single/Multi, AnTuTu, PCMark scores as horizontal bar charts with percentile rank annotation ("Top 5% of devices in our database")
- **Fweezy's Review** section: auto-linked YouTube embed if an associated video exists in CMS; TikTok embed as secondary option
- **Buy Links strip:** up to 4 retailer buttons (Jumia · Amazon · Kilimall · carrier); each shows retailer logo + price + "price as of [date]"; opens in new tab with `rel="noopener sponsored"`
- Schema.org `Product` + `Review` JSON-LD injected in `<head>`
- Auto-generated OG image (1200 × 630 px): device name + Fweezy Score + brand colours
- `Last updated: DD MMM YYYY` visible below title; if > 18 months, amber "May be outdated" badge appears

**User Story 1.2.2**
> As a returning visitor, I want to immediately see Fweezy's personal verdict summary at the top of a device page so that I get his expert take before reading specs.

**Acceptance Criteria:**
- "Fweezy's Verdict" block rendered as styled callout between score card and spec table
- Verdict block contains: Pros list (≤ 5 items), Cons list (≤ 5 items), one-sentence bottom-line recommendation
- Verdict content editable in CMS rich text; not auto-generated
- Block visually distinct from spec data (brand colour left border, italic font)

---

#### Feature 1.3 — Fweezy Score Engine

**Canvas capability:** `Manage Descriptive Analytics` · `Manage Entities Capability Analytics`

**User Story 1.3.1**
> As Fweezy's editorial team, I want to input sub-scores per dimension and have the system compute a weighted Fweezy Score automatically so that scoring is consistent and reproducible across all devices.

**Acceptance Criteria:**
- CMS device form exposes five sub-score inputs (0–10 each): Display · Performance · Camera · Battery · Value
- Dimension weights configurable in Site Settings (default: Display 20% · Performance 25% · Camera 25% · Battery 15% · Value 15%); weights must sum to 100%
- Computed formula: `Overall = Σ(sub-score × weight) × 10`, stored to one decimal place
- Score history versioned with timestamps; prior scores retained and viewable in admin
- Score change of ≥ 5 points from prior version triggers draft-status lock and admin notification before re-publishing
- Score displayed in three colour states: green (≥ 80) · amber (60–79) · red (< 60)

---

### EP-02 — Content & Video Hub

**Canvas trace:** `Manage Digital Core` → `Manage MarCom Orchestration` → `Manage Digital MarCom Campaigns` → `Manage Digital MarCom Content` · `Manage Video Media` · `Manage Social Media and Sites`  
**Business outcome:** Audience retention, watch-time growth, cross-platform content consolidation  
**Template inspiration:** Creator-native cross-platform feed; NanoReview's clean card layout

---

#### Feature 2.1 — Multi-Platform Video Feed

**Canvas capability:** `Manage Video Media` · `Manage Social Media and Sites` · `Manage Cross Channel Content`

**User Story 2.1.1**
> As a fan, I want to see all of Fweezy's latest videos from every platform in one feed so that I never miss content regardless of which app I prefer.

**Acceptance Criteria:**
- Route `/videos` renders 3-column grid (desktop) / 2-column (tablet) / 1-column (mobile) of content cards
- Each card displays: thumbnail, title, platform badge icon (YouTube · TikTok · Instagram · Facebook), published date, view count (where API provides it), duration
- Platform filter tabs: All · YouTube · TikTok · Instagram · Facebook — active tab updates URL param
- YouTube videos fetched via YouTube Data API v3 (channel feed); server-side ISR refresh every 6 hours
- TikTok videos: embed list managed via CMS (manual curation) until TikTok Display API quota permits automation
- Clicking a card opens an in-page modal player (YouTube iframe or TikTok embed) — visitor stays on FweezyTech
- "Watch on [Platform]" secondary button in modal opens original URL in new tab with UTM `?utm_source=fweezytech_web`

**User Story 2.1.2**
> As a first-time visitor, I want to see Fweezy's most popular videos in a hero showcase so that I can immediately judge the content quality and subscribe.

**Acceptance Criteria:**
- Hero carousel at top of `/videos` auto-rotates through Top 5 videos by view count (YouTube API `statistics.viewCount`)
- Desktop: card shows muted thumbnail auto-play preview on hover
- Mobile: auto-play preview triggered on tap-hold; single tap opens modal
- View count rendered as human-readable (`1.2M views`, `842K views`)
- "Subscribe on YouTube" CTA button links to YouTube channel page

---

#### Feature 2.2 — Written Reviews & Articles

**Canvas capability:** `Manage Content Authoring` · `Manage Content Publishing` · `Manage Content Formats`

**User Story 2.2.1**
> As FweezyTech's SEO strategy, I want long-form written device reviews published on the site so that the brand ranks for device-specific Google searches and builds search authority independent of social algorithms.

**Acceptance Criteria:**
- Route `/articles/{slug}`
- CMS rich text editor (Tiptap or Lexical) supports: H2/H3 headings · bold/italic/underline · inline images · YouTube embed block · custom "Pros/Cons" block · "Buy Box" block · "Pull Quote" block · affiliate link block
- Each published article shows: estimated read time · author avatar (FweezyTech logo + "Fweezy" name) · published date · last-modified date
- Article auto-links to its associated device detail page if a device relation is set in CMS
- Related articles strip at bottom (same brand or category): max 4 cards
- Schema.org `Article` JSON-LD injected in `<head>`
- Sitemap entry auto-generated on publish

---

#### Feature 2.3 — Content Calendar & Coming-Soon Teasers

**Canvas capability:** `Manage Campaign Planning` · `Manage Campaign Execution`

**User Story 2.3.1**
> As a subscriber, I want to see what Fweezy is reviewing next so that I can anticipate content I care about and opt in to be notified.

**Acceptance Criteria:**
- Route `/coming-soon` lists upcoming reviews as teaser cards: device name · expected publish week · "Notify Me" email capture button
- "Notify Me" stores email in mailing list integration (Resend audience list or Mailchimp)
- Teaser card shows device silhouette (no full reveal image) until content is live
- On publish, CMS webhook triggers notification email to opted-in subscribers for that device
- Teaser card auto-replaced by live device page link on publish; no manual cleanup required

---

### EP-03 — Smart Comparison Engine

**Canvas trace:** `Manage Digital Core` → `Manage Digital Service Orchestration` → `Manage Customer Care` → `Manage Omni-Channel Interfaces` · `Manage Recommendation Engine` · `Manage Service Engagement Optimisation`  
**Business outcome:** Audience stickiness, return visits, SEO capture of high-intent "[Phone A] vs [Phone B]" queries  
**Template inspiration:** NanoReview radar chart overlay + GSMArena spec diff table

---

#### Feature 3.1 — Side-by-Side Device Comparison

**Canvas capability:** `Manage Omni-Channel Delivery` · `Manage Omni-Channel Interfaces`

**User Story 3.1.1**
> As a buyer choosing between two or three phones, I want to compare their Fweezy Scores and specs side-by-side on a shareable page so that I can decide quickly and send the link to friends.

**Acceptance Criteria:**
- Route: `/compare?devices=samsung-galaxy-s25,pixel-9-pro` (query param order is canonical: alphabetical; non-canonical order 301-redirects to canonical)
- Compare up to 3 devices simultaneously; minimum 2
- Device picker: search-as-you-type autocomplete against device database (Meilisearch)
- **Radar chart overlay:** all selected devices plotted on the same SVG spider chart using their five sub-score dimensions; animated in on load; legend labels each device by colour
- **Spec diff table:** rows where values differ highlighted in amber; identical rows visually muted; row labels sticky on horizontal scroll
- **Winner badge:** auto-assigned per numeric spec row to the highest-performing device (e.g. battery mAh, RAM GB, display Hz)
- **Fweezy Verdict block** at bottom: editorial "Buy this if…" per device, editable in CMS per device-pair combination
- "Share Comparison" button generates shareable URL and copies to clipboard; accompanying og:image generated server-side showing device names + radar chart snapshot
- Schema.org `Product` JSON-LD for each compared device

**User Story 3.1.2**
> As a mobile user, I want the comparison table to scroll horizontally without breaking the layout so that I can read it on a small screen.

**Acceptance Criteria:**
- Table wrapped in `overflow-x: auto` horizontal scroll container on viewports < 768 px
- First column (spec label) is CSS `position: sticky; left: 0` — visible while scrolling horizontally
- `user-scalable=yes` preserved on viewport meta tag (pinch-to-zoom not disabled)
- Touch-scroll gesture fires smoothly; no momentum overshoot clipping

---

#### Feature 3.2 — Floating Comparison Tray

**Canvas capability:** `Manage Experience Personalization` · `Manage Omni-Channel Interfaces`

**User Story 3.2.1**
> As a catalogue browser, I want to add devices to a comparison tray as I scroll so that I can compare without navigating back and forth.

**Acceptance Criteria:**
- Each device card in catalogue has an "Add to Compare" toggle (checkbox icon); toggles between add/remove states
- Floating tray appears at screen bottom when ≥ 2 devices selected (max 3); shows device thumbnail thumbnails + "Compare Now" CTA
- Tray persists across catalogue filter changes within session (`sessionStorage`)
- "Clear all" button removes all devices from tray
- Tray animates in/out with 200 ms ease transition; does not obscure bottom navigation on mobile

---

### EP-04 — Search & Discovery

**Canvas trace:** `Manage Digital Core` → `Manage Digital Service Orchestration` → `Manage Partners Relations` → `Manage Recommendation Engine` · `Manage Channel Insight Recommendations`  
**Business outcome:** SEO-driven user acquisition; zero-friction discovery for returning visitors  
**Template inspiration:** GSMArena's search-dominant homepage UX

---

#### Feature 4.1 — Global Instant Search

**Canvas capability:** `Manage Content Indexing & Retrieval` · `Manage Recommendation Engine`

**User Story 4.1.1**
> As a visitor, I want a large, prominent search bar on the homepage and a search icon in the sticky header so that I can find any device, article, or video instantly from anywhere on the site.

**Acceptance Criteria:**
- Homepage hero: search bar ≥ 480 px wide on desktop; placeholder text "Search devices, reviews, videos…"
- Keystroke-triggered autocomplete (debounced 150 ms) suggests: Devices (thumbnail + name + score badge) · Articles (title + category) · Videos (title + platform badge)
- Results grouped by type with section headers; max 4 results per group in dropdown
- Search powered by Meilisearch (self-hosted on Contabo VPS); index refreshed on every CMS publish event via webhook
- Pressing Enter or clicking a result navigates to `/search?q={query}` full results page
- Full results page renders all matching content across all types with type-filter tabs
- Zero-results page shows: trending devices (top 5 by page views) · latest articles · "Request a Review" CTA
- Search query logged to analytics (anonymised, no PII)

**User Story 4.1.2**
> As a mobile visitor, I want the search accessible from the sticky header anywhere on the site without scrolling back to the top.

**Acceptance Criteria:**
- Sticky header on mobile: FweezyTech logo (left) · Search icon (right of centre) · Hamburger menu (far right)
- Tapping search icon opens a full-width overlay input field with auto-focus triggering soft keyboard
- Overlay displays recent searches (stored in `localStorage`; max 5) when input is empty
- Overlay closeable via swipe-down, back gesture (Android), or ✕ button

---

### EP-05 — Community & Social Proof

**Canvas trace:** `Manage Digital Core` → `Manage Digital Intelligence` → `Horizontal Intelligence` → `Manage User Generated Content` · `Manage Stakeholder Analytics` · `Manage Community Participation`  
**Business outcome:** Audience loyalty, UGC-driven dwell time, social proof for award evaluators

---

#### Feature 5.1 — User Ratings & Community Reviews

**Canvas capability:** `Manage User Generated Content` · `Manage Experience Feedback Management`

**User Story 5.1.1**
> As a device owner, I want to leave my own rating and a short experience note on a device page so that I can contribute to the community and help other buyers.

**Acceptance Criteria:**
- User rating: 1–5 stars + optional 280-character experience note per device page
- Authentication required: Google OAuth or email magic link (no password registration)
- One rating per authenticated user per device; editable within 48 hours of submission
- Community aggregate score displayed separately from Fweezy Score — labelled "Community Score" in a visually distinct card
- Profanity filter applied on submission (server-side); flagged content held for admin review
- Each review shows: star rating · experience note · username (first name only) · date posted
- Upvote/downvote buttons per review (authenticated users only); reviews sorted by Top-rated by default; secondary sort: Newest

**User Story 5.1.2**
> As a visitor, I want to see a "Verified Owner" badge on reviews from people who bought the device through a FweezyTech affiliate link so that I can trust their experience is real.

**Acceptance Criteria:**
- When affiliate link click (`/out/{device}/{retailer}`) is followed and the same authenticated user later submits a review for that device, their review receives a "Verified Purchase" badge
- Badge stored as a boolean field on the review record; cannot be manually set via CMS
- Badge renders as a small green checkmark icon with tooltip "Verified purchase via FweezyTech"

---

#### Feature 5.2 — Comments on Articles & Videos

**Canvas capability:** `Manage Content Interactions` · `Manage Community Participation`

**User Story 5.2.1**
> As a reader, I want to comment on articles and ask Fweezy questions directly so that the site feels like a living community rather than a static publication.

**Acceptance Criteria:**
- Comment section rendered below all Article and Video page content
- Threaded replies: 1 level deep (reply to a top-level comment only)
- Authentication required (same OAuth as ratings)
- FweezyTech team accounts display a "Creator" badge (brand-colour pill) next to display name
- Comments sortable: Newest · Top-rated (upvotes)
- Report button per comment; reported comments enter moderation queue in CMS
- Admin CMS moderation queue shows flagged comments with approve/delete actions
- Comment count displayed on article cards in listing pages

---

### EP-06 — Monetisation & Sponsorship Layer

**Canvas trace:** `Manage Digital Core` → `Manage MarCom Orchestration` → `Manage Digital MarCom Campaigns` → `Manage Brand Positioning` · `Manage Campaign Execution` · `Manage Native/Content Advertising`  
**Business outcome:** Diversified revenue; attraction of brand partnerships and affiliate income

---

#### Feature 6.1 — Affiliate Buy Boxes

**Canvas capability:** `Manage Revenue` · `Manage Digital Marketing Conversion`

**User Story 6.1.1**
> As a visitor ready to purchase a device, I want clearly styled buy links with current prices displayed prominently on the device page so that I can complete my purchase in one click and support Fweezy.

**Acceptance Criteria:**
- Buy box component appears on every device detail page in the hero section (above the fold on desktop, within first scroll on mobile)
- Up to 4 retailer links displayed as styled CTA buttons: retailer logo + formatted price + "Buy Now" label
- Prices manually entered by admin with "Price as of DD MMM YYYY" fine-print disclaimer beneath each button
- All links routed through internal redirect: `/out/{device-slug}/{retailer-slug}` — click logged to analytics before 302 redirect to affiliate URL
- All affiliate link `<a>` tags carry `rel="noopener sponsored"`
- "Prices subject to change" disclaimer in italics below the buy box strip
- Buy box also appears as a sticky bottom bar on mobile device pages (appears after scrolling past hero)

---

#### Feature 6.2 — Sponsor & Brand Deal Showcase

**Canvas capability:** `Manage Brand Positioning` · `Manage Outreach Content` · `Manage Stakeholder Engagement & Consultation`

**User Story 6.2.1**
> As a brand manager evaluating a sponsorship with FweezyTech, I want a dedicated page showing audience stats, past partners, and package options so that I can assess fit and initiate a conversation without emailing blindly.

**Acceptance Criteria:**
- Route `/advertise` (or `/sponsors`)
- **Audience Overview section:** platform follower counts (manually updated via CMS) · avg. monthly views · total cross-platform reach figure · demographic summary blurb
- **Past Partners section:** logo grid of brands FweezyTech has worked with; each logo links to a relevant video
- **Sponsorship Packages section:** three-tier cards — Shoutout · Dedicated Video · Full Campaign — each with: description · deliverables list · "Get Pricing" CTA (no prices shown publicly)
- **Inquiry form:** fields — Name · Company · Brand Website · Budget Range (dropdown) · Message; submission posts to Fweezy's email via Resend + stores lead record in CMS
- **Downloadable Media Kit** button: links to a PDF (static upload in CMS media library) containing audience stats, bio, past work, contact
- Page excluded from sitemap by default; admin toggle in CMS Site Settings to include/exclude

---

### EP-07 — Creator Brand & Awards Presence

**Canvas trace:** `Manage Digital Core` → `Manage Digital Backoffice` → `Manage Legal` → `Manage Intellectual Property` · `Manage Content Licensing` · `Manage Outreach Content`  
**Business outcome:** Industry recognition, award nominations, press credibility

---

#### Feature 7.1 — Creator Profile / About Page

**Canvas capability:** `Manage Brand Positioning` · `Manage Destination Branding`

**User Story 7.1.1**
> As a journalist, award judge, or event organiser visiting FweezyTech, I want a compelling About page that communicates Fweezy's impact, story, and credentials clearly so that I can write about him or nominate him with confidence.

**Acceptance Criteria:**
- Route `/about`
- **Hero:** professional photo · brand statement (3–4 sentences, editable in CMS) · social follow buttons (YouTube · TikTok · Instagram · Facebook)
- **Social proof bar:** total followers across all platforms · total video views · years active — all manually updated in CMS
- **Story section:** origin narrative (long-form text, CMS-editable)
- **Milestones timeline:** year → achievement, rendered as a vertical timeline component; items managed in CMS as an ordered list
- **Highlight Reel:** embedded YouTube video (CMS-selected video ID)
- **Awards & Recognition section:** grid of award badge cards — award name · awarding body · year · optional certificate image upload; managed in CMS collection
- **Press Mentions section:** publication logo + headline text + link to article; managed in CMS as a repeater

---

#### Feature 7.2 — Press Room & Media Kit

**Canvas capability:** `Manage Outreach Content` · `Manage Intellectual Property` · `Manage Media Monitoring`

**User Story 7.2.1**
> As a PR contact or event organiser, I want to download all official FweezyTech brand assets from one place so that I can feature Fweezy in promotional materials without a lengthy back-and-forth.

**Acceptance Criteria:**
- Route `/press`
- **Official Bio section:** short bio (100 words) + long bio (300 words); both copyable via "Copy text" button
- **Logos section:** FweezyTech logo in 4 variants (dark bg PNG · light bg PNG · dark SVG · light SVG); each downloadable individually
- **Headshots section:** ≥ 2 approved high-resolution photos downloadable
- **Brand Colours section:** hex/RGB/CMYK values displayed as swatches
- **Download All Assets** button: serves all of the above as a single `.zip` file (generated server-side on request)
- **Press Release Archive:** list sorted by date descending; each entry shows headline + date + PDF download link
- **Press Inquiry form:** Name · Publication · Deadline · Message → Resend email to press-specific inbox

---

#### Feature 7.3 — Award-Ready Open Graph & Social Sharing

**Canvas capability:** `Manage Digital MarCom Content` · `Manage Cross Channel Content`

**User Story 7.3.1**
> As Fweezy's team, I want every page to auto-generate a branded, professional-looking preview image when shared on social media so that links from all platforms look like deliberate marketing, not default thumbnails.

**Acceptance Criteria:**
- OG images generated server-side using Satori (Next.js) or equivalent
- **Device pages:** device name (large) + Fweezy Score (bold number + colour) + device thumbnail + FweezyTech logo
- **Article pages:** article title + category tag + FweezyTech logo + author name
- **Video pages:** video thumbnail (blurred/darkened) + title text overlay + FweezyTech watermark
- All OG images: 1200 × 630 px
- `twitter:card` meta = `summary_large_image` on all pages
- Schema.org `WebSite` + `Organization` + `Person` JSON-LD on homepage
- `og:url` canonical on all pages; `og:locale` set to `en_KE` with `og:locale:alternate` for `en_GB` and `en_US`

---

### EP-08 — Analytics & Growth Intelligence

**Canvas trace:** `Manage Digital Core` → `Manage Digital Intelligence` → `Intelligence Infrastructure` → `Manage Channel Engagement Analytics` · `Manage Experience Analytics` · `Manage Experience Growth Analytics`  
**Business outcome:** Data-driven content decisions; evidence base for award submissions and sponsorship pitches

---

#### Feature 8.1 — Privacy-First Site Analytics

**Canvas capability:** `Manage Channel Engagement Analytics` · `Manage Experience Analytics`

**User Story 8.1.1**
> As Fweezy's team, I want to track page views, top content, and traffic sources without using cookies or displaying a consent banner so that the site remains clean and visitor-friendly.

**Acceptance Criteria:**
- Analytics: Umami (self-hosted on Contabo VPS) or Plausible — no cookies, no GDPR consent banner required
- Dashboard accessible at `/admin/analytics` (authenticated; admin role only)
- **Key metrics displayed:** Daily / Weekly / Monthly unique visitors · Page views · Bounce rate · Avg. session duration
- **Top Content report:** Top 10 device pages · Top 10 articles · Top 10 video pages — sortable by views and by time period
- **Traffic Sources report:** Direct · Search · Social (broken down by platform) · Referral
- **Search query report:** top 20 internal search queries + top 20 zero-result queries
- Data exportable as CSV per report per date range

---

#### Feature 8.2 — Affiliate & Conversion Intelligence

**Canvas capability:** `Manage Experience Growth Analytics` · `Manage Predictive Analytics`

**User Story 8.2.1**
> As Fweezy's team, I want to know which device pages drive the most affiliate link clicks so that we can prioritise creating more content around high-converting devices.

**Acceptance Criteria:**
- Every affiliate link click through `/out/{device-slug}/{retailer-slug}` logs: device slug · retailer · timestamp · referrer page · anonymised session ID
- **Affiliate Performance report** in admin dashboard: Top 20 device pages by affiliate clicks · Click-through rate per device (clicks / page views) · Clicks per retailer
- Report filterable by date range (7d / 30d / 90d / custom)
- Weekly digest email sent to admin email: top 5 devices by affiliate clicks + total clicks that week (sent via Resend scheduled job, Mondays 08:00 EAT)
- No personal data or IP addresses stored in click logs

---

### EP-09 — Admin & Content Management System

**Canvas trace:** `Manage Digital Core` → `Manage Digital Backoffice` → `Manage Finance` + `Manage Legal` → `Manage Content Management` · `Manage Content Lifecycle` · `Manage Revenue`  
**Business outcome:** Operational efficiency; rapid, consistent content publishing at scale

---

#### Feature 9.1 — Headless CMS

**Canvas capability:** `Manage Content Management` · `Manage Content Lifecycle` · `Manage Content Publishing`

**User Story 9.1.1**
> As Fweezy's editor, I want to publish a complete new device page — with specs, scores, images, buy links, and verdict — in under 15 minutes using a clear admin UI so that we can keep pace with weekly device launches.

**Acceptance Criteria:**
- CMS: Payload CMS v3 (TypeScript-native, self-hosted on Contabo VPS) — no per-seat pricing
- **Collections managed in CMS:**
  - `Devices` — brand (relation) · name · slug (auto-generated + editable) · release year · images (up to 10, Cloudflare Images) · spec fields per section · 5 sub-scores · affiliate links (repeater) · verdict rich text · associated videos (relation) · associated articles (relation) · status (draft/published)
  - `Articles` — title · slug · rich text body · featured image · associated device (relation) · published date · tags · status
  - `Videos` — title · platform · embed ID · thumbnail URL · view count (manual or API) · associated device (relation) · published date
  - `Brands` — name · logo · slug
  - `Sponsors` — company name · logo · website URL · partnership type
  - `Press Releases` — title · PDF upload · date
  - `Awards` — award name · awarding body · year · certificate image · associated URL
  - `Site Settings` — sponsor page visibility · dimension weights · admin email · social handles · analytics toggle
- **Draft preview mode:** editor previews an unpublished device page at `/preview?secret={CMS_PREVIEW_SECRET}&id={documentId}`
- **Role-based access control:** Admin (full CRUD + settings) · Editor (create + edit, no delete, no settings) · Viewer (read-only)
- **Media library:** integrated Cloudflare Images for upload, optimisation, and CDN delivery; images referenced by Cloudflare Image ID

---

#### Feature 9.2 — SEO Automation & Sitemap

**Canvas capability:** `Manage Content Keyword Optimisation` · `Manage Content Metadata Management`

**User Story 9.2.1**
> As the site owner, I want sitemaps, canonical URLs, and meta tags managed automatically on every publish so that Google indexes all content correctly without manual SEO work.

**Acceptance Criteria:**
- `/sitemap.xml` auto-generated on each publish/build; includes all device pages · articles · video pages with `<lastmod>` and `<changefreq>`
- Canonical `<link rel="canonical">` on every page, including comparison pages (canonical = alphabetically-ordered device pair URL)
- `robots.txt` configurable via CMS Site Settings: global allow with per-page `noindex` toggle
- Meta title and meta description editable per CMS record; auto-generated fallback if left blank: `{Device Name} Review & Specs — FweezyTech` / `{Article Title} — FweezyTech`
- Structured data (JSON-LD) validation run in CI using Google's Rich Results Test API on each PR to `main`
- `hreflang` tag infrastructure in place for future Swahili (`sw-KE`) content pass

---

## 5. Non-Functional Requirements

| Category | Requirement | Canvas Domain |
|---|---|---|
| **Performance** | LCP ≤ 1.5 s · CLS < 0.1 · FID < 100 ms on 4G mobile; Lighthouse ≥ 90 | Manage Digital IT |
| **Availability** | 99.9% uptime; CDN-served static assets (Cloudflare Pages or Vercel Edge) | Manage Digital IT |
| **Security** | HTTPS enforced; CSP headers; rate-limiting on all form + API routes; OWASP Top 10 mitigated | Manage Digital Security |
| **Identity & Access** | CMS RBAC; JWT-based auth; session expiry 24 h; Google OAuth 2.0 for community features | Manage Digital Security |
| **Scalability** | SSG/ISR for device + article pages; dynamic routes only for comparison + search + auth | Manage Digital IT |
| **Internationalisation** | English primary (`en-KE`); architecture ready for Swahili second-language pass | Manage Digital Channels |
| **PWA** | `manifest.json` · Service Worker · offline fallback page · installable · push notification opt-in | Manage Digital Channels |
| **Accessibility** | WCAG 2.1 AA; screen-reader tested (VoiceOver + TalkBack); colour contrast ≥ 4.5:1; `prefers-reduced-motion` | Manage Digital Channels |
| **Content IP** | All device images properly licensed or sourced from OEM press kits; watermarked user uploads rejected | Manage Digital Backoffice |

---

## 6. Recommended Technology Stack

| Layer | Technology | Canvas Capability Addressed |
|---|---|---|
| **Frontend framework** | Next.js 15 (App Router, RSC, ISR) | Manage Online Channels (Web) |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Manage Digital Workspace Experience |
| **CMS** | Payload CMS v3 (self-hosted, TypeScript) | Manage Content Management |
| **Database** | PostgreSQL via Supabase | Manage Intelligence Infrastructure |
| **Search** | Meilisearch (self-hosted, Contabo VPS) | Manage Content Indexing & Retrieval |
| **Media CDN** | Cloudflare Images + Cloudflare Pages | Manage Content Delivery Networks |
| **Analytics** | Umami (self-hosted) | Manage Channel Engagement Analytics |
| **Email** | Resend | Manage Omni-Channel Communication |
| **Auth** | NextAuth.js + Google OAuth | Manage Identity & Access Security |
| **OG Images** | Satori (@vercel/og) | Manage Digital MarCom Content |
| **CI/CD** | GitHub Actions → Vercel (frontend) + Contabo (CMS + search) | Manage Digital Platforms |

> **Infrastructure note:** Contabo VPS already hosts `crm.favitech.co.ke`. CMS, Meilisearch, and Umami can be co-located on the same VPS behind Nginx reverse proxy with Let's Encrypt TLS — matching the existing deployment pattern.

---

## 7. Milestone Roadmap

| Milestone | Epics Delivered | Target Duration |
|---|---|---|
| **M1 — Foundation** | EP-09 (CMS), design system, homepage, site shell, PWA manifest | Weeks 1–2 |
| **M2 — Device Intelligence** | EP-01 (Device Hub full), EP-04 (Search), 20+ seed devices loaded | Weeks 3–4 |
| **M3 — Content Hub** | EP-02 (Video + Articles + Coming Soon), EP-07 (Brand + Press Room) | Weeks 5–6 |
| **M4 — Comparison & Community** | EP-03 (Comparison Engine), EP-05 (Ratings + Comments) | Weeks 7–8 |
| **M5 — Monetisation & Analytics** | EP-06 (Affiliate + Sponsors), EP-08 (Analytics Dashboard) | Weeks 9–10 |
| **M6 — Polish & Launch** | Lighthouse audit, accessibility sweep, OG images, SEO validation, press room, award asset package | Weeks 11–12 |

---

## 8. Definition of Done

A user story is **Done** when all of the following are true:

1. All acceptance criteria implemented and manually verified in staging
2. Unit + integration tests written and green (Jest / Vitest); E2E tests passing (Playwright)
3. Lighthouse score ≥ 90 on mobile for all affected page routes
4. Code peer-reviewed via GitHub Pull Request (min 1 approval before merge to `main`)
5. Deployed to staging environment and smoke-tested on both desktop and mobile
6. CMS collection schema changes documented in `/docs/cms-schema.md`
7. Schema.org JSON-LD validated via Google Rich Results Test for affected page types
8. No open High or Critical severity bugs within the story's scope
9. Canvas traceability confirmed: story maps to a named Canvas Domain → SubDomain → Capability

---

*End of Specification — FweezyTech Website v1.1*  
*Solutions Architect: G | Canvas: capability_canvas_3.cypher | July 2026*
