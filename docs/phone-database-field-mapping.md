# FweezyTech Phone Database — Field Mapping

Per spec §45: mapping between the **existing** system and the new architecture
before implementation. Principle: **extend, don't rebuild** — the existing admin
form, JSONB spec sections and draft/publish workflow are kept.

## 1. Existing store → new architecture

| Existing (`devices` table) | New role | Notes |
|---|---|---|
| `name`, `slug`, `brand_id`, `release_year` | Identity | unchanged |
| `model_number`, `variant_label`, `region`, `parent_device_id` *(new, mig 042)* | Variant model (§20) | parent links variants of one commercial name |
| `major_category`, `device_type_id` | Identity | unchanged |
| `price_kes`, `price_usd`, `buy_links` | Manual commerce fields | **not** auto-imported (§21, §37) |
| `status` draft/published | Workflow (§13) | unchanged; imports always land as `draft` |
| `import_status`, `verified_at`, `import_run_id` *(new)* | Import/verification workflow | `imported` → admin verifies → `verified` |
| `specs_design/display/processor/memory/camera/battery/connectivity/network/software` (JSONB) | Canonical spec store | **kept**; internal schema tightened to typed canonical fields (see §3) |
| `score_display/performance/camera/battery/value` (manual 0–10) | **Deprecated** for the Fair Score | retained for now; `scores_overall` is overwritten by the ranking engine |
| `scores_overall` | Final Fair Phone Score | written by the engine from `device_rankings` |

## 2. New tables (migration 042 — phone database)

| Table | Purpose | Spec § |
|---|---|---|
| `sources` | Configurable source registry + priority + health | §10–11 |
| `device_spec_sources` | Field-level provenance, `manual_override` protection | §15–17 |
| `device_source_raw_data` | Raw payload retention | §18 |
| `import_runs` | Per-run metrics: imported/missing/conflicts/dupes | §24 |
| `device_changes` | Change audit (old→new, changed_by, reason) | §25 |

## 3. Canonical JSONB spec fields (internal schema of each `specs_*`)

Typed, null-when-unknown (§14). Parsers in `src/lib/devices/spec-normalize.ts`;
zod schemas in `src/lib/devices/spec-schema.ts`.

- `specs_design`: `height_mm, width_mm, thickness_mm, weight_g, ip_rating, frame_material, back_material, front_glass_protection, colors[], speakers, ports`
- `specs_display`: `size_inches, display_type, resolution_width, resolution_height, refresh_hz, adaptive_refresh ('fixed'|'dynamic'|'ltpo'), peak_brightness_nits, brightness_measured (bool), hdr ('none'|'hdr10'|'hdr10+'|'dolby_vision'|'hdr10_plus_dolby_vision')`
- `specs_processor`: `chipset_name, cpu, cpu_architecture, gpu, process_node, npu` (chipset detail lives in `chipsets`)
- `specs_memory`: `ram_gb, ram_type, storage_gb, storage_type` (+ variant options)
- `specs_camera`: `rear[] { type, megapixels, sensor_size, sensor_model, aperture, ois, eis, af, focal_length, video_modes[], features[] }, selfie[] {…}, video_features[], extras` (multi-camera, §5)
- `specs_battery`: `capacity_mah, battery_type, wired_w, wireless_w, reverse_wireless_w, protocols[]`
- `specs_connectivity`: `wifi, bluetooth, nfc ('yes'|'no'|'unknown'), usb, positioning[], ir_blaster`
- `specs_network`: `sim[], technology[], bands_2g/3g/4g/5g`
- `specs_software`: `os, ui, os_upgrades, security_patches`

Three-state booleans (Yes/No/**Unknown** — ranking §28) are strings, never
coerced. Missing = `null`, never guessed (phone spec §14).

## 4. Ranking engine mapping (migration 043)

| Ranking doc | Implementation |
|---|---|
| §12–13 processor (18) | `chipsets` + `chipset_benchmarks` (median policy), factor = value / global best |
| §16–17 RAM/Storage | `specs_memory.ram_gb|ram_type|storage_gb|storage_type` |
| §9 build (10) | `specs_design.ip_rating|front_glass_protection|frame_material|back_material` |
| §10 display (20) | `specs_display.*` |
| §18–23 cameras (25) | `specs_camera.rear[]/selfie[]` + video modes |
| §24–27 battery (20) | `specs_battery.*` |
| §30 dynamic bests | `ranking_benchmarks` (admin-overridable, auto-computable) |
| §29/32 versioning | `ranking_formula_versions` (FTS-1.0) + `device_rankings.scoring_version` |
| §31 recalculation | triggered on spec-relevant PATCH + after publish + benchmark refresh |

## 5. Existing code → new modules

| Existing | New |
|---|---|
| `src/lib/devices/mobileapi.ts` | reused by adapter `import-agent/adapters/mobileapi.ts` |
| `src/lib/devices/ingest-mobileapi.ts` (bulk script) | superseded by `import-agent/run.ts` (keeps provenance + conflicts) — script retained |
| `src/lib/devices/ai-extract.ts` (Groq, zod, circuit breaker) | pattern reused in `import-agent/brain.ts` |
| `applyDevicePrefill` (`src/lib/chat/prefill-apply.ts`) | import apply flow reuses this merge into the existing form |
| `agent_run_log` (`logAgentRun`) | import runs also log here |
| `/api/admin/devices` CRUD | extended with audit + provenance + score recalc hooks |
