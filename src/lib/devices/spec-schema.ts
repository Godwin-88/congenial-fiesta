// Canonical spec schema for the FweezyTech Phone Database.
// ============================================================================
// "FweezyTech Phone Database.md" §1–9: every field below is typed. Missing
// information is ALWAYS null/undefined — never guessed, defaulted or inferred
// (§14: "If information is unavailable, leave the field empty/null. Never
// invent it."). Three-state facts (Yes/No/Unknown) are strings, never coerced
// to booleans (Ranking §28).
//
// These zod schemas govern what may be *stored* in the devices.specs_* JSONB
// columns. The import pipeline validates every value against them before any
// write; a value that cannot be parsed is dropped (kept null), not improvised.

import { z } from 'zod'

// ── Primitives ───────────────────────────────────────────────────────────────

/** Numbers arrive as "5200 mAh", "6.9\"" etc. — parser normalizes, schema gates. */
export const optNumber = z.number().finite().nullable().optional()
export const optInt = z.number().int().finite().nullable().optional()
export const optText = z.string().trim().min(1).nullable().optional()

/** Yes / No / Unknown tri-state (Ranking §28: unknown ≠ no). */
export const triState = z.enum(['yes', 'no', 'unknown']).nullable().optional()

// ── Per-section schemas (match docs/phone-database-field-mapping.md §3) ──────

export const DesignSpecsSchema = z.object({
  height_mm: optNumber,
  width_mm: optNumber,
  thickness_mm: optNumber,
  weight_g: optNumber,
  ip_rating: optText, // preserved verbatim, e.g. 'IP68' / 'IP68/IP69'
  frame_material: optText,
  back_material: optText,
  front_glass_protection: optText,
  colors: z.array(z.string()).optional(),
  speakers: optText,
  ports: optText,
})

/** A foldable's outer/cover display. All fields optional — cover screens vary
 *  in how much detail sources publish. `role` distinguishes 'cover' from a
 *  possible future third panel. */
export const SecondaryDisplaySchema = z.object({
  role: optText, // 'cover' | 'external' …
  size_inches: optNumber,
  display_type: optText,
  resolution_width: optInt,
  resolution_height: optInt,
  refresh_hz: optNumber,
  peak_brightness_nits: optNumber,
  protection: optText,
  note: optText, // free text, e.g. '3.4" Super AMOLED, 120Hz'
})

export const DisplaySpecsSchema = z.object({
  size_inches: optNumber,
  display_type: optText,
  resolution_width: optInt,
  resolution_height: optInt,
  refresh_hz: optNumber,
  adaptive_refresh: z.enum(['fixed', 'dynamic', 'ltpo']).nullable().optional(),
  peak_brightness_nits: optNumber,
  /** true only if brightness is an independent measurement (Ranking §10d) */
  brightness_measured: z.boolean().nullable().optional(),
  hdr: z
    .enum(['none', 'hdr10', 'hdr10_plus', 'dolby_vision', 'hdr10_plus_dolby_vision', 'unknown'])
    .nullable()
    .optional(),
  /** Foldables only — the outer cover display and its own features. */
  secondary_display: SecondaryDisplaySchema.nullable().optional(),
})

export const ProcessorSpecsSchema = z.object({
  chipset_name: optText, // canonical name; detailed SoC data lives in `chipsets`
  cpu: optText,
  cpu_architecture: optText,
  gpu: optText,
  process_node: optText,
  npu: optText,
  max_clock_ghz: optNumber,
})

export const MemorySpecsSchema = z.object({
  ram_gb: optNumber,
  ram_type: optText, // 'LPDDR5X' …
  storage_gb: optNumber,
  storage_type: optText, // 'UFS 4.0' …
  /** All marketed configurations, e.g. [{ram_gb: 12, storage_gb: 512}] (spec §4c) */
  variants: z
    .array(z.object({ ram_gb: optNumber, storage_gb: optNumber, note: optText }))
    .optional(),
})

export const CameraUnitSchema = z.object({
  // Canonical slot resolved from the role text ('Main' | 'Ultrawide' | …).
  // Written by the import pipeline and the admin form; see camera-types.ts.
  slot: optText,
  type: optText, // 'Main' | 'Ultrawide' | 'Telephoto' | 'Periscope telephoto' | 'Macro' | 'Front'
  megapixels: optNumber,
  sensor_size: optText, // '1/1.3"' preserved
  /** Parsed area in mm² when derivable — feeds the camera SensorFactor */
  sensor_area_mm2: optNumber,
  sensor_model: optText,
  aperture: optNumber, // numeric f-stop, e.g. 1.7 for f/1.7
  ois: triState,
  eis: triState,
  af: optText, // 'PDAF' | 'Dual Pixel PDAF' | 'Laser AF' …
  focal_length_mm: optNumber,
  optical_zoom_x: optNumber, // optical only — digital zoom is never stored here (Ranking §20)
  video_modes: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
})

