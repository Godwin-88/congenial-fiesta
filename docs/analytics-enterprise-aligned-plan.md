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
- **Phase 6 (explore & scheduled delivery) — ✅ LIVE:** GA4-style Explore builder (8 metrics × 7 dimensions, pure-JS over first-party tables, share %, CSV); earnings CSV import (dedupe by natural key, template download); self-service scheduled exports (daily/weekly/monthly × email/Slack) via `scheduled_exports` registry + hourly due-check cron; shared `export.ts` generator reused by on-demand + scheduled paths.
- **Phase 7 (affiliate-network API connectors) — ✅ LIVE:** zero-touch earnings reconciliation — `affiliate_networks` config table (endpoint · auth type · env-var key secret-ref · field mapping) + `affiliate_sync_logs` audit trail; sync engine fetches JSON/CSV reports, maps to the `affiliate_earnings` ledger and dedupes via natural key; admin UI (Affiliate → Network API Connectors panel) with Add/Sync-now/Enable/Delete + runs log; daily cron `affiliate-sync` (20:00 UTC); Big Three seeded and disabled until configured (Jumia/Amazon/Kilimall).
- **Phase 8 (Devices & Catalog intelligence) — ✅ LIVE:** the Devices tab rebuilt as a catalog-revenue story — `getDeviceInsights(period)` joins the catalog to the audience (coverage → demand → leakage → action) with no new instrumentation, no migration and no new cron; new visuals + a prescriptive fix queue; two new CSV reports + a JSON endpoint (see §7.4).
- **Phase 9 (Compare & Consideration intelligence) — ✅ LIVE:** the Compare tab rebuilt as the intent story — `getConsiderationInsights(period)` joins the intent beacon to traffic + catalog (funnel → mix → audience → pairs → action); shared qualification model (hot/warm/cold MQL tiers) in `src/lib/analytics/consideration.ts`; six purpose-built visuals + a prescriptive consideration queue; two new CSV reports + a JSON endpoint + two new Explore surfaces (`intent_score` metric · `qualification_tier` dimension) — see §7.5.

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
| Catalog fix queue (Phase 8) | prioritised tickets ranked by views at risk, each deep-linked to the device editor | editor/ops |
| Ghost demand / dead device paths (Phase 8) | redirect or new-page brief — traffic exists, the product page does not | SEO/dev |
| Retailer taxonomy mismatches (Phase 8) | normalise `buy_links[].retailer` + rate-sheet keys before trusting per-retailer revenue | ops/owner |
| Stale / missing buy-link prices (Phase 8) | price-refresh queue (buy box under-sells the click it just earned) | editor |
| Sentiment-vs-CTR | pick which reviews to promote on social/YouTube | marketing/owner |
| Finance reconciliation | monthly payout/VAT export (board-ready) | owner |

---

### 7.4 Devices & Catalog tab — the catalog-revenue story (Phase 8, ✅ LIVE)

Canvas anchors: `Manage Digital Channels` (6adbeaa88b3d136bca253d3c) — catalog entries **are** channel assets —
and `Manage Distribution & Marketing` (a9babcf5693c3f26f2f838e8) — **buy links are the distribution plane**, so
retailer coverage and link health are governance surfaces, not just a table.

The tab answers four questions in order, and every widget belongs to exactly one of them.

| # | Question | Widget(s) | Metric / formula |
|---|---|---|---|
| **A** | Can this catalog earn at all? | KPI strip · `BuyLinkFillGauge` · `CatalogReadinessChecklist` | `kpi_buy_fill` = published devices with ≥1 valid buy link ÷ published devices; readiness per attribute (buy link · images · price · verdict · score · SEO title) |
| **A2** | Where can it be bought? | `RetailerCoverageMatrix` (retailer × price tier) · `RetailerTaxonomyTable` | devices covered per retailer per tier; registry agreement across catalog `buy_links[].retailer` · `affiliate_clicks.retailer` · `affiliate_commission_rates.retailer` · buy-box keys |
| **B** | Which assets pull their weight? | `CatalogConcentrationChart` (Pareto) · `DeviceDemandHeatmap` (tier × bucket) · `DemandBreakdownTables` (tier/category/brand) · affiliate-clicks table | ranked views + cumulative share; Pareto rank at 80%; Σ views per (bucket × tier); clicks per view by dimension |
| **C** | Where does demand hit a dead end? | `DeviceDemandFlowChart` (Sankey brand → outcome) · `DeviceOutcomeSplit` · `OrphanDemandTable` · link-health census | outcome = `monetised` \| `live_no_buylink` \| `unpublished` \| `missing`; wasted views = unpublished + stale slugs; orphan = `/devices/*` paths with no catalog row |
| **D** | What do we fix first? | `CatalogFixQueue` · `CatalogPerformanceTable` | issues ranked by **views at risk**; sortable/filterable per-device grid |

