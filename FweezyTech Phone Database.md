# **FweezyTech Phone Database, Automated Specification Importer & Fair Phone Ranking System** 

## **0. PROJECT OBJECTIVE** 

I am building FweezyTech, a technology website that includes a phone database, device pages, comparisons, reviews, buying guides, and a Fair Phone Ranking system. 

The current website already has: 

- A public-facing website 

- An admin area 

- An existing device/phone entry form 

- A Draft section 

- A Published section 

- Public device pages 

- A Fair Phone Score/ranking system 

The goal of this development is to significantly improve the existing phone-data workflow without replacing the existing admin experience. 

The biggest problem currently is that manually entering every phone specification into the existing admin form is extremely time-consuming. 

I want to introduce an automated specification-import system that can retrieve phone specifications from configured external sources, normalize the information into the FweezyTech database structure, populate the existing admin form, and place the imported device into the existing **Draft** section. 

The administrator will then: 

1. Review the imported information. 

2. Correct anything that is wrong. 

3. Add images. 

4. Verify the device. 

5. Manually publish it. 

**Imported data must NEVER automatically become publicly visible.** 

The overall architecture should be: 

**External Sources → Import Engine → FweezyTech Database → Existing Admin Form/Draft → Admin Verification → Images → Publish → Public Website → Fair Phone Ranking** 

The most important principle is: 

**External sources provide data. The FweezyTech database is the source of truth. The administrator has final authority over the data.** 

# **1. DEVICE IDENTITY & BASIC INFORMATION** 

The existing admin form currently contains these fields and they must remain available. 

### **1a. Name** 

The official/common commercial device name. 

Example: 

- Samsung Galaxy S26 Ultra 

- Xiaomi 17 Pro 

- OnePlus 14 

The importer should attempt to retrieve the correct official model name. 

### **1b. Slug** 

The URL-friendly version of the device name. 

Example: 

```
Samsung Galaxy S26 Ultra
```

becomes: 

```
samsung-galaxy-s26-ultra
```

The slug should be generated automatically where possible, but the admin must be able to edit it. 

The slug must be unique. 

### **1c. Brand** 

Examples: 

- Samsung 

The second major deliverable adds a deterministic scoring engine on top of the unified phone database. This system is documented in `FweezyTech Device Ranking System.md` and backed by `src/lib/ranking/`. Full implementation status is summarized in `docs/phone-database-field-mapping.md` (Phase 0 field-mapping) and itemized in `src/lib/devices/import-agent/core.ts` (deliverable inventory).

## Implementation status

**Phase 0 — Field mapping** (`docs/phone-database-field-mapping.md`): existing `devices` JSONB columns ↔ canonical typed schema ↔ new tables; plus ranking-relevant fields extraction map.

**Phase 1 — Migrations**
- `src/lib/db/migrations/042_phone_database_sources.sql` — `sources` (seeded priority order: manufacturer > structured API > gsmarena > nanoreview > fweezytech-admin), `device_spec_sources` (field-level provenance), `device_source_raw_data`, `import_runs`, `device_changes` (audit), plus `devices` additions (`model_number`, `variant_label`, `region`, `parent_device_id`, `import_status`, `verified_at`).
- `src/lib/db/migrations/043_ranking_engine.sql` — `chipsets`, `device_processor_specs`, `chipset_benchmarks` (median-aggregated, never cherry-picked), `ranking_benchmarks` (dynamic global benchmarks, admin-overridable, auto-updatable), `ranking_formula_versions`, `device_rankings` (full deterministic breakdown; public visibility tied to device status).
- `src/lib/db/migrations/044_youtube_import_source.sql` — registers the YouTube channel as a first-class `sources` row (priority 25, adapter-less by design) so review-derived fields carry real provenance and the admin can disable/re-prioritise the channel from `/admin/sources`.
- `src/lib/db/migrations/045_device_type_aliases.sql` — adds `device_types.aliases TEXT[]` and seeds model-family vocabulary per type. The major-category taxonomy vocabulary is **data, not code**: an admin teaches the detector a new model family without a deploy.

**Phase 1b — Dynamic major-category resolution** (`src/lib/devices/category-detect.ts`)
- `loadMajorTaxonomy`, `detectMajorCategory`, `resolveMajorCategory`. Reads the live `device_types` table (migration 019 + 045), matches whole-word vocabulary, and honours a Groq `majorCategoryHint` **only** when it validates against a live taxonomy slug.
- Nothing is hardcoded: a TV review files under `televisions`, headphones/soundbars/speakers under `sound`, MacBooks/iMacs under `macs`, phones/tablets/watches under `phones`. `null` is a valid answer (the taxonomy has no match) because `devices.major_category` is nullable — the detector never guesses.
- `applyImport` gained `majorCategory` / `deviceTypeId` arguments (replacing the previous hardcoded `major_category: 'phones'`), and both `/import/apply` and the bulk YouTube path resolve the category through this module.

**Phase 1c — Merged YouTube → spec-agent pipeline** (the "true merger of sources")
- `src/lib/devices/import-agent/youtube.ts` — `analyzeYouTubeVideo` turns **one** video into a device candidate: name from the video title (regex + Groq Device Analyzer), major category from the live taxonomy, and any canonical specs the creator wrote into the description (via the zod-gated `extractSpecsFromText`). `candidateToSnapshot` emits the same `SpecSnapshot` the Phone Database adapters emit, so YouTube flows through the **identical** import-agent pipeline (preview → merge → conflicts → provenance → import_runs).
- No transcript is fetched — YouTube's caption API needs OAuth, so the mined text is title + description, and the spec agent on the create form supplements everything else.
- `POST /api/admin/devices/import/youtube` — **scan-only, zero DB writes**: returns per-video candidates with `name`, `majorCategory`, `specs` and `providedPaths` (what the video actually stated).
- `YouTubeImportModal` — step 1 scan (latest or wider), step 2 pick a device, step 3 hands off to the create form. A secondary link still queues a background whole-channel scan.
- `src/app/admin/devices/create/page.tsx` — reads the `?yt=` payload, shows a loading screen, then stages the device via the **same** `fweezy:prefill-apply` event the AI assistant and the Import Specifications panel use (one staging code path, zero duplication). The admin can also type a name from scratch or edit the resolved one, then press **2. Import specifications** to let the agent fill the gaps, and **3. Save as draft**.

**Phase 2 — Canonical spec schema & normalization**
- `src/lib/devices/spec-schema.ts` (195 lines) — zod schemas for all 9 spec sections; `validateSpecs` gate (drops failing sections entirely).
- `src/lib/devices/spec-normalize.ts` (206 lines) — pure parsers (never throw, never invent; unknown never coerced to No; empty = null).

