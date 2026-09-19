// Strict extraction schema for free-text spec sheets.
// Mirrors spec-schema.ts canonical keys. Section objects accept string values
// with units ("161.42 mm", "ƒ/1.8", "7300 mAh") — the orchestrator normalizes
// them to typed values before validateSpecs. Free-form key names are NOT
// accepted here: anything off-dictionary is rejected by zod, loudly.
import { z } from 'zod'

const strOrNum = z.union([z.string(), z.number(), z.null()]).optional()

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
  video_modes: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
})

export const textSpecsSchema = z.object({
  name: z.string().nullable(),
  brand: z.string().nullable(),
  model_number: z.string().nullable(),
  release_year: z.number().int().min(2000).max(2100).nullable(),
  tagline: z.string().max(300).nullable(),
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
      colors: z.array(z.string()).optional(),
      speakers: strOrNum,
      ports: strOrNum,
    })
    .nullable(),
  specs_display: z
    .object({
      size_inches: strOrNum,
      display_type: strOrNum,
      resolution_width: strOrNum,
      resolution_height: strOrNum,
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
        .nullable()
        .optional(),
    })
    .nullable(),
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
    .nullable(),
  specs_memory: z
    .object({
      ram_gb: strOrNum,
      ram_type: strOrNum,
      storage_gb: strOrNum,
      storage_type: strOrNum,
      variants: z.unknown().optional(),
    })
    .nullable(),
  specs_camera: z
    .object({
      rear: z.array(cameraUnitExtraction).optional(),
      selfie: z.array(cameraUnitExtraction).optional(),
      video_features: z.array(z.string()).optional(),
      extras: strOrNum,
    })
    .nullable(),
  specs_battery: z
    .object({
      capacity_mah: strOrNum,
      battery_type: strOrNum,
      wired_w: strOrNum,
      wireless_w: strOrNum,
      reverse_wireless_w: strOrNum,
      protocols: z.array(z.string()).optional(),
    })
    .nullable(),
  specs_connectivity: z
    .object({
      wifi: strOrNum,
      bluetooth: strOrNum,
      nfc: strOrNum,
      usb: strOrNum,
      positioning: z.array(z.string()).optional(),
      ir_blaster: strOrNum,
    })
    .nullable(),
  specs_network: z
    .object({
      sim: z.array(z.string()).optional(),
      technology: z.array(z.string()).optional(),
      bands_2g: strOrNum,
      bands_3g: strOrNum,
      bands_4g: strOrNum,
      bands_5g: strOrNum,
    })
    .nullable(),
  specs_software: z
    .object({
      os: strOrNum,
      ui: strOrNum,
      os_upgrades: strOrNum,
      security_patches: strOrNum,
    })
    .nullable(),
})

/**
 * Field dictionary given to the model so it emits canonical keys instead of
 * free-form labels ("Height" → height_mm). A downstream normalizer strips
 * units ("161.42 mm" → 161.42) before zod validation, so string values with
 * units are FINE — but made-up key names are rejected by the schema.
 */
export const TEXT_SPECS_FIELD_DICTIONARY = [
  'DESIGN: height_mm (e.g. "161.42 mm"), width_mm, thickness_mm, weight_g (e.g. "215g"), ip_rating, frame_material, back_material, front_glass_protection, colors (array), speakers, ports.',
  'DISPLAY: size_inches (e.g. "6.78 inches" or 6.78), display_type (e.g. "AMOLED", "LTPO AMOLED"), resolution as ONE string like "2772x1272" in EITHER resolution_width or resolution_height (the normalizer splits WxH), refresh_hz (e.g. "120Hz" or "1-120Hz Adaptive" — put the whole phrase in, max number wins), adaptive_refresh ("ltpo" if LTPO/adaptive/1-120Hz is stated), peak_brightness_nits (e.g. "1800 nits" — use the HBM/peak figure), hdr (e.g. "HDR10+, HDR Vivid" — the normalizer maps it). FOLDABLES: put the outer/cover screen under secondary_display with the same fields (size_inches, display_type, resolution_width, refresh_hz, peak_brightness_nits, protection) — e.g. {"size_inches": "6.2 inches", "display_type": "Super AMOLED", "refresh_hz": "120Hz"}.',
  'PROCESSOR: chipset_name (full platform name, e.g. "Snapdragon 8 Elite Gen 5"), cpu (e.g. "Oryon CPU @4.608GHz"), gpu (e.g. "Adreno 840"), max_clock_ghz (e.g. "4.608GHz"), process_node, npu, cpu_architecture.',
  'MEMORY: ram_gb (first figure wins, e.g. "12GB/16GB" → put the whole string, 12 is kept), ram_type (e.g. "LPDDR5X"), storage_gb (e.g. "256GB/512GB" → whole string, 256 kept), storage_type (e.g. "UFS 4.1"), variants (array of {ram_gb, storage_gb}, e.g. 12+256 / 16+512).',
  'CAMERA: an object with rear (array, one entry per lens: Main, Telephoto, Ultra-wide, Macro) and selfie (array — include EVERY front camera the source lists; dual-selfie phones have a main selfie plus an ultrawide selfie, each its own entry). Each lens: type, megapixels (e.g. 50), sensor_model (e.g. "IMX906"), aperture as the f-string (e.g. "ƒ/1.8" or "f/2.8" — the normalizer parses it), ois ("yes" if Optical Image Stabilization is stated), af ("yes" or the AF type), focal_length_mm (e.g. "21 mm equivalent"), optical_zoom_x (e.g. "3.5X optical zoom"), video_modes (array of strings like "8K 30fps"). NEVER nest under "Main Camera"/"Telephoto Camera" headings — flatten into the rear array.',
  'BATTERY: capacity_mah (e.g. "7,300 mAh" — put the whole string, 7300 is kept), wired_w (e.g. "80W SUPERVOOC"), wireless_w (e.g. "50W AIRVOOC"), battery_type, protocols (array, e.g. ["SUPERVOOC", "AIRVOOC"]).',
  'CONNECTIVITY: wifi (e.g. "Wi-Fi 7"), bluetooth (e.g. "Bluetooth 6.0"), nfc ("yes" if NFC enabled), usb (e.g. "USB 3.2 Gen 1 Type-C"), positioning (array), ir_blaster.',
  'NETWORK: sim (array, e.g. ["Dual nano-SIM", "eSIM"]), technology (array, e.g. ["GSM","LTE","5G"]), bands_2g/3g/4g/5g as the raw band strings.',
  'SOFTWARE: os (e.g. "Android 16"), ui (e.g. "OxygenOS 16.0").',
].join('\n')

export type TextSpecsExtraction = z.infer<typeof textSpecsSchema>