**Outcome model (the spine of the tab).** A device-page view is classified by joining `page_views.path` to `devices`:

- `monetised` — published **and** ≥1 valid (http) buy link: this view could convert.
- `live_no_buylink` — published, renders fine, nothing to click.
- `unpublished` — the row exists but `status != 'published'`, so the path 404s.
- `missing` — no catalog row, or the brand segment in the URL ≠ `devices.brand.slug` (both 404).

**Fix queue issue codes** (each row carries the concrete action + a deep link to `/admin/devices/{id}/edit`):
`no_buy_link` · `unpublished_but_trafficked` · `stale_slug` · `broken_link` (from `link_health_checks`) ·
`stale_price` (>90d `priceDate`) · `missing_price`. Severity = views at risk (≥50 high · ≥10 medium · else low).

**Data sources:** `devices` · `brands` · `device_types` · `page_views` · `affiliate_clicks` · `interactions` ·
`link_health_checks` · `affiliate_commission_rates` — all existing. **No migration, no new table, no new cron, no
new beacon.** Aggregation is pure JS in `getDeviceInsights()`, same discipline as `getTrafficInsights` /
`getContentInsights` (loaded lazily, only when `?tab=devices`).

**Exposed endpoints.** In addition to the two CSV reports, the same aggregation is available as JSON for BI tooling
(the page and the API read one function, so they can never disagree):

| Surface | Contract |
|---|---|
| `GET /api/admin/analytics/devices?period=30d&view=full` | whole `DeviceInsights` payload + `meta.definitions` |
| `…&view=summary` | headline KPIs only (safe to poll) |
| `…&view=catalog` | per-device rows (views · clicks · links · intent · outcome) |
| `…&view=fix-queue` | issue list ranked by views at risk |
| `…&view=distribution` | retailer coverage, taxonomy reconciliation, link health |
| `GET /api/admin/export/device-catalog?period=30d` | CSV of the performance grid |
| `GET /api/admin/export/catalog-gaps?period=30d` | CSV of the fix queue (priority · issue · views at risk · action) |

Both exports are also registered in `SCHEDULED_EXPORT_REPORTS`, so Export → Scheduled exports can deliver the
catalog review weekly by email/Slack with no extra code.

**Explore builder:** two catalog-aware dimensions were added (`price_tier` · `category`) alongside `device` and
`retailer`, so the Explore tab can slice any metric (views · clicks · revenue proxy · saves · compares · watches) by
the catalog's own dimensions.

**Visual language (why these charts).** Deliberately distinct from the other tabs while reusing their idioms:
hand-rolled SVG **gauge** (server-rendered, zero client JS) · **tint matrices** for retailer × tier and bucket × tier
heatmaps (a blank cell *is* the finding) · **Pareto composed chart** (bars + cumulative line + one 80% reference
line) · **Sankey** in the same idiom as the Traffic tab but coloured by outcome rather than source · **100% stacked
ribbon** for the outcome split · **prescriptive table** with severity pills and deep links. Every chart ships a
caption that states how to read it, and every card carries an ℹ `MetricInfo` (definition · formula · GA4 alias ·
source · action).

**Retired from this tab (superseded, files kept for reuse):** the standalone *Top Devices by page views* and
*Top Brands* cards — their data is now a superset inside `CatalogPerformanceTable` and `DemandBreakdownTables`
(devices · views · clicks · CTR · buy links · intent · outcome, plus monetised share and coverage per brand). This
also removed a per-page Supabase round-trip from the analytics page load.

**Known reads / caveats (all surfaced in the UI):**

- Click attribution is by `device_slug`, so a click arriving from a search/home/compare card can exceed that page's
  own views in the period → the breakdown header says **“Clicks/views”**, not CTR (caption explains). `monetised
  share` stays a strict per-device ratio.