**Phase 2b — Pasted-sheet extraction contract** (fixes "0 fields found / 47 missing")
- **Root cause.** The brain's extraction schema (`z.record(z.string(), …)`) accepted any key names and left units attached to values, while `validateSpecs` demands exact canonical keys with `z.number()`. A real OnePlus 15 URL paste therefore came back as `{ Height: "161.42 mm", Size: "17.23 cm (6.78 inches)", … }`; zod stripped every unknown key and rejected every unit-bearing number, so the merge produced 0 leaves and the panel reported "47 missing" as if the sheet were empty.
- `src/lib/devices/import-agent/text-specs.ts` (145 lines) — the extraction schema now mirrors the canonical section schemas (exact key names, camera as a `rear[]/selfie[]` array), plus `TEXT_SPECS_FIELD_DICTIONARY`: the key/unit/shape dictionary injected into the prompt so the model emits `height_mm` (not `Height`) and keeps `"161.42 mm"` as a string.
- `src/lib/devices/import-agent/normalize-extract.ts` (289 lines) — deterministic `normalizeExtraction` (units stripped, resolution split from one `"2772x1272"` field, refresh takes the max of `"1-120Hz Adaptive, Maximum 165Hz"`, HDR/adaptive-refresh classified, camera units mapped one by one). Never throws, never invents; unusable values become null and their section is reported as dropped.
- `src/lib/devices/import-agent/brain.ts` — `extractSpecsFromText` now returns `{ extraction } | { failure }` (`no_key` / `circuit_open` / `too_short` / `llm_error`) instead of a silent `null`, and the prompt carries the field dictionary at temperature 0 over a 12k-char window.
- `ExtractionDiagnostics` (exported from `run.ts`) travels with the fetch response: `attempted`, `failureReason`, human `message`, `droppedSections`, `rejectedSections`. `SpecImportPanel` renders it as a warning block, and `Apply to this form` / `Save as draft` are disabled when `fieldsImported === 0` with the reason in the tooltip — a pipeline failure can no longer masquerade as an empty sheet (§14).
- `src/lib/devices/spec-normalize.ts` fixes found by the regression test: `inches()` now prefers the inch-marked figure (`"17.23 cm (6.78 inches)"` → 6.78, not 17.23) and rejects implausible sizes; `tri()` recognises `enabled / available / present / built-in` as yes and `not supported / absent / disabled` as no; `mentionsInfrared()` maps an "Infrared remote control" description to yes.
- `src/scripts/verify-spec-extraction.ts` (199 lines) — regression fixture reproducing the OnePlus 15 sheet end-to-end through `normalizeExtraction` → `validateSpecs`; **40/40 assertions pass** (`npx tsx src/scripts/verify-spec-extraction.ts`).

**Phase 3 — Import agent engine** (`src/lib/devices/import-agent/`, 2249 lines across 14 files)
- Orchestrator: `run.ts` (687 lines) — 4-step pipeline (search → fetch → preview → apply), Draft-only upsert, provenance, raw payload, import_runs, agent_run_log, chipset linking + optional NanoReview benchmark enrichment, extraction diagnostics.
- Brain: `brain.ts` (135 lines) — Groq `resolveBestMatch` (match disambiguation, circuit breaker) + `extractSpecsFromText` (field-dictionary prompt, zod-gated, temperature 0, typed failure reasons).
- Merge: `merge.ts` (86 lines) — priority merge + conflict detection + manual-override protection.
- Dedupe: `dedupe.ts` (118 lines) — slug / model-number / name-similarity (Jaccard ≥ 0.82).
- Provenance: `provenance.ts` (131 lines) — 6 functions: `resolveSourceId`, `getManualOverridePaths`, `upsertProvenance`, `saveRawSourceData`, `recordManualOverride`, `recordChange`.
- Adapters: `mobileapi.ts` (249), `gsmarena.ts` (299), `manufacturer.ts` (93), `nanoreview.ts` (90) — all implementing `SourceAdapter`.
- Types: `types.ts` (84), public surface: `index.ts` (31).
- Circuit breaker: `src/lib/devices/ai-extract.ts` (`isGroqCircuitOpen`, `recordGroqSuccess`, `recordGroqFailure`) — Redis-backed, 3-trip threshold, 300s TTL.

**Phase 4 — Ranking engine** (`src/lib/ranking/`, 1039 lines across 4 files)
- `config.ts` (155) — FTS-1.0 all factor tables + thresholds (Build 10 / Display 20 / Performance 25 / Cameras 25 / Battery 20).
- `formula.ts` (477) — all 5 category scorers + 3-state proration logic + confirmed-absence handling.
- `benchmarks.ts` (57) — median chipset benchmark aggregation policy.
- `engine.ts` (350) — `computeRanking` (pure/deterministic), `recalculateDevice`, `refreshAutoBenchmarks` (ripple-carry recalc), `isRankingRelevantChange`, `loadGlobalBenchmarks`, `loadChipsetForDevice`.

**Phase 5 — Admin API routes**
- Import: `src/app/api/admin/devices/import/{search,specs,apply}/route.ts` — 3-step preview-then-apply, admin auth + role check (viewer=403), Draft-only.
- Sources CRUD: `src/app/api/admin/sources/route.ts` + `src/app/api/admin/sources/[id]/route.ts`.
- Ranking: `src/app/api/admin/ranking/{recalculate,benchmarks,breakdown/[id]}/route.ts`.
- Provenance/history: `src/app/api/admin/devices/[id]/provenance/route.ts` + audit + recalc hooks in `src/app/api/admin/devices/route.ts` and `src/app/api/admin/devices/[id]/route.ts`.

**Phase 6 — Admin UI** (extends existing create/edit forms)
- `src/components/admin/SpecImportPanel.tsx` (447) — 3-step wizard (search → matches → conflict/duplicate preview → apply to form / as draft device).
- `src/components/admin/RankingBreakdownPanel.tsx` (226) — full FTS-1.0 component breakdown for admin.
- `src/components/admin/ProvenancePanel.tsx` (394) — field-level source provenance + verification status + change history.
- `src/app/admin/sources/page.tsx` (300) — sources list + CRUD UI.
- `src/app/admin/devices/create/page.tsx` and `src/app/admin/devices/[id]/edit/page.tsx` — embedded panels, prefill-merge via `src/lib/chat/prefill-apply.ts` + `src/lib/chat/prefill-schemas.ts`, `src/lib/devices/form-mapping.ts` (canonical → admin form prefill, 287 lines).

**Phase 7 — Public surface + validation**
- Public device pages show single FweezyTech Score; `src/app/devices/score-methodology/page.tsx` documents FTS-1.0.
- `src/scripts/run-migrations.ts` includes steps 042 and 043.
- `npx tsc --noEmit` passes clean (EXIT=0).

**Non-negotiables carried from both specs:** Draft-only imports, admin final authority, never invent specs, manual overrides protected, sources replaceable, public site independent of external sources, ranking reads only from FweezyTech DB, no launch-era score freezing.

## Verified non-implementation

The Ripple-Carry protocol (episodic task memory / `ripple.ftMessage` / `Application/vnd.fwt-ripple` / `wbsaitss protocol`) is not part of this codebase — confirmed absent via codebase search. The FweezyTech Phone Database + Device Ranking System implementation is a standard Next.js + Supabase application with no separate RPC/protocol layer.

- Apple 

- Xiaomi 

- OnePlus 

- Google 

- OPPO 

- vivo 

- HONOR 

The importer should normalize brand names so that minor naming differences do not create duplicate brands. 

### **1d. Release Year** 

The year the device was released. 

Store this as structured data rather than relying only on formatted text. 

### **1e. Major Category** 

Keep the existing field. 

For this implementation, the main category is: 

```
Phones
```

The database should still be designed so additional categories can be added later. 

### **1f. Device Type** 

Keep the existing field. 

Examples: 

- Smartphone 

