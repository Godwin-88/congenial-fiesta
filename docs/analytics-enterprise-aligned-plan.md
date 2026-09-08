# FweezyTech Admin Analytics — Enterprise-Aligned Implementation Plan

> **Status:** Draft v1 — for architecture review prior to implementation.
> **Reference:** `seedgraph.cypher` (enterprise capability canvas — **read-only input; NOT modified**).
> **Scope:** a GA-competitive, sales-funnel-first analytics platform for the signed-in admin app, mapped one-to-one onto the enterprise capability model.

---

## 1. Purpose & Positioning

### 1.1 Why we win against Google Analytics (not by imitating it)

| Dimension | Google Analytics | FweezyTech Advantage |
|---|---|---|
| URLs | Generic paths (`/devices/xyz`) | **Catalog-aware** — we see *iPhone 15 vs Galaxy A55*, brand, price tier |
| Conversion visibility | Blind — everything crashes into "purchase" or Google Ads | **Revenue-owned** — content → **affiliate clicks → estimated revenue** per device/article/retailer — GA cannot do this |
| Content coupling | Disconnected from CMS | **CMS-integrated** — editor sees traffic + CTR + revenue inline on the same screen they edit |
| Intent signals | Generic engagement (bounce/time) | **First-party intent** — saves, comparisons, ratings, comments, searches-with-clicks (GA has no idea) |
| Consent | Consent-banner complexity | **Privacy-first first-party tracking** (already live — Kenya DP Act-friendly) |
| Market fit | Built for SaaS/ecom in mature markets | **Kenya/emerging-market focus** — Jumia/Kilimall/Amazon interplay, mobile-first audience, price sensitivity |

### 1.2 North-star metrics (BD-strategist lens)

1. **Affiliate CTR & revenue proxy** — views → clicks → est. commission.
2. **Buy-link fill-rate** — % of live devices with ≥1 working buy link (revenue-leakage finder).
3. **Content→conversion velocity** — how fast a new review/guide starts pulling clicks.
4. **Reach & consideration depth** — device page views, compare usage,, guide consumption.
5. **Repeat/community (owned audience)** — signed-in returns,, saves,, ratings — the compounding organic asset.



---

## 2. Tab ↔ Capability Registry