- Buy-link *validity* requires an `http(s)` URL; a retailer with no URL counts as **no coverage** (it can be neither
  clicked nor HEAD-checked).
- Retailer keys are matched case-sensitively by `/api/out/[device]/[retailer]` and the commission rate sheet is
  lowercase — a capitalised key (e.g. `Jumia`) still renders the click but prices it at **0**, so the taxonomy table
  flags it instead of hiding it.
- `link_health_checks` is capped at the 4 000 most recent rows; the census reports what it actually saw (`checked`,
  `broken`, `uncheckedLive`, `orphanChecks`) rather than implying full coverage.

---

### 7.5 Compare & Consideration tab — the intent story (Phase 9, ✅ LIVE)

Canvas anchors: `Manage Onsite Behavioural Analytics` (3b231c43ef41c0191dacd88a) — the intent beacon **is** the
onsite-behaviour plane — and **`Manage Qualification Analytics`** (9744f95688f3aaa7b49090a6) — intent → hot/warm/cold
is the **MQL layer** the plan asks for. `/compare` itself is treated as a **channel asset** (Digital Channels): a
completed comparison run is the deepest intent signal on the site, one step above the buy click.

The tab answers five questions in order — **funnel → mix → audience → pairs → action** — and every widget belongs to
exactly one of them.

| # | Question | Widget(s) | Metric / formula |
|---|---|---|---|
| **A** | How many browsers become buyers? | KPI strip (Intent events · Comparison runs · Hot+warm · Browser→buyer %) · `ConsiderationFunnelGauge` | distinct `fp_id` per stage: browsers (`/devices/*` views) → savers (`save`) → comparers (`add_to_compare`) → buy clickers (`affiliate_clicks`); step % = stage ÷ previous |
| **B** | Where does intent concentrate? | `IntentMomentumChart` (action × bucket heatmap) · intent-by-action bars + content-type chips | Σ events per (bucket × action); per-action events · visitors · devices; events per `content_type` |
| **C** | Who are the hot, warm and cold? | `QualificationThermometer` (3-band bar + legend) · score histogram · `QualifiedLeadsTable` scoreboard | tier = score ≥ 8 hot · 4–7 warm · < 4 cold; score = compare×3 + save×2 + watch + related + click×2 + signed-in×2 |
| **D** | What is being compared, and what converts attention? | `ComparePairChord` (arcs + chords) · `ConsiderationDepthTable` (intent ledger) | runs per canonical pair (sorted slugs); per device: intent score, intent/100 views (density), clicks/100 intent (shortlist conversion), temperature |
| **E** | What do we fix first? | `ConsiderationFixQueue` (+ CSV) | issues ranked by **interest at stake** (device intent score / pair runs); device rows deep-link to `/admin/devices/{id}/edit`, pair rows to the live comparison |

**Qualification model (the spine of the tab).** The score is shared by every surface (`qualification.ts` is the single
source of truth for weights, tiers and colours — the page, the charts and the exports cannot drift):

- Weights: `add_to_compare` ×3 · `save` ×2 · `watch` ×1 · `related_click` ×1 · affiliate click ×2 · signed-in +2.
- Tiers: **hot** ≥ 8 (purchase-ready — retarget) · **warm** 4–7 (one nudge — price-drop/new-review alerts) ·
  **cold** < 4 (browsing — reach, not budget).
- Identifiers are first-party (`fp_id` cookie), so the audience survives across pages without third-party trackers —
  the CRM handoff asset GA4 cannot provide. Same 395-day retention window as the beacon.

**Consideration issue codes** (each row carries the concrete action; severity = interest at stake
≥ 10 high · ≥ 4 medium · else low):

`high_interest_no_links` (shortlisted, zero buy links) · `conversion_leak` (intent + links, zero clicks — the box, not
the traffic, is broken) · `save_only` (saved ≥3, never compared) · `watch_only` (watched ≥3, never shortlisted) ·
`compare_orphan` (a pair runs on a dead/unpublished slug) · `lopsided_pair` (one side carries <15 % of the pair's
intent). Pair issues are editorial actions, device issues are catalog actions — the queue names which.