- Foldable 

- Flip phone 

Do not remove this field even if the current system primarily contains smartphones. 

### **1g. Price in KES** 

**Keep this field in the admin interface and database.** 

However, automated specification importing must **NOT populate or modify this field at launch** . 

Do not: 

- Automatically search Kenyan retailers for the price. 

- Automatically convert another currency into KES. 

- Automatically calculate a KES price. 

- Automatically update this field from external phone-specification sources. 

This field will be handled separately in the future. 

### **1h. Price in USD** 

**Keep this field in the admin interface and database.** 

However, automated specification importing must **NOT populate or modify this field at launch.** 

Do not automatically convert KES into USD. 

This field is being retained because international pricing and retailer/affiliate functionality will be added later. 

### **1i. Price Segment** 

The existing price-segment space can remain in the database/admin structure if it already exists, but **do not use price segment as part of the automated phone import or Fair Phone Ranking system.** 

The Fair Phone Score must be based on hardware specifications, not the retail price. 

# **2. DESIGN & BUILD** 

Preserve the existing design/build fields in the admin form. 

### **2a. Dimensions** 

Store: 

- Height in mm 

- Width in mm 

- Thickness in mm 

Where the source provides dimensions in another unit, normalize them into millimetres. 

### **2b. Weight** 

Store weight in grams. 

Example: 

```
214 g
```

Internally, preferably store the numerical value: 

```
214
```

with the unit defined by the schema. 

### **2c. Front Screen Glass Protection** 

Examples: 

- Gorilla Glass Victus 2 

- Gorilla Glass 7i 

- Ceramic Shield 

- Dragontrail 

If unknown, leave empty. 

Do not guess the glass generation. 

### **2d. Back Material / Protection** 

Examples: 

- Glass 

- Gorilla Glass 

- Vegan leather 

- Plastic 

- Ceramic 

If both material and protection are available, preserve both where appropriate. 

### **2e. Side Frame Material** 

Examples: 

- Aluminium 

- Titanium 

- Stainless steel 

- Plastic 

Do not infer frame material from the device's price or product positioning. 

### **2f. Ports** 

Examples: 

- USB Type-C 

- USB Type-C 3.2 

- USB Type-C 3.2 Gen 2 

- 3.5 mm headphone jack 

Preserve useful technical information where available. 

### **2g. Speakers** 

Examples: 

- Stereo speakers 

- Stereo speakers + Dolby Atmos 

Do not claim Dolby Atmos merely because the phone has stereo speakers. 

Only populate information supported by a source. 

### **2h. Colours** 

Store the officially available colours identified by the source. 

Multiple colours should be stored in a structured way where possible while still being displayed correctly in the existing admin form. 

### **2i. IP Rating** 

Examples: 

- IP54 

- IP67 

- IP68 

- • IP69 

If no official IP rating is found, leave the field empty. 

**Do not infer water resistance from marketing language.** 

# **3. DISPLAY** 

### **3a. Display Size** 

Store display size in inches. 

Example: 

```
6.82
```

### **3b. Display Type** 

Examples: 

- OLED 

- AMOLED 

- LTPO AMOLED 

- IPS LCD 

Preserve useful display technology information. 

### **3c. Resolution** 

Store: 

- Resolution width 

- Resolution height 

Example: 

```
1080 × 2400
```

Internally, numerical values should preferably be stored separately while the existing admin interface can display them in its current format. 

### **3d. Refresh Rate** 

Store refresh rate in Hz. 

Example: 

```
120 Hz
```

If the display supports adaptive refresh rates, preserve that information. 

### **3e. Pixel Density** 

Store PPI as a numerical value. 

Example: 

```
450
```

### **3f. Screen-to-Body Ratio** 

Store as a percentage where available. 

If unavailable, leave empty. 

Do not calculate it from inaccurate/incomplete dimensions unless the implementation has a reliable calculation method. 

### **3g. Peak Brightness** 

Store peak brightness in nits. 

Example: 

```
3,000 nits
```

Do not confuse: 

- typical brightness 

- high-brightness mode 

- peak brightness 

- outdoor brightness 

Where multiple values exist, map the correct value to the correct field. 

### **3h. HDR** 

Examples: 

- HDR10 

- HDR10+ 

- Dolby Vision 

Only list formats supported by reliable source information. 

### **3i. Color Depth** 

Examples: 

- 8-bit 

- 10-bit 

- 1.07 billion colours 

If a source gives both bit depth and colour count, preserve the useful information. 

### **3j. Screen Protection** 

This refers to the display protection layer and should be kept separate from the general frontglass/build field where appropriate. 

Example: 

```
Gorilla Glass 7i
```

# **4. PERFORMANCE & MEMORY** 

This section combines processor and memory information. 

## **4a. Chipset** 

Examples: 

- Snapdragon 8 Elite 

- Dimensity 9500 

- Apple A19 Pro 

The chipset should ideally reference a centralized chipset table so that the same processor is not entered repeatedly for every device. 

## **4b. CPU** 

Store the CPU information supplied by the source. 

Example: 

```
Octa-core (1x4.32 GHz + 3x3.53 GHz + 4x2.8 GHz)
```

Do not fabricate clock speeds. 

## **4c. GPU** 

Store GPU information. 

Example: 

```
Adreno XXXX
```

If unavailable, leave empty. 

## **4d. Node Size** 

Store semiconductor process node where available. 

Example: 

- `3 nm` 

Do not infer node size from the chipset generation. 

## **4e. NPU** 

Store NPU information where available. 

If the source does not provide reliable NPU information, leave empty. 

Do not invent a generic "AI engine" specification and treat it as an NPU. 

## **4f. RAM** 

RAM options must support multiple configurations. 

Example: 

`8 / 12 / 16 GB` Internally, preferably store these as separate numerical values. 

The existing admin UI can continue displaying them separated by `/` . 

## **4g. RAM Type** 

Examples: 

- LPDDR5 

- LPDDR5X 

- LPDDR5T 

## **4h. Storage** 

Support multiple storage configurations. 

Example: 

```
128 / 256 / 512 GB
```

Internally, store these as separate options. 

## **4i. Storage Type** 

Examples: 

- UFS 3.1 

- UFS 4.0 

- NVMe 

## **4j. Expandable Storage** 

The existing admin format should remain compatible with: 

```
Yes, 2TB
```

or: 

```
No
```

Internally, preferably separate: 

- expandable: boolean 

- maximum supported SD capacity: numerical value 

# **5. CAMERAS & VIDEO** 

#### **ALL CAMERA-RELATED INFORMATION MUST BE UNDER THIS ONE MAIN SECTION.** 

Do not split cameras, video, selfie cameras, and camera extras into separate top-level sections. 

The system must support a dynamic number of camera lenses. 

## **5a. Rear Camera Lenses** 

Rear cameras must be stored individually. 

Each rear camera should support: 

- Lens type 

- Megapixels 

- Sensor type 

- Sensor size 

- Aperture 

- OIS 

- Focal length 

- Field of view 

- Periscope 

- Optical zoom 

The system must support adding/removing rear-camera lenses through the existing plusbutton/dynamic UI. 

Examples of lens types: 

- Main 

- Ultrawide 

- Telephoto 

- Periscope telephoto 

- Macro 

- Depth 

- Monochrome 