Every tab, widget and metric must trace to ≥2 existing canvas capability — an anti-scope-creep gate. Canvas anchors use the ids as-is from `seedgraph.cypher` (reference only。

| Tab | Canvas anchor(s (id)) | What the canvas *adds* to the tab's plan |
|---|---|---|
| **Overview** | `Manage Experience Growth Analytics` (4a28289dd1b4254c36b147e1) · `Architecture Intelligence (EA)` (343987d1d2e3939e237e2de5) | "Experience" framing (not just counts); the dashboard itself is a **governed asset** (versioned, owned). |
| **Traffic & Audience** | `Manage Onsite Behavioural Analytics` (3b231c43ef41c0191dacd88a) · `Manage Marketing Tags Lifecycle` (4ba3ffa7a0cdce02c1854c92) · `Manage Data & Cyber` (5374053ae12f7205efa9d011) | **Tag governance** — UTM/source/device tags as lifecycle-managed assets (audited, versioned); PII/consent flags (cookie-id,, IP-country,, heartbeat)。 |
| **Content & SEO** | `Manage Content Resources` (d2ccd6e81d77f233bd3f9200) · `Manage Content Sharing` (cfb779ca3a67d0e2df76a296) · `Manage Marketing Planning` (16bbdaae64ce25436441f397) | Zero-Report/decay-queue **feeds the content calendar** — analytics drives the editorial roadmap; Content Sharing → syndication/amplification metrics |
| **Devices & Catalog** | `Manage Digital Channels` (6adbeaa88b3d136bca253d3c) · `Manage Distribution & Marketing` (a9babcf5693c3f26f2f838e8) | Devices/catalog as **channel assets**; buy-links as the "Distribution" plane — link-health/retailer coverage as **distribution governance**, not just a table |
| **Compare & Consideration** | `Manage Onsite Behavioural Analytics` (3b231c43ef41c0191dacd88a) · **`Manage Qualification Analytics`** (9744f95688f3aaa7b49090a6) | **Qualification** — compare+save+signed-in = **intent-qualified leads** (MQL-equivalent). Add a *Qualification Score* per visitor + a "high-intent audience export" (feeds future CRM/retargeting/email) |
| **Community & Engagement** | `Manage Community Marketing Strategy` (08be09c77c6a17ba2b27131a) · `Manage Trust Revenue & Assets` (8034af010b3981284e1ecccb) | Reputation as a **revenue-generating trust asset** — sentiment→conversion thesis becomes a governed capability (Trust Revenue), not a vibe |
| **Affiliate & Revenue** | `Manage Revenue` (1c805f1e28a6528027606b4d) · `Manage Finance Accounting` (9ae5cf43fd4ec7c92514bfbe) · `Manage Cross-Analytics Stores` (4b0ade32a20d8cf16b792645) | **Finance reconciliation** — revenue-proxy/commission must reconcile with the Finance/Backoffice domain (payouts, VAT, board-ready numbers; warehouse layering (raw clicks → aggregated → revenue mart) mandated |
| **Search & Discovery** | `Manage Cross-Analytics Stores` (4b0ade32a20d8cf16b792645) · `Manage Data/Warehouse Stores` (cac9d3bcd28ec54f97c3618f) | Search analytics = data-store discipline (query/zero-gap mining as a first-class store, not a bolt-on) |
| **Campaigns & Acquisition** | `Manage Digital MarCom Intelligence` (c85a2dd4238cdb8605989f0c) · `Manage Distribution & Marketing` (a9babcf5693c3f26f2f838e8) · `Manage Marketing Tags Lifecycle` (4ba3ffa7a0cdce02c1854c92) | Campaigns as governed **MarCom orchestration** — UTM registry (managed tags,, channel mix (Distribution), influencer/social under the "creator-led discovery" trend |
| **Outreach & Leads** | `Manage Trust Revenue & Assets` (8034af010b3981284e1ecccb) · **`Manage Qualification Analytics`** (9744f95688f3aaa7b49090a6) | Press/sponsor/media-kit inquiries as **qualified leads** (score by intent/company/profile; handoff-ready) |
| **Goals, Alerts, Export** | **`Manage Prescriptive Analytics`** (3794d994220ccac0c5f83332) · `Manage Data Release` (7607e41d8e8319255bbd6430) · `Manage Datastore Interfaces` (fd0618591b33926e0562367b) · `Manage Data Lifecycle` (a15ab4c243fd921e13951018) | Alerts/recommendations = **prescriptive output**; exports/APIs = **governed data release** (approved,, versioned,, audited); retention/purge as **lifecycle discipline** |

---

## 3. Seven Architectural Principles (implementation gates)

1. **Capability-gated scope** — no feature ships unless it maps to a canvas capability/Trend/Standard (the Registry in §2 is the gate).
2. **Data ownership on every KPI** — each metric declares `source_dataset · cadence · owner` (mirrors `Manage Data Ownership` — ebd467155a5d63cbbe70f874). The admin UI shows this per card (ℹ glossary。

3. **Governance & privacy flags** — per tab: consent/DPA flags on any PII-bearing metric (IP,, cookie-id,, email;; attribution/UTM naming conforms to a stated convention; trends listed per tab (so the roadmap stays future-proofed。


4. **Role-scoped surfaces** — `owner` sees all (revenue/finance/outreach;, `editor` sees content/devices/community;, `viewer` sees overview/traffic only — enforced in layout,, not per-widget。


5. **Warehouse layering** — *raw* (`page_views`, `affiliate_clicks`, new `interactions`, `utm_events`) → *aggregated* (cron daily device/geo/retailer marts — existing `aggregate-analytics`) → *mart* (KPI/glossary/export suites) — exactly the `Manage Cross-Analytics Stores` / `Manage Data/Warehouse Stores` discipline。


6. **Loop closure via the Epic/Feature plane** — each tab's widgets key to a plan Epic/Feature idea (in *our* plan doc; analytics outputs (Actions: content backlog,, buy-link fixes,, campaign reviews)) — these *are* the prescriptive plane (`Manage Prescriptive Analytics`), and live KPI values write back to our metrics dictionary (implemented in-app,, not in cypher。


7. **Metric naming aligned to GA4** — every KPI carries a `ga4_alias` (e.g. `CTR ≈ outbound click rate`; `sessions ≈ views/session`) — keeps it comparable to industry norms while remaining revenue-owned。

---

## 4. Gap Analysis (both directions)

### 4.1 Gaps in our plan — capabilities the canvas surfaces we should now include

1. **Qualification Analytics** (`Manage Qualification Analytics` → MQL-equivalent scoring + "high-intent audience export" (new section under Consideration tab)。
2. **Trust Revenue** (`Manage Trust Revenue & Assets`) — reputation-as-revenue: sentiment→conversion proof, review-coverage target ("≥ 80% of published devices have ≥1 rating/comment")。
3. **Data Lifecycle** — retention/TTL policy per dataset (raw events ≤ 24 months, PII expunge-on-request, aggregated marts kept longer))。
4. **Finance reconciliation** — commission/payout forecasting tied to the Finance domain (exportable trial-balance-style report for VAT/board review))。
5. **Tag Lifecycle** — UTM tag registry/audit for the Campaigns tab (which content carries which tags; stale/duplicate tags cleanup))。
6. **Content-calendar coupling** — the editorial-backlog output feeds `Manage Marketing Planning` (as a calendar view,, not just a list))。



### 4.2 Gaps in the canvas — capabilities our plan implies the canvas lacks (flag-only; NO file edit())

- `Manage Audience Acquisition Analytics` — Traffic/Retention tab concerns。
- `Manage Catalog & Product Analytics` — device-funnels,, buy-link fill-rate。

- `Manage Search & Discovery Analytics` — query-mining / zero-result backlog。
- `Manage Affiliate Monetisation Analytics` — revenue/funnel specifics。
- `Manage Content & SEO Performance Analytics` — content-score / decay detection。

These are *our* implementation's contribution — recorded **here** as "proposed capabilities (canvas update pending governance review)" — so the canvas stays untouched, but remains the north star。





---

## 5. Data Reality, Phasing & KPI Dictionary

### 5.1 Data reality check

| Recommendation | Data today | Needs new |
|---|---|---|
| Tabbed IA restructure | ✅ everything already collected | none (pure UI reorg) |
| Geo city, source drilldown | ✅ country/source | city header (1-line), UTM columns |
| Unique visitors / return-rate / time-on-site | ✅ raw views | FP cookie id + heartbeat (small) |
| Device/Compare/Content funnels | ✅ views + clicks in place | `add_to_compare` / `save` / `watch` / `related_click` events (one interactions table + 4 beacon calls) |
| Revenue proxy & retailer payouts | ✅ clicks | `affiliate_earnings` import + per-retailer commission config |
| Zero-result search backlog | ✅ query table | log zero-results in search route |
| Link-health cron, decay detection, alerts | ✅ views + clicks | scheduled jobs (cron infra exists) |
| GSC / Affiliate-network APIs | — | external OAuth / data integrations (Phase 3) |

### 5.2 Phasing

- **Phase 1 (pure UI, ~no schema) — ✅ LIVE:** Tabbed IA; funnel strip; device/brand/retailer drilldowns; content-segmented top pages; Zero Report (views-without-clicks) — all derivable *today*。
- **Phase 2 (small instrumentation) — ✅ LIVE:** interactions event table (compare/save/watch/related-click), FP-id for uniques/return/attribution, UTM capture, zero-result logging, link-health cron, earnings-import foundation (commission-rate config), alerts + digest。
- **Phase 3 (platform-level) — ✅ LIVE:** Qualification scoring (MQL-equivalent hot/warm/cold + export), affiliate earnings reconciliation (proxy vs imported), buy-link health monitoring (daily HEAD-check cron + panel)。
- **Phase 4 (goals & automation) — ✅ LIVE:** Alert-rule engine (`analytics_alert_rules` × KPI matrix), daily breach cron + email, Goals tab with progress cards + acknowledge workflow, digest extension (revenue proxy / alerts / search gaps)。
- **Phase 5 (lifecycle & self-service) — ✅ LIVE:** Per-table retention TTL (`retention_policy`) + monthly purge cron + admin preview/run + append-only audit log (`data_retention_log`); DPA expunge-on-request by `fp_id`; alert-rule CRUD (create / edit / pause / delete) gated owner/admin; role matrix enforced for the Goals tab (owner/admin manage, editor/viewer read-only)。
- **Phase 6 (explore & scheduled delivery) — ✅ LIVE:** GA4-style Explore builder (8 metrics × 7 dimensions, pure-JS over first-party tables, share %, CSV); earnings CSV import (dedupe by natural key, template download); self-service scheduled exports (daily/weekly/monthly × email/Slack) via `scheduled_exports` registry + hourly due-check cron; shared `export.ts` generator reused by on-demand + scheduled paths。

### 5.3 KPI dictionary skeleton (every KPI ships with full metadata — ℹ glossary)



| KPI id | Name | Formula | Source table(s)。 | Cadence | Owner | GA4 alias | Funnel stage |
|---|---|---|---|---|---|---|---|
| `kpi_views` | Page Views | count rows | `page_views` | hourly | editor | `pageviews` | Awareness |
| `kpi_unique_visitors` | Unique Visitors | distinct fp_id | `page_views` (+fp_id。 | daily | editor | `total_users` | Awareness |
| `kpi_affiliate_ctr` | Affiliate CTR | clicks ÷ device views × 100 | `affiliate_clicks` × `page_views` | daily | owner | ≈ `outbound_click_rate` | Conversion |
| `kpi_rev_proxy` | Est. Revenue Proxy | Σ(clicks × retailer commission rate) | `affiliate_clicks` × commission config | daily | owner | — (GA has no equivalent) | Conversion |
| `kpi_buy_fill` | Buy-link Fill-rate | % live devices with ≥1 active buy link | `devices.buy_links` + link-health | weekly | owner | — | Conversion |
| `kpi_consideration_depth` | Compare/Save Depth | compares + saves ÷ sessions | `interactions` (+fp_id) | daily | editor | ≈ `engagement` | Consideration |
| `kpi_qual_score` | Qualification Score | weighted intent signals (compare/save/signed-in) | `interactions` × `auth` | daily | owner | — | Consideration |
| `kpi_trust_coverage` | Review Coverage | % devices with ≥1 rating/comment | `ratings` × `comments` | weekly | editor | — | Loyalty |
| `kpi_search_gap` | Zero-Result Searches | count zero-hit queries | `search_queries` (+zero flag) | weekly | editor | ≈ `search_lost` (GSC concept) | Consideration |

> Conventions: `ga4_alias` keeps the metric comparable to industry norms; missing GA4 alias = a Fweezy-owned metric (our moat)。

---

## 6. Proposed Capabilities (canvas update pending governance review — flag-only, no file edit)

The canvas currently lacks five capabilities our implementation implies. Recorded for governance; if approved, they'd be added to the enterprise model in a *future* canvas review (not now):

1. `Manage Audience Acquisition Analytics` — traffic/retention tab concerns。
2. `Manage Catalog & Product Analytics` — device-funnels, buy-link fill-rate。
3.. `Manage Search & Discovery Analytics` — query-mining / zero-result backlog。
4.. `Manage Affiliate Monetisation Analytics` — revenue/funnel specifics。
5.. `Manage Content & SEO Performance Analytics` — content-score / decay detection。

Each would carry the standard canvas treatment: `Domain → SubDomain → Capability → SubCapability`, `STD_`/`TRD_` governance ties,, `EPIC_`/`FEAT_` plan planes, and be positioned under `Manage Digital MarCom Intelligence` / `Manage Digital Intelligence`。

---

## 7. Implementation Notes (what we'd build, in what order)

### 7.1 Page restructure (Phase 1)

- `/admin/analytics` becomes a **tabbed layout** — 12 tabs per §2 (Overview · Traffic & Audience · Content & SEO · Devices & Catalog · Compare & Consideration · Community & Engagement · Affiliate & Revenue · Search & Discovery · Campaigns & Acquisition · Outreach & Leads · Goals, Alerts & Automation · Export & API)。
- URL scheme: `?tab=<kebab-case>` (e.g. `/admin/analytics?tab=affiliate-revenue`), deep-linkable, defaults to `overview`。
- Existing widgets regroup under tabs; shared period toggle (existing 7d/30d/90d + custom date-range picker);role-scoped by layout, not per-widget。


###  ️7.2 New instrumentation (Phase 2)

- New `interactions` table + beacon calls: `add_to_compare` · `save` · `watch` · `related_click`。
- FP id (first-party cookie) for uniques / return-rate / attribution; flag `pii=true` governed per DPA。
。
 - UTM capture (`utm_source/medium/campaign`) in `page_views`。


- Earnings import: CSV upload first (Amazon Associates, Jumia,, Kilimall monthly reports;, then API/Zapier; per-retailer commission config drives the revenue proxy。
。
 - Zero-result search logging; link-health cron (HEAD-check outbound buy-links, flag 404s/expired;; alerts + digest extension。





###  ️7.3 Where the loop closes

| Analytics output | Action artifact | Owner |
|---|---|---|
| Zero Report (views-without-clicks) | "Add Jumia link / move Buy Box above-the-fold" tickets | editor |
| Zero-result search mining | Content-backlog items ("write guide for 'cheapest phone under 20k'") | editor |
| Decay detection | "Refresh this 14-month-old review" queue | editor |
| Buy-link gap / link-health | ops ticket to replace dead retailer link | ops/owner |
| Sentiment-vs-CTR | pick which reviews to promote on social/YouTube | marketing/owner |
| Finance reconciliation | monthly payout/VAT export (board-ready) | owner |

---

## 8. Open Questions (for architecture review)

1. **FP-id vs cookieless**: ✅ **Resolved in Phase 2** — first-party `fweezy_fp` cookie (395 days, SameSite=Lax, PII-scoped per Kenya DP Act, no third-party trackers), with Phase 5 expunge-on-request + retention TTL as the governance layer.
2. **Earnings import mechanism**: 🔶 **Partial** — `affiliate_commission_rates` + `affiliate_earnings` ledger and the reconciliation UI are live (Phase 3); CSV-upload + network-API importers remain Phase 6 work.
3. **Role matrix**: ✅ **Resolved in Phase 5** — owner/admin manage alert rules + retention actions; editor/viewer are read-only (enforced in both the API routes and the client panels).
4. **GA4-strictness vs Fweezy-owned**: keep `ga4_alias` as *reference only*, with Fweezy-owned metrics (revenue proxy, qualification score) as first-class — confirmed: no literal GA4 API parity needed.

---

*End of plan — ready for architecture review prior to implementation.`seedgraph.cypher` was used as a reference only and was not modified.*