export const CameraSpecsSchema = z.object({
  rear: z.array(CameraUnitSchema).optional(),
  selfie: z.array(CameraUnitSchema).optional(),
  video_features: z.array(z.string()).optional(), // 10-bit HDR, Log video, Cinematic …
  extras: optText, // Leica/ZEISS/Hasselblad partnership notes (§5o)
})

export const BatterySpecsSchema = z.object({
  capacity_mah: optNumber,
  battery_type: optText, // 'Li-Po' | 'Li-Ion' | 'Si/C'
  wired_w: optNumber,
  wireless_w: optNumber,
  reverse_wireless_w: optNumber,
  protocols: z.array(z.string()).optional(), // 'PD3.0', 'PPS', 'SuperVOOC', 'MagSafe'
})

export const ConnectivitySpecsSchema = z.object({
  wifi: optText,
  bluetooth: optText,
  nfc: triState,
  usb: optText,
  positioning: z.array(z.string()).optional(),
  ir_blaster: triState,
})

export const NetworkSpecsSchema = z.object({
  sim: z.array(z.string()).optional(),
  technology: z.array(z.string()).optional(), // GSM / HSPA / LTE / 5G
  bands_2g: optText,
  bands_3g: optText,
  bands_4g: optText,
  bands_5g: optText,
})

export const SoftwareSpecsSchema = z.object({
  os: optText, // 'Android 16'
  ui: optText, // 'One UI 8.5'
  os_upgrades: optText, // promised major OS upgrades, e.g. '7 years'
  security_patches: optText, // promised security support, e.g. '5 years'
})

export const DeviceSpecsSchema = z.object({
  specs_design: DesignSpecsSchema,
  specs_display: DisplaySpecsSchema,
  specs_processor: ProcessorSpecsSchema,
  specs_memory: MemorySpecsSchema,
  specs_camera: CameraSpecsSchema,
  specs_battery: BatterySpecsSchema,
  specs_connectivity: ConnectivitySpecsSchema,
  specs_network: NetworkSpecsSchema,
  specs_software: SoftwareSpecsSchema,
})

// ── Convenience types ────────────────────────────────────────────────────────

export type DesignSpecs = z.infer<typeof DesignSpecsSchema>
export type DisplaySpecs = z.infer<typeof DisplaySpecsSchema>
export type SecondaryDisplay = z.infer<typeof SecondaryDisplaySchema>
export type ProcessorSpecs = z.infer<typeof ProcessorSpecsSchema>
export type MemorySpecs = z.infer<typeof MemorySpecsSchema>
export type CameraUnit = z.infer<typeof CameraUnitSchema>
export type CameraSpecs = z.infer<typeof CameraSpecsSchema>
export type BatterySpecs = z.infer<typeof BatterySpecsSchema>
export type ConnectivitySpecs = z.infer<typeof ConnectivitySpecsSchema>
export type NetworkSpecs = z.infer<typeof NetworkSpecsSchema>
export type SoftwareSpecs = z.infer<typeof SoftwareSpecsSchema>
export type DeviceSpecs = z.infer<typeof DeviceSpecsSchema>

/** Every canonical section key, used for provenance bookkeeping. */
export const SPEC_SECTION_KEYS = Object.keys(DeviceSpecsSchema.shape)

/**
 * Validate a whole specs payload. Returns a sanitized object where sections
 * that fail validation are dropped entirely (never partial garbage), plus the
 * list of rejected sections for logging. Unknown keys are stripped by zod.
 */
export function validateSpecs(
  specs: Record<string, unknown>,
): { valid: Record<string, Record<string, unknown>>; rejected: string[] } {
  const valid: Record<string, Record<string, unknown>> = {}
  const rejected: string[] = []
  const sectionSchemas: Record<string, z.ZodTypeAny> = {
    specs_design: DesignSpecsSchema,
    specs_display: DisplaySpecsSchema,
    specs_processor: ProcessorSpecsSchema,
    specs_memory: MemorySpecsSchema,
    specs_camera: CameraSpecsSchema,
    specs_battery: BatterySpecsSchema,
    specs_connectivity: ConnectivitySpecsSchema,
    specs_network: NetworkSpecsSchema,
    specs_software: SoftwareSpecsSchema,
  }
  for (const [key, schema] of Object.entries(sectionSchemas)) {
    const parsed = schema.safeParse(specs[key] ?? {})
    if (parsed.success && parsed.data && Object.keys(parsed.data as object).length > 0) {
      valid[key] = parsed.data as Record<string, unknown>
    } else if (!parsed.success) {
      rejected.push(key)
    }
  }
  return { valid, rejected }
}