Do not assume that every phone has the same number of cameras. 

## **5b. Rear Camera Megapixels** 

Store megapixel value numerically. 

Example: 

```
200 MP
```

## **5c. Rear Camera Sensor Type** 

Examples: 

- Sony IMX890 

- Samsung ISOCELL HP2 

If the sensor is unknown, **leave this field empty** . 

Never guess the sensor from megapixel count. 

## **5d. Rear Camera Sensor Size** 

Examples: 

- 1/1.3" 

- • 1/1.56" 

If unknown, leave empty. 

## **5e. Aperture** 

Store the aperture where available. 

Example: 

```
f/1.7
```

## **5f. OIS** 

Store whether the camera has optical image stabilization. 

If the source does not confirm OIS, do not assume it exists. 

If there is no OIS, the existing UI can leave the OIS field blank according to the current form behavior. 

## **5g. Focal Length** 

Store focal length in mm where available. 

Example: 

```
23 mm
```

## **5h. Ultrawide Field of View** 

For ultrawide cameras, store field of view in degrees where available. 

Example: 

```
120°
```

Do not fabricate FOV. 

## **5i. Periscope Telephoto** 

If a telephoto camera is a periscope camera, explicitly identify it as a periscope. 

Also store optical zoom. 

Example: 

```
Periscope, 5x optical zoom
```

## **5j. Optical Zoom** 

Store the actual optical zoom supported by the lens. 

Do not confuse optical zoom with: 

- Hybrid zoom 

- Digital zoom 

- Marketing zoom claims 

## **5k. Selfie Cameras** 

Selfie cameras should use the same structured approach as rear cameras. 

Support: 

- Megapixels 

- Sensor type 

- Sensor size 

- Aperture 

- OIS where applicable 

- Focal length where available 

- Other useful camera information 

The system must support multiple front cameras where a device has them. 

## **5l. Rear Video** 

Store supported rear-camera video modes. 

Examples: 

- 8K at 30fps 

- 4K at 60fps 

- 4K at 30fps 

- 1080p at 240fps 

Do not invent video modes. 

## **5m. Front Video** 

Store supported selfie-camera video modes. 

Examples: 

- 4K at 60fps 

- 4K at 30fps 

- 1080p at 60fps 

## **5n. Video Features** 

Store supported features such as: 

- 10-bit HDR 

- Dolby Vision 

- Log video 

- Pro video 

- Cinematic modes 

- Slow motion 

- Action stabilization 

Only populate features confirmed by a reliable source. 

## **5o. Camera Extras** 

Keep a flexible field for camera-related extras. 

Examples: 

- Hasselblad partnership 

- Leica partnership 

- ZEISS partnership 

- Camera-specific processing technology 

Do not treat partnerships as proof of camera quality. 

# **6. BATTERY & CHARGING** 

### **6a. Capacity** 

Store battery capacity in mAh. 

Example: 

```
5200 mAh
```

Do not confuse rated capacity and typical capacity if a source provides both. 

### **6b. Battery Type** 

Examples: 

- Lithium-ion 

- Silicon-carbon 

Preserve the actual battery technology where available. 

### **6c. Wired Charging** 

Store maximum supported wired charging speed in watts. 

Example: 

```
100 W
```

Do not calculate charging speed from charging time. 

### **6d. Wireless Charging** 

Store maximum wireless charging speed. 

Example: 

```
50 W
```

If unavailable/not supported, preserve that appropriately. 

The ranking system should be capable of penalizing the absence of relevant hardware. 

### **6e. Reverse Wireless Charging** 

Store reverse wireless charging speed where available. 

Example: 

```
10 W
```

If unsupported, represent it as absent rather than inventing a value. 

### **6f. Charging Protocols** 

Examples: 

- USB Power Delivery 

- PD 3.0 

- PPS 

- SuperVOOC 

- proprietary charging technologies 

- MagSafe 

Only include protocols supported by the device. 

# **7. CONNECTIVITY** 

### **7a. Wi-Fi** 

Example: 

```
802.11 a/b/g/n/ac/6e/7
```

Store available Wi-Fi standards. 

### **7b. Bluetooth** 

Example: 

```
Bluetooth 6.0, A2DP, LE
```

### **7c. NFC** 

Boolean: 

- Yes 

- No 

Do not assume NFC based on region or model family. 

### **7d. USB** 

Example: 

```
USB Type-C 3.2
```

Preserve the actual USB standard where available. 

### **7e. Positioning** 

Examples: 

- GPS 

- Galileo 

- GLONASS 

- BeiDou 

- NavIC 

- QZSS 

### **7f. IR Blaster** 

Boolean: 

- Yes 

- No 

Only mark yes when confirmed. 

# **8. NETWORK & SIM** 

### **8a. SIM** 

Examples: 

- Dual SIM 

- Nano-SIM 

- eSIM 

- Nano-SIM + eSIM 

- Dual eSIM 

Regional differences must be preserved. 

### **8b. Network Technology** 

Examples: 

- GSM 

- HSPA 

- LTE 

- 5G 

### **8c. 2G Bands** 

Store supported 2G bands. 

### **8d. 3G Bands** 

Store supported 3G bands. 

### **8e. 4G Bands** 

Store supported 4G bands. 

### **8f. 5G Bands** 

Store supported 5G bands. 

Where available, distinguish: 

- SA 

- NSA 

- Sub-6 GHz 

- mmWave 

### **8g. Regional Variants** 

This is important. 

A phone may have different: 

- chipsets 

- RAM/storage 

- SIM configurations 

- cameras 

- network bands 

- charging 

- software 

- connectivity 

depending on region. 

Do not blindly merge materially different variants into one record. 

The database should support model/region/variant identification. 

# **9. SOFTWARE & UPDATES** 

### **9a. Operating System** 

Example: 

```
Android 16
```

or: 

```
iOS 27
```

### **9b. UI Layer** 

Examples: 

- One UI 

- OxygenOS 

- HyperOS 

- ColorOS 

- Nothing OS 

### **9c. Major OS Upgrades** 

Store the manufacturer's promised major OS upgrade period. 

Example: 

- `7 years` 

Do not confuse promised support with the number of updates already received. 

### **9d. Security Patches** 

Store the promised security-support period. 

Example: 

- `5 years` 

If a manufacturer provides a different support policy, preserve the actual information. 

# **10. DATA IMPORT & EXTERNAL SOURCES** 

This is the core new functionality. 

The importer must be modular. 

Do **not** build the entire system around one website, one scraper, or one API. 

The architecture should support multiple external sources through independent adapters. 

The fundamental architecture is: 

**External Source → Source Adapter → Import Engine → Normalization → Validation → Draft Device → Existing Admin Form** 

## **10a. Initial External Sources** 

The system should be designed to support the following sources: 

### **Source A — Structured Phone Specification API** 

Use a reliable structured device-specification API as a primary automated source where available. 

The developer should choose an appropriate API based on: 

- coverage 

- accuracy 

- available fields 

- reliability 

- API limits 

- licensing/usage terms 

- commercial suitability 

The API provider must be configurable rather than hard-coded into the entire application. 

### **Source B — GSMArena** 

GSMArena can be used as a secondary phone-specification source where technically and legally appropriate. 

#### Important: 

Do not build the entire application around a specific unofficial GSMArena scraper. 