**Data sources:** `interactions` · `page_views` · `affiliate_clicks` · `devices` · `brands` — all existing. **No
migration, no new table, no new cron, no new beacon** (the beacon already fires `save` / `add_to_compare` / `watch` /
`related_click` from the device page, compare bar and video blocks). Aggregation is pure JS in
`getConsiderationInsights()`, loaded lazily only when `?tab=compare` — same discipline as Traffic/Content/Devices.

**Exposed endpoints** (page and API read one function, so they can never disagree):

| Surface | Contract |
|---|---|
| `GET /api/admin/analytics/compare?period=30d&view=full` | whole `ConsiderationInsights` payload + `meta.definitions` |
| `…&view=summary` | headline KPIs only (safe to poll) |
| `…&view=funnel` | stage counts + intent momentum buckets |
| `…&view=audience` | tier counts, score histogram, top-25 scored visitors |
| `…&view=pairs` | canonical rivalries + per-device depth rows |
| `…&view=queue` | the fix queue ranked by interest at stake |
| `GET /api/admin/export/consideration-funnel?period=30d` | CSV of the per-device intent ledger |
| `GET /api/admin/export/consideration-queue?period=30d` | CSV of the fix queue |
| `GET /api/admin/export/qualified-leads?period=30d` | existing high-intent export, unchanged contract |

Both new exports are registered in `SCHEDULED_EXPORT_REPORTS`, so the consideration review can ship weekly by
email/Slack with no extra code.

**Explore builder:** new metric **`intent_score`** (weighted intent, aggregated with the same weights) and new
dimension **`qualification_tier`** (hot/warm/cold per `fp_id`, joining `affiliate_clicks` for the click weight) —
so the Explore tab can answer "which retailers/source do hot visitors come from?" without a new report.

**Visual language (why these charts).** Deliberately distinct from the other tabs while reusing their idioms: a
hand-rolled **funnel gauge** (width IS the message; server-rendered, zero client JS) · an **action × bucket
heatmap** in the Devices-tab tint idiom, keyed to behaviour instead of price tier · a **three-band thermometer**
where a fat pale cold tail reads as a content problem · a **pair chord** (arcs = devices, chords = runs) that makes
rivalries — the tab's unique object — the primary visual · a **depth ledger table** with two purpose-built ratios
and a temperature pill · a **prescriptive queue** with issue pills and deep links. Every chart ships a caption that
states how to read it, and every card carries an ℹ `MetricInfo`.

**Known reads / caveats (all surfaced in the UI):**

- Stage counts are **distinct visitors per stage, not a strict sequence** — a visitor who saves *and* compares
  appears in both bars; the story is the shrinkage between them, not a classical sequential funnel.
- Intent ratios divide by small numbers on quiet pages — the depth table caption says to trust
  `intent/100 views` and `clicks/100 intent` only on devices with 5+ views / 3+ intent points.
- `compare runs` require the visitor to land on `/compare?devices=a,b` with `fp_id` set; beacon-blocked
  browsers still appear in `browsers` (page views) but never in `savers`/`comparers`, which inflates the funnel's
  top rather than its ratios.
- Pair slugs are matched against the catalog; pairs touching an unpublished or renamed device are counted as
  **lopsided or half-dead** and pushed to the queue instead of being hidden.

## 8. Open Questions (for architecture review)

1. **FP-id vs cookieless**: ✅ **Resolved in Phase 2** — first-party `fweezy_fp` cookie (395 days, SameSite=Lax, PII-scoped per Kenya DP Act, no third-party trackers), with Phase 5 expunge-on-request + retention TTL as the governance layer.
2. **Earnings import mechanism**: 🔶 **Partial** — `affiliate_commission_rates` + `affiliate_earnings` ledger and the reconciliation UI are live (Phase 3); CSV-upload + network-API importers remain Phase 6 work.
3. **Role matrix**: ✅ **Resolved in Phase 5** — owner/admin manage alert rules + retention actions; editor/viewer are read-only (enforced in both the API routes and the client panels).
4. **GA4-strictness vs Fweezy-owned**: keep `ga4_alias` as *reference only*, with Fweezy-owned metrics (revenue proxy, qualification score) as first-class — confirmed: no literal GA4 API parity needed.

---

*End of plan — ready for architecture review prior to implementation.`seedgraph.cypher` was used as a reference only and was not modified.*