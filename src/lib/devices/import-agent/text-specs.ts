// Strict extraction schema for free-text spec sheets.
// Mirrors spec-schema.ts canonical keys. Section objects accept string values
// with units ("161.42 mm", "ƒ/1.8", "7300 mAh") — the orchestrator normalizes
// them to typed values before validateSpecs. Off-dictionary keys are stripped
// by zod; canonical keys are never rejected for being present.
//
// ACCEPTANCE vs WIRE: this zod schema is the ACCEPTANCE gate — it tolerates
// what gpt-oss-class models actually emit: omitted keys (`.nullish()` — the
// model drops what the sheet does not state), explicit nulls, and garbage
// value shapes (`.catch(null)` — one bad value nulls the field, not the
// section). The WIRE schema handed to strict structured-output providers is
// derived from this same definition (`toStrictJsonSchema` in
// strict-json-schema.ts), which rewrites it into strict form afterwards:
// every property re-listed in `required`, null kept as an allowed type,
// `additionalProperties: false` everywhere.
import { z } from 'zod'
import { toStrictJsonSchema } from './strict-json-schema'

/**
 * A value may arrive as text with units, as a bare number, as null, or be
 * omitted entirely (the model drops what the sheet does not state). A garbage
 * shape (e.g. an array where a scalar belongs) becomes null — one bad value
 * must not void the whole section.
 */
const strOrNum = z.union([z.string(), z.number(), z.null()]).nullish().catch(null)
const strList = z.array(z.union([z.string(), z.number()])).nullish().catch(null)

const cameraUnitExtraction = z.object({
  type: strOrNum,
  megapixels: strOrNum,
  sensor_size: strOrNum,
  sensor_model: strOrNum,
  aperture: strOrNum,
  ois: strOrNum,
  eis: strOrNum,
  af: strOrNum,
  focal_length_mm: strOrNum,
  optical_zoom_x: strOrNum,
  video_modes: strList,
  features: strList,
})

export const textSpecsSchema = z.object({
  name: z.string().nullish().catch(null),
  brand: z.string().nullish().catch(null),
  model_number: z.string().nullish().catch(null),
  release_year: z.number().int().min(2000).max(2100).nullish().catch(null),
  tagline: z.string().max(300).nullish().catch(null),
  specs_design: z
    .object({
      height_mm: strOrNum,
      width_mm: strOrNum,
      thickness_mm: strOrNum,
      weight_g: strOrNum,
      ip_rating: strOrNum,
      frame_material: strOrNum,
      back_material: strOrNum,
      front_glass_protection: strOrNum,
      colors: strList,
      speakers: strOrNum,
      ports: strOrNum,
    })
    .nullish().catch(null),
  specs_display: z
    .object({
      size_inches: strOrNum,
      display_type: strOrNum,
      resolution_width: strOrNum,
      resolution_height: strOrNum,
      // gpt-oss-class models often emit the WxH string under this invented
      // key despite the dictionary pointing at resolution_width; accepted
      // here and split by the normalizer.
      resolution: strOrNum,
      refresh_hz: strOrNum,
      adaptive_refresh: strOrNum,
      peak_brightness_nits: strOrNum,
      brightness_measured: strOrNum,
      hdr: strOrNum,
      secondary_display: z
        .object({
          size_inches: strOrNum,
          display_type: strOrNum,
          resolution_width: strOrNum,
          resolution_height: strOrNum,
          refresh_hz: strOrNum,
          peak_brightness_nits: strOrNum,
          protection: strOrNum,
          note: strOrNum,
        })
        .nullish().catch(null),
    })
    .nullish().catch(null),
  specs_processor: z
    .object({
      chipset_name: strOrNum,
      cpu: strOrNum,
      cpu_architecture: strOrNum,
      gpu: strOrNum,
      process_node: strOrNum,
      npu: strOrNum,
      max_clock_ghz: strOrNum,
    })
    .nullish().catch(null),
  specs_memory: z
    .object({
      ram_gb: strOrNum,
      ram_type: strOrNum,
      storage_gb: strOrNum,
      storage_type: strOrNum,
      variants: z
        .array(z.object({ ram_gb: strOrNum, storage_gb: strOrNum }))
        .nullish(),
    })
    .nullish().catch(null),
  specs_camera: z
    .object({
      rear: z.array(cameraUnitExtraction).nullish(),
      selfie: z.array(cameraUnitExtraction).nullish(),
      video_features: strList,
      extras: strOrNum,
    })
    .nullish().catch(null),
  specs_battery: z
    .object({
      capacity_mah: strOrNum,
      battery_type: strOrNum,
      wired_w: strOrNum,
      wireless_w: strOrNum,
      reverse_wireless_w: strOrNum,
      protocols: strList,
    })
    .nullish().catch(null),
  specs_connectivity: z
    .object({
      wifi: strOrNum,
      bluetooth: strOrNum,
      nfc: strOrNum,
      usb: strOrNum,
      positioning: strList,
      ir_blaster: strOrNum,
    })
    .nullish().catch(null),
  specs_network: z
    .object({
      sim: strList,
      technology: strList,
      bands_2g: strOrNum,
      bands_3g: strOrNum,
      bands_4g: strOrNum,
      bands_5g: strOrNum,
    })
    .nullish().catch(null),
  specs_software: z
    .object({
      os: strOrNum,
      ui: strOrNum,
      os_upgrades: strOrNum,
      security_patches: strOrNum,
    })
    .nullish().catch(null),
})

/**
 * The wire schema handed to the model. Derived from `textSpecsSchema` so there
 * is a single definition, then rewritten into strict form (every property
 * required, no additional properties) as strict structured-output providers
 * demand.
 */
export const TEXT_SPECS_STRICT_JSON_SCHEMA = toStrictJsonSchema(textSpecsSchema)

/**
 * Field dictionary given to the model so it emits canonical keys instead of
 * free-form labels ("Height" → height_mm). Kept SHORT on purpose: the prompt
 * plus a full spec sheet must fit the 8k TPM free-tier request budget. A
 * downstream normalizer strips units ("161.42 mm" → 161.42) before zod
 * validation, so string values with units are FINE — but made-up key names
 * are rejected by the schema.
 */
export const TEXT_SPECS_FIELD_DICTIONARY = [
  'TOP: name (device name), brand, model_number. Omit release_year and tagline unless clearly stated.',
  'DESIGN: height_mm (e.g. "161.42 mm"), width_mm, thickness_mm, weight_g (e.g. "215g"), ip_rating, frame_material, back_material, front_glass_protection ("Gorilla Glass Victus 2"), ports (e.g. "USB-C").',
  'DISPLAY: size_inches (e.g. "6.78 inches"), display_type (e.g. "AMOLED"), resolution as ONE string like "2772x1272" in EITHER resolution_width or resolution_height (the normalizer splits WxH — NEVER put both), refresh_hz as ONE number like 120 (a range like "1-120Hz Adaptive" means 120), adaptive_refresh ("ltpo" if LTPO/adaptive/1-120Hz), peak_brightness_nits (e.g. 1800), hdr ("HDR10+" becomes hdr10_plus automatically).',
  'PROCESSOR: chipset_name (full platform, e.g. "Snapdragon 8 Elite Gen 5"), cpu (e.g. "Oryon CPU 4.6GHz"), gpu (e.g. "Adreno 840"). Omit the rest unless stated.',
  'MEMORY: ram_gb (e.g. 12), storage_gb (e.g. 256), storage_type ("UFS 4.1"). Omit the rest unless stated.',
  'CAMERA: object {rear: array, selfie: array}. Rear has one entry per lens titled Main/Telephoto/Ultra-wide; selfie usually one entry (32MP). Each lens: type ("Main"), megapixels (50 not "50MP"), aperture ("f/1.8" or 1.8), sensor_model ("IMX906"), ois ("yes" or "no"), af ("yes" or "PDAF"), optical_zoom_x (3.5 not "3.5X zoom"), sensor_size ("1/1.3 inch" or null), focal_length_mm (21). NEVER invent; omit lenses not stated. video_features is an array of strings,Extras is a short string or null.',
  'BATTERY: capacity_mah (e.g. 7300), wired_w (e.g. 80), wireless_w (e.g. 50). Omit the rest unless stated.',
  'CONNECTIVITY: wifi ("Wi-Fi 7"), bluetooth ("Bluetooth 6.0"), nfc ("yes" or "no"), usb ("USB-C"). Omit the rest unless stated.',
  'NETWORK: sim (array like ["Dual nano-SIM","eSIM"]), technology (array like ["GSM","LTE","5G"]), bands as raw strings only if practical.',
  'SOFTWARE: os ("Android 16"), ui ("OxygenOS 16"). Omit the rest unless stated.',
].join('\n')

export type TextSpecsExtraction = z.infer<typeof textSpecsSchema>