GSMArena access should exist behind its own source adapter so the implementation can be replaced if: 

- the website structure changes 

- rate limits change 

- access becomes unavailable 

- the project later gets an approved API/data source 

- licensing/usage requirements change 

Do not assume or claim that scraping/redistribution is permitted. 

### **Source C — NanoReview** 

Use NanoReview primarily for: 

- chipset identification 

- processor specifications 

- performance-related information 

- other relevant chipset information where available 

It should also have its own source adapter. 

### **Source D — Manufacturer Sources** 

Where reliable manufacturer information is available, manufacturer-published specifications should generally receive higher authority for specifications directly published by the manufacturer. 

Examples: 

- battery capacity 

- charging 

- display 

- camera hardware 

- IP rating 

- software-support promises 

However, the source priority must remain configurable. 

# **11. SOURCE MANAGEMENT SYSTEM** 

Create a source-management layer in the backend. 

Each source should have: 

- Source ID 

- Source name 

- Source type 

- Base URL 

- API endpoint where applicable 

- Authentication requirements 

- Active/inactive status 

- Priority 

- Supported fields/categories 

- Adapter name 

- Last successful retrieval 

- Last failed retrieval 

- Error status 

- Created date 

- Updated date 

API keys and credentials must be stored securely on the server. 

**Never expose API keys in frontend JavaScript.** 

## **11a. Configurable Source Priority** 

The source priority must not be permanently hard-coded. 

An initial suggested hierarchy is: 

1. Manufacturer 

2. Trusted structured specification API 

3. GSMArena 

4. NanoReview/other secondary sources 

5. FweezyTech manual correction 

But this should be configurable. 

## **11b. Source Adapters** 

Each source must have its own adapter. 

Conceptually: 

```
                    FweezyTech Import Engine
                              |
              +---------------+---------------+
              |               |               |
              ↓               ↓               ↓
          API Adapter    GSMArena Adapter  NanoReview Adapter
              |               |               |
              ↓               ↓               ↓
          External API      GSMArena       NanoReview
```

The rest of the application should not care how the source retrieves the data. 

This allows individual sources to be replaced without rebuilding the database or ranking system. 

# **12. DEVICE IMPORT WORKFLOW** 

The admin should be able to use the existing admin interface to start an import. 

Preferred workflow: 

**Admin → Add Device → Search External Sources → Select Device → Import → Existing Device Form → Save as Draft** 

## **12a. Search** 

Admin enters: 

- Brand 

- Device name 

- Model number where available 

The importer searches the configured sources. 

## **12b. Device Matching** 

The system should return possible matches. 

Example: 

```
Samsung Galaxy S26 Ultra
Samsung Galaxy S26 Ultra International
Samsung Galaxy S26 Ultra US
Samsung Galaxy S26 Ultra 12/256
Samsung Galaxy S26 Ultra 16/512
```

The admin must be able to choose the correct model/variant. 

Do not automatically assume that the first search result is correct. 

## **12c. Import** 

After selecting the correct device, the system retrieves available specifications. 

It should: 

1. Retrieve source data. 

2. Preserve the raw source response where possible. 

3. Normalize the data. 

4. Map it to the FweezyTech schema. 

5. Identify conflicts. 

6. Identify missing fields. 

7. Detect potential duplicates. 

8. Prepare the device as a **Draft** . 

## **12d. Existing Admin Form** 

The importer should populate the **existing FweezyTech device-entry form** . 

Do not create an entirely separate device-management interface unless absolutely necessary. 

The goal is: 

**Import data → populate existing form → admin reviews/edits → save** 

The existing manual entry process must continue working. 

If the admin wants to manually create a phone without importing anything, they should still be able to do so exactly as before. 

# **13. DRAFT, VERIFICATION & PUBLISHING WORKFLOW** 

This is a critical part of the implementation. 

The website already has separate: 

- Draft section 

- Published section 

The imported device must enter the **Draft section** . 

### **The lifecycle must be:** 

```
External Sources
       ↓
     Import
       ↓
     DRAFT
       ↓
Admin Verification
       ↓
```

```
Corrections
       ↓
Images Added
       ↓
Verified / Ready to Publish
       ↓
Admin clicks PUBLISH
       ↓
   PUBLISHED
       ↓
Public Website
```

## **13a. Imported Data Must Always Start as Draft** 

**No imported device may automatically become Published.** 

Even if: 

- every field was successfully imported 

- all sources agree 

- the source is highly trusted 

- the importer is confident 

the device must still be placed into Draft. 

## **13b. Admin Verification** 

The admin should review the imported information using the existing form. 

The admin must be able to: 

- edit values 

- remove incorrect values 

- add missing values 

- keep imported values 

- correct formatting 

- verify variants 

- verify network bands 

- verify camera information 

- verify charging 

- verify software support 

## **13c. Images** 

Imported specification data does not mean the device is ready to publish. 

The admin must manually add the required images. 

The import process should therefore **not publish images automatically** . 

## **13d. Publish** 

Only when the admin explicitly clicks **Publish** should the device become publicly visible. 

Publishing should make it available to: 

- public device pages 

- public comparisons 

- public searches 

- public rankings 

- relevant website sections 

## **13e. Draft Visibility** 

Draft devices must never accidentally appear on: 

- public device pages 

- public search 

- public comparisons 

- public rankings 

- public API endpoints 

- sitemap/public indexing 

unless explicitly intended for an authenticated admin preview. 

# **14. MISSING DATA & DATA QUALITY** 

This rule is extremely important: 

**If information is unavailable, leave the field empty/null. Never invent it.** 

Examples include: 

- sensor size 

- sensor model 

- aperture 

- OIS 

- NPU 

- HDR format 

- brightness 

- charging protocol 

- IP rating 

- 5G bands 

- software support 

The importer must never fill missing information using: 

- guesses 

- averages 

- similar phones 

- previous model information 

- successor model information 

- assumptions based on the chipset 

- assumptions based on marketing claims 

# **15. MULTIPLE SOURCES & CONFLICT RESOLUTION** 

When multiple sources provide the same specification, the importer should compare them. 

Example: 

```
Battery Capacity
Manufacturer: 5200 mAh
API:          5200 mAh
GSMArena:     5000 mAh
```

```
CONFLICT DETECTED
```

The admin should be shown the conflict. 

Possible actions: 

- Keep current value 

- Use Manufacturer 

- Use API 

- Use GSMArena 

- Edit manually 

The system must **never silently overwrite an existing value when sources disagree.** 

# **16. MANUAL OVERRIDES** 

Manual corrections are extremely important. 

If the importer says: 

```
5000 mAh
```

but the admin verifies that the correct value is: 

```
5200 mAh
```

and changes it manually, the system should record that as a **FweezyTech manual override** . 

Future automated imports must not silently overwrite the manual correction. 

The system should know: 

```
Value: 5200
Source: FweezyTech Admin
Override: TRUE
```

rather than simply treating it as another imported value. 

If a future source reports 5000 mAh again, the system should flag the conflict instead of replacing 5200 automatically. 

# **17. SOURCE PROVENANCE** 

Every imported specification should ideally retain information about where it came from. 

For example: 

```
Battery Capacity
Value: 5200 mAh
Source: Manufacturer
Source URL: ...
Retrieved: 2026-09-12
Verification: Pending
Manual Override: No
```

This is important for debugging and future verification. 

The system should support provenance at the field/specification level where practical. 

At minimum, retain: 

- Source 

- Source URL 

- Retrieval timestamp 

- Imported value 

- Verification status 

- Manual override status 

# **18. RAW SOURCE DATA** 

Where permitted by the source and applicable usage terms, retain the raw source response/data used during import. 

This can be stored in a dedicated table such as: 

```
device_source_raw_data
```

Possible fields: 

- ID 

- Device ID 

- Source ID 

- Raw response 

- Retrieved at 

- Source URL 

- Import run ID 

This allows the developer to troubleshoot mapping errors without repeatedly querying external sources. 

# **19. DUPLICATE DETECTION** 

The system must detect potential duplicate devices. 

Use combinations of: 

- Brand 

- Device name 

- Slug 

- Model number 

- Region 

- Variant 

- RAM 

- Storage 

- Release year 

The system should warn the admin before creating a duplicate. 

Example: 

```
Potential duplicate found:
OnePlus 14
Existing device:
OnePlus 14 — Global
Imported device:
OnePlus 14 — Global
[View Existing] [Create Variant] [Continue Anyway]
```

# **20. VARIANT MANAGEMENT** 

The database must support variants. 

Variants may differ by: 

- region 

- chipset 

- RAM 

- storage 

- SIM 

- eSIM 

- camera 

- network bands 

- charging 

- software 

If differences materially affect the hardware specifications or ranking, they must be distinguishable. 

Do not merge two materially different hardware variants into one record simply because they share the same commercial name. 

# **21. DATABASE ARCHITECTURE** 

Use a centralized database, preferably the existing Supabase database if that is what the current website is already using. 

The database should be the source of truth. 

The public website should read from the FweezyTech database rather than directly from external specification sources. 

#### A suggested structure is: 

##### **`devices`** 

- id 

- name 

- slug 

- brand 

- release_year 

- major_category 

- device_type 

- price_kes 

- price_usd 

- status 

- published_at 

- created_at 

- updated_at 

Price fields remain but are not part of the automated specification importer at launch. 

##### **`device_design_specs`** 

- device_id 

- height_mm 

- width_mm 

- thickness_mm 

- weight_g 

- front_glass_protection 

- back_material 

- back_glass_protection 

- frame_material 

- ports 

- speakers 

- colours 

- ip_rating 

##### **`device_display_specs`** 

- device_id 

- size_inches 

- display_type 

- resolution_width 

- resolution_height 

- refresh_rate_hz 

- pixel_density_ppi 

- screen_to_body_ratio_percent 

- peak_brightness_nits 

- hdr 

- color_depth 

- screen_protection 

##### **`chipsets`** 

A centralized chipset database. 

Suggested fields: 

- id 

- name 

- manufacturer 

- cpu 

- gpu 

- node_size_nm 

- npu 

- release_year 

##### **`device_processor_specs`** 

- device_id 

- chipset_id 

- chipset_name if required for compatibility 

- • cpu • gpu 

- node_size_nm 

- npu 

Where possible, avoid duplicating chipset information unnecessarily. 

##### **`device_memory_specs`** 

- device_id 

- ram_type 

- storage_type 

- expandable_storage 

- max_sd_card_gb 

```
device_ram_options
```

• id 

- device_id 

- ram_gb 

##### **`device_storage_options`** 

- id 

- device_id 

- • storage_gb 

##### **`device_cameras`** 

- id 

- device_id 

- position 

- lens_type 

- megapixels 

- sensor_type 

- sensor_size 

- aperture 

- ois 

- focal_length_mm 

- fov_degrees 

- periscope 

- optical_zoom 

`position` should distinguish at minimum: 

- rear 

- front 

##### **`device_video_specs`** 

- device_id 

- rear_video 

- front_video 

- video_features 

This can later be normalized into separate video-mode tables if necessary. 

##### **`device_battery_specs`** 

- device_id 

- capacity_mah 

- battery_type 

- wired_charging_w 

- wireless_charging_w 

- reverse_wireless_charging_w 

- charging_protocols 

##### **`device_connectivity_specs`** 

- device_id 

- wifi 

- bluetooth 

- nfc 

- usb 

- positioning 

- ir_blaster 

##### **`device_network_specs`** 

- device_id 

- sim 

- technology 

- bands_2g 

- bands_3g 

- bands_4g 

- • bands_5g 

##### **`device_software_specs`** 

- device_id 

- os 

- ui_layer 

- major_os_upgrades 

- • security_patch_years 

# **22. SOURCE DATABASE TABLE** 

Create a `sources` table. 

Suggested fields: 

- id 

- name 

- source_type 

- base_url 

- active 

- priority 

- adapter 

- created_at 

- updated_at 

# **23. SOURCE DATA / PROVENANCE TABLE** 

Create a system for tracking which source supplied which specification. 

For example: 

```
device_spec_sources
```

Possible fields: 

- id 

- device_id 

- field_name 

- source_id 

- source_url 

- imported_value 

- retrieved_at 

- verification_status 

- manual_override 

- created_at 

- updated_at 

The exact implementation can differ, but the system must retain provenance. 

# **24. IMPORT RUNS & LOGGING** 

Every import should have an import record. 

For example: 

```
import_runs
```

Fields could include: 

- id 

- device_id 

- source_id 

- started_at 

- completed_at 

- status 

- fields_imported 

- fields_missing 

- conflicts_detected 

- error_message 

This will make troubleshooting much easier. 

# **25. CHANGE HISTORY / AUDIT LOG** 

The system should maintain an audit trail. 

When an administrator changes a specification, record: 

- Device 

- Field 

- Old value 

- New value 

- Changed by 

- Timestamp 

- Reason/source where applicable 

Example: 

```
Samsung Galaxy S26 Ultra
Battery Capacity
Old: 5000 mAh
New: 5200 mAh
Changed by: Admin
Reason: Manufacturer specification verified
Date: ...
```

This is especially important because the database will eventually contain a large number of devices. 

# **26. FAIR PHONE RANKING ENGINE** 

The Fair Phone Ranking system must read specifications from the FweezyTech database. 

The ranking engine must **not directly query GSMArena, NanoReview, manufacturers, or other external sources.** 

Architecture: 

```
Verified FweezyTech Device Data
              ↓
      Fair Phone Formula
              ↓
       Final Score /100
```

External sources only help populate the database. 

## **26a. Public Score** 

The website should display **one final Fair Phone Score out of 100** . 

Do not expose unnecessary sub-scores to normal users. 

The user should see the final score. 

## **26b. Ranking Components** 

The current weighting is: 

### **1. Build Quality — 10 points** 

Based on: 

- IP rating 

- Front glass protection 

- Frame material 

- Back material 

### **2. Display — 20 points** 

Based on: 

- Display type 

- Resolution 

- Refresh rate 

- Peak brightness 

- HDR 

The display section should use the current agreed weighting methodology. 

### **3. Performance — 25 points** 

Performance carries 25 points. 

Processor is the largest component: 

- Processor/chipset: 18 points 

- RAM 

- Storage 

### **4. Cameras — 25 points** 

Camera score considers: 

- Main camera 

- Ultrawide 

- Telephoto 

- Periscope telephoto 

- Macro where applicable 

- Selfie camera 

- Camera hardware quality 

- Sensor information 

- OIS 

- Optical zoom 

- Video capabilities 

- Other meaningful camera hardware 

Camera importance should not simply be based on the number of lenses. 

A phone should not receive a higher camera score merely because it has more cameras. 

### **5. Battery & Charging — 20 points** 

Based on: 

- Battery capacity 

- Wired charging 

- Wireless charging 

- Relevant charging hardware/features 

Do not use real-world battery tests. 

Do not calculate charging time. 

Do not estimate battery life. 

The system should evaluate the hardware specifications provided in the database. 

# **27. MISSING-HARDWARE PENALTIES** 

The ranking system should account for missing relevant hardware. 

For example: 

A premium device that does not have wireless charging should not automatically receive the same Battery & Charging score as a comparable device that has it. 

Likewise, missing hardware/features that materially affect the relevant category should be accounted for within the scoring methodology. 

However: 

**Do not punish a device for a feature that is irrelevant to its category.** 

The exact formula should be implemented consistently and documented internally. 

# **28. ABSOLUTE GLOBAL SCORING SCALE** 

The Fair Phone Score is intended to be an **absolute global score** , not merely a ranking against phones released in the same year. 

The scoring ceiling must evolve as technology improves. 

For example: 

If future processors, displays, cameras, charging systems, etc. become significantly better, the standards used by the scoring system should be capable of being updated. 

Older phones should not be permanently frozen at a score simply because they were once considered flagship hardware. 

The scoring system should reflect the current hardware standards. 

# **29. RANKING VERSIONING** 

The ranking formula must be versioned. 

For example: 

```
Fair Phone Ranking v1
```

Later: 

```
Fair Phone Ranking v2
```

The database should know which formula version produced a score. 

This allows the ranking methodology to evolve without losing historical information. 

The score should conceptually be: 

**Device Data + Ranking Formula Version + Formula = Fair Phone Score** 

The score itself should not be treated as the primary source of truth. 

# **30. SCORE RECALCULATION** 

If the administrator changes a ranking-relevant specification, the Fair Phone Score should recalculate automatically. 

Example: 

Admin changes: 

```
Wireless charging: No
```

to: 

```
Wireless charging: 50 W
```

The ranking engine should detect the relevant change and recalculate the score. 

The admin should **not** manually enter or edit the Fair Phone Score as the authoritative value. 

# **31. DRAFTS AND FAIR PHONE SCORE** 

A Draft device may have a calculated internal score for administrative review. 

However: 

**Draft scores must never be publicly visible.** 

Only published devices should appear in: 

- public rankings 

- public comparisons 

- public device pages 

- public search results 

# **32. PUBLIC WEBSITE DATA FLOW** 

The public website should query the FweezyTech database. 

It should not depend on external specification websites being online. 

Architecture: 

```
External Sources
```

```
       ↓
   Import Engine
       ↓
FweezyTech Database
       ↓
 Admin Draft
       ↓
Admin Verification
       ↓
    Publish
       ↓
 Public Website
       ↓
 Fair Phone Ranking
```

If an external API or website goes offline, the public FweezyTech website should continue working normally. 

# **33. SECURITY** 

All external API credentials must remain server-side. 

Do not expose: 

- API keys 

- private credentials 

- scraping credentials 

- database service-role keys 

in frontend code. 

Use secure server-side API routes/functions for external-source requests. 

# **34. CACHING & RATE LIMITS** 

Do not request external sources every time a user opens a device page. 

External data retrieval should happen during: 

- imports 

- explicit refreshes 

- scheduled backend jobs where appropriate 

Cache source data where legally and technically appropriate. 

Respect: 

- API rate limits 

- robots/terms 

- authentication requirements 

- source usage restrictions 

The public website should never depend on live scraping. 

# **35. FUTURE RETAILER / PRICE SYSTEM** 

Do not implement this yet. 

However, design the database so it can eventually support: 

- Kenyan retailers 

- International retailers 

- Retailer prices 

- Retailer URLs 

- Affiliate URLs 

- Affiliate networks 

- Seller accounts 

- Seller-managed listings 

- Price updates 

Future structure could include: 

```
retailers
```

- id 

- name 

- country 

- website 

- active 

```
device_retailer_listings
```

- id 

- device_id 

- retailer_id 

- region 

- price 

- currency 

- product_url 

- affiliate_url 

- availability 

- updated_at 

# **36. FUTURE KENYAN SELLER INTEGRATION** 

In the future, FweezyTech may communicate with sellers and allow sellers to connect their websites/products to FweezyTech. 

A future seller system could allow: 

**Seller → Their product/price → FweezyTech listing** 

Potentially allowing sellers to update their own: 

- price 

- availability 

- product URL 

Do not build this functionality now. 

Only make the database extensible enough that it can be added later. 

# **37. FUTURE INTERNATIONAL/AFFILIATE LINKS** 

The USD field will eventually be used alongside international buying links. 

For example, international users may eventually see: 

#### **Price in USD → Buy internationally** 

and potentially be directed to services such as Amazon or other international retailers. 

This may eventually generate affiliate commission. 

Do not implement Amazon affiliate functionality at launch. 

Do not automatically populate USD prices from KES. 

Do not implement currency conversion as part of this importer. 

Only prepare the architecture for future retailer/affiliate integrations. 

# **38. ADMIN EXPERIENCE — IMPORTANT** 

The current admin experience must be preserved. 

**Do not replace the existing admin form.** 

First inspect: 

- existing admin UI 

- existing device form 

- existing Draft section 

- existing Published section 

- current database schema 

- current public device page 

- current Fair Phone Score implementation 

- current image upload system 

Then map every existing field to the new database architecture. 

Only after this mapping is complete should implementation begin. 

The goal is to **extend the current system, not rebuild it unnecessarily.** 

# **39. IDEAL ADMIN EXPERIENCE** 

The final workflow should feel approximately like this: 

```
ADMIN
Add Device
[Manual Entry]
[Import Specifications]
```

If the admin chooses Import: 

```
Search Device
Brand: Samsung
Model: Galaxy S26 Ultra
[Search Sources]
```

Then: 

`Potential Matches` ✓ `Samsung Galaxy S26 Ultra Manufacturer GSMArena Specification API` ✓ `Samsung Galaxy S26 Ultra US ...` ✓ `Samsung Galaxy S26 Ultra 12/256 ...` 

Admin selects the correct device. 

Then: 

```
[Import Specifications]
```

The existing device form opens populated with the imported information. 

The admin reviews: 

```
Identity
Design
Display
Performance
Memory
```

```
Cameras
Battery
Connectivity
Network
Software
```

Any conflicts or uncertain fields are clearly identified. The admin corrects anything necessary. Then: `SAVE DRAFT` 

The device appears in: **Admin → Drafts** The admin adds images. The admin verifies everything. Then: 

#### **PUBLISH** 

Only then does it become public. 

# **40. IMPORT PREVIEW / CONFLICT UI** 

Before saving imported data, the system should ideally show what is happening. 

Example: 

`Battery Capacity Existing: — Imported: 5200 mAh Source: Manufacturer [Use Imported] [Edit]` If there is a conflict: `Battery Capacity Manufacturer: 5200 mAh GSMArena:     5000 mAh Existing:     5000 mAh` 

```
[Use Manufacturer]
[Keep Existing]
[Edit Manually]
```

This makes the admin the final decision-maker. 

# **41. DO NOT AUTOMATE THESE THINGS AT LAUNCH** 

The initial implementation should **NOT** automatically: 

- publish devices 

- add final public images 

- set Kenyan retail prices 

- set USD prices 

- convert currencies 

- rank unpublished devices publicly 

- overwrite manual corrections 

- guess missing specifications 

- merge materially different regional variants 

- scrape external websites on every public page load 

- depend on one external source 

- manually enter Fair Phone Scores 

# **42. IMPORTANT DATA PRINCIPLES** 

The implementation must follow these principles: 

### **Principle 1 — FweezyTech Database Is the Source of Truth** 

External sources are inputs. 

They are not the live database. 

### **Principle 2 — Admin Has Final Authority** 

If the administrator corrects imported data, the administrator's value wins. 

### **Principle 3 — Never Invent Specifications** 

Unknown = empty/null. 

### **Principle 4 — Imported Does Not Mean Verified** 

Every imported device begins as Draft. 

### **Principle 5 — Draft Does Not Mean Published** 

Only an explicit admin Publish action makes the device public. 

### **Principle 6 — Public Website Is Independent of External Sources** 

The public site reads from the FweezyTech database. 

### **Principle 7 — Ranking Reads From FweezyTech Data** 

The ranking engine does not retrieve specs from external websites. 

### **Principle 8 — Manual Corrections Must Be Protected** 

Automated imports must not silently overwrite verified FweezyTech corrections. 

### **Principle 9 — Sources Must Be Replaceable** 

The importer must be modular. 

If an API or website stops working, another source can be added without rebuilding the entire system. 

### **Principle 10 — Existing Functionality Must Continue Working** 

Manual device creation and editing must continue to work. 

The importer is an enhancement to the existing system. 

# **43. IMPLEMENTATION ORDER** 

Do not immediately start building the importer. 

First: 

### **Phase 1 — Inspect Existing System** 

Inspect the current: 

- admin form 

- database 

- Draft system 

- Published system 

- image system 

- public device pages 

- comparison system 

- ranking system 

### **Phase 2 — Schema Mapping** 

Create a field-by-field mapping: 

```
Existing Admin Field
        ↓
New Database Field
        ↓
Importer Mapping
        ↓
Ranking Usage
```

Every existing field must have a clear destination. 

Do not remove fields without a specific reason. 

### **Phase 3 — Database** 

Implement the normalized database structure while maintaining compatibility with the existing application. 

### **Phase 4 — Source Layer** 

Implement the source-management system and independent adapters. 

Start with the most reliable/structured source available. 

Then add the other sources. 

### **Phase 5 — Import Engine** 

Implement: 

- search 

- device matching 

- variant detection 

- retrieval 

- normalization 

- conflict detection 

- missing-data handling 

- duplicate detection 

- provenance 

- raw data storage 

### **Phase 6 — Existing Admin Integration** 

Connect the importer to the existing device form. 

Imported data should populate the existing form. 

### **Phase 7 — Draft Workflow** 

Ensure every imported device becomes a Draft. 

Verify that Draft devices cannot accidentally become public. 

### **Phase 8 — Verification & Publishing** 

Integrate with the existing: 

- verification workflow 

- image workflow 

- publish workflow 

The administrator must manually publish. 

### **Phase 9 — Ranking Integration** 

Connect the Fair Phone Ranking engine to the verified/published database data. 

Ensure score recalculation works whenever ranking-relevant specifications change. 

### **Phase 10 — Testing** 

Test at least: 

1. Manual device creation. 

2. Imported device creation. 

3. Partial imports. 

4. Missing specifications. 

5. Conflicting specifications. 

6. Manual corrections. 

7. Manual override protection. 

8. Duplicate detection. 

9. Regional variants. 

10. Multiple RAM options. 

11. Multiple storage options. 

12. Multiple rear cameras. 

13. Multiple selfie cameras. 

14. Video specifications. 

15. Draft saving. 

16. Image addition. 

17. Publishing. 

18. Public visibility. 

19. Ranking recalculation. 

20. External source failure. 

21. API failure. 

22. Invalid source data. 

23. Database failure/retry behavior. 

24. Source provenance. 

25. Audit history. 

# **44. FINAL ACCEPTANCE CRITERIA** 

The implementation is complete only when all of the following are true: 

### **Existing system** 

- Existing manual device entry still works. 

- Existing editing still works. 

- Existing Draft section still works. 

- Existing Published section still works. 

- Existing public device pages still work. 

- Existing image workflow still works. 

### **Importer** 

- Admin can search for a device. 

- Multiple configured sources can be searched. 

- Correct device/variant can be selected. 

- Data can be imported. 

- Imported data populates the existing form. 

- Missing fields remain empty. 

- Conflicts are detected. 

- Duplicate devices are detected. 

- Source provenance is retained. 

- Raw source data can be retained where appropriate. 

### **Draft workflow** 

- Every imported device starts as Draft. 

- Imported devices are never automatically published. 

- Admin can edit imported data. 

- Admin can add images. 

- Admin can verify the device. 

- Admin must explicitly publish it. 

- Draft devices are not publicly visible. 

### **Database** 

- FweezyTech database is the source of truth. 

- Device specifications are structured appropriately. 

- Multiple RAM/storage configurations are supported. 

- Multiple cameras are supported. 

- Regional variants are supported. 

- Source provenance is supported. 

- Manual overrides are supported. 

- Change history is supported. 

### **Ranking** 

- Fair Phone Score is calculated automatically. 

- Score is out of 100. 

- Only the final score is shown publicly. 

- Ranking uses FweezyTech database data. 

- Ranking does not query external sources. 

- Score recalculates when relevant specifications change. 

- Ranking formula is versioned. 

- Draft scores are never publicly displayed. 

- Price is not used in the ranking. 

- Missing hardware/features can be appropriately penalized. 

- No real-world battery tests or charging-time calculations are introduced. 

### **Future readiness** 

The architecture can later support: 

- Kenyan retailers 

- Seller integrations 

- International retailers 

- USD buying links 

- Affiliate links 

- Price updates 

- Seller-managed listings 

- Additional specification sources 

- Additional device categories 

without requiring a complete rebuild. 

# **45. MOST IMPORTANT REQUIREMENT** 

Before writing the importer or changing the database, **inspect the existing FweezyTech website and admin system first.** 

The developer must understand what already exists before modifying it. 

Specifically inspect: 

1. Current admin device form. 

2. Current database schema. 

3. Current Draft functionality. 

4. Current Published functionality. 

5. Current image upload/storage. 

6. Current public device pages. 

7. Current comparison functionality. 

8. Current Fair Phone Score implementation. 

9. Current authentication/admin permissions. 

10. Current API/backend structure. 

Then produce a field mapping between the current system and the proposed architecture. 

**Do not throw away the current admin form and build a new one from scratch.** 

The desired result is an improved version of the existing FweezyTech workflow: 

**Manual Entry OR Automated Import → Existing Admin Form → Draft → Admin Verification → Images → Publish → Public Website → Fair Phone Ranking** 

The system should be built so that FweezyTech can eventually have a large, reliable, structured phone database without requiring the administrator to manually type every specification for every phone. 

