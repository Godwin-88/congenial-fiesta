// Source adapter: MobileAPI.dev (structured spec API).
// ============================================================================
// Thin "perception" wrapper around src/lib/devices/mobileapi.ts. Maps the raw
// MobileAPI payload into the canonical SpecSnapshot using the deterministic
// normalizers — the LLM is never involved here, and unknown fields stay null.

import {
  fetchAllPages,
  fetchDeviceDetail,
  type MobileApiDevice,
} from '@/lib/devices/mobileapi'
import * as norm from '@/lib/devices/spec-normalize'
import type { CameraUnit } from '@/lib/devices/spec-schema'
import type { SourceAdapter, SourceMatch, SpecSnapshot } from '../types'

function brandName(d: MobileApiDevice): string | null {
  return (
    norm.text(d.manufacturer_name) ??
    norm.text(d.brand_name) ??
    norm.text(d.brand) ??
    norm.text(d.manufacturer?.name) ??
    null
  )
}

function parseDimensions(raw: unknown): { h: number | null; w: number | null; t: number | null } {
  const s = norm.text(raw)
  if (!s) return { h: null, w: null, t: null }
  const parts = s.split(/[x×]/).map((p) => norm.mm(p))
  return {
    h: parts[0] ?? null,
    w: parts[1] ?? null,
    t: parts[2] ?? null,
  }
}

function mapCameraList(raw: unknown, type: string): CameraUnit[] {
  const out: CameraUnit[] = []
  const push = (unit: CameraUnit) => {
    if (Object.values(unit).some((v) => v != null)) out.push(unit)
  }
  if (Array.isArray(raw)) {
    for (const cam of raw) {
      const o = (cam ?? {}) as Record<string, unknown>
      push({
        type: norm.text(o.type) ?? type,
        megapixels: norm.megapixels(o.megapixels),
        sensor_size: norm.text(o.sensor_size),
        sensor_area_mm2: norm.sensorAreaMm2(o.sensor_size),
        sensor_model: norm.text(o.sensor_model),
        aperture: norm.aperture(o.aperture),
        ois: norm.tri(o.ois),
        eis: norm.tri(o.eis),
        af: norm.text(o.autofocus),
        focal_length_mm: norm.num(o.focal_length),
        optical_zoom_x: norm.num(o.optical_zoom),
        video_modes: undefined,
        features: undefined,
      })
    }
  } else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    push({
      type,
      megapixels: norm.megapixels(o.megapixels ?? o.resolution),
      sensor_size: norm.text(o.sensor_size),
      sensor_area_mm2: norm.sensorAreaMm2(o.sensor_size),
      sensor_model: norm.text(o.sensor_model),
      aperture: norm.aperture(o.aperture),
      ois: norm.tri(o.ois),
      eis: norm.tri(o.eis),
      af: norm.text(o.autofocus),
      focal_length_mm: norm.num(o.focal_length),
      optical_zoom_x: norm.num(o.optical_zoom),
      video_modes: undefined,
      features: undefined,
    })
  }
  return out
}

function toStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw.map((x) => norm.text(x)).filter(Boolean) as string[]
  return out.length ? out : undefined
}

/** Canonical mapping of one MobileAPI device payload. */
export function mapMobileApiDevice(d: MobileApiDevice) {
  const display = (d.display ?? {}) as Record<string, unknown>
  const body = (d.body ?? {}) as Record<string, unknown>
  const platform = (d.platform ?? {}) as Record<string, unknown>
  const memory = (d.memory ?? {}) as Record<string, unknown>
  const network = (d.network ?? {}) as Record<string, unknown>
  const battery = (d.battery ?? {}) as Record<string, unknown>
  const sound = (d.sound ?? {}) as Record<string, unknown>
  const comms = (d.comms ?? {}) as Record<string, unknown>
  const features = (d.features ?? {}) as Record<string, unknown>
  const misc = (d.misc ?? {}) as Record<string, unknown>
  const dims = parseDimensions(body.dimensions)
  const yearMatch = norm.text(d.release_date)?.match(/\b(19|20)\d{2}\b/)

  const specs = {
    specs_design: {
      height_mm: dims.h,
      width_mm: dims.w,
      thickness_mm: dims.t,
      weight_g: norm.grams(body.weight),
      ip_rating: norm.ipRating(body.other ?? body.build),
      frame_material: norm.text(body.build),
      back_material: norm.text(body.build),
      front_glass_protection: norm.text(display.protection),
      colors: toStringArray(d.colors),
      speakers: norm.text(sound.loudspeaker),
      ports: norm.text(body.ports),
    },
    specs_display: {
      size_inches: norm.inches(display.size),
      display_type: norm.text(display.type),
      resolution_width: norm.resolutionWidth(norm.text(display.resolution)),
      resolution_height: norm.resolutionHeight(norm.text(display.resolution)),
      refresh_hz: norm.hertz(display.refresh_rate ?? display.refresh),
      adaptive_refresh: norm.adaptiveRefresh(
        norm.text(display.type) ?? norm.text(display.refresh_rate),
      ),
      peak_brightness_nits: norm.nits(display.peak_brightness),
      brightness_measured: false,
      hdr: norm.hdrType(display.hdr) as 'hdr10' | 'hdr10_plus' | 'dolby_vision' | 'hdr10_plus_dolby_vision' | 'none' | null,
    },
    specs_processor: {
      chipset_name: norm.text(platform.chipset),
      cpu: norm.text(platform.cpu),
      cpu_architecture: norm.text(platform.cpu),
      gpu: norm.text(platform.gpu),
      process_node: norm.text(platform['node size'] ?? platform.node_size),
      npu: norm.text(platform.npu),
      max_clock_ghz: null,
    },
    specs_memory: {
      ram_gb: norm.ramGb(memory.ram ?? memory.internal),
      ram_type: norm.ramType(memory.ram_type),
      storage_gb: norm.storageGb(memory.internal),
      storage_type: norm.storageType(memory.storage_type),
      variants: undefined,
    },
    specs_camera: {
      rear: mapCameraList(d.main_camera, 'Main'),
      selfie: mapCameraList(d.selfie_camera, 'Front'),
      video_features: undefined,
      extras: norm.text(misc.features),
    },
    specs_battery: {
      capacity_mah: norm.mah(battery.capacity_mah),
      battery_type: norm.text(battery.type),
      wired_w: norm.watts(battery.charging),
      wireless_w: norm.watts(battery.wireless_charging),
      reverse_wireless_w: norm.watts(battery.reverse_charging),
      protocols: toStringArray(battery.charging_protocols),
    },
    specs_connectivity: {
      wifi: norm.text(comms.wifi),
      bluetooth: norm.text(comms.bluetooth),
      nfc: norm.tri(comms.nfc),
      usb: norm.text(comms.usb),
      positioning: toStringArray(comms.positioning),
      ir_blaster: norm.tri(comms['ir blaster']),
    },
    specs_network: {
      sim: undefined,
      technology: toStringArray(network.technology),
      bands_2g: norm.text(network.bands_2g),
      bands_3g: norm.text(network.bands_3g),
      bands_4g: norm.text(network.bands_4g),
      bands_5g: norm.text(network.bands_5g),
    },
    specs_software: {
      os: norm.text(platform.os ?? misc.os),
      ui: norm.text(platform['ui layer'] ?? platform.ui_layer),
      os_upgrades: norm.text(features['major os upgrades']),
      security_patches: norm.text(features['security patches']),
    },
  }
  return {
    specs,
    identity: {
      brand: brandName(d),
      modelNumber: norm.text((d as Record<string, unknown>).model_number),
      releaseYear: yearMatch ? Number(yearMatch[0]) : null,
      tagline: norm.text(d.description)?.slice(0, 300) ?? null,
    },
  }
}


export function createMobileApiAdapter(): SourceAdapter {
  return {
    slug: 'mobileapi',
    label: 'MobileAPI.dev (structured spec API)',
    isConfigured: () => Boolean(process.env.MOBILEAPI_KEY),

    async search(query, limit = 10): Promise<SourceMatch[]> {
      // failFast: a first-page API failure (e.g. "Monthly request limit
      // reached") must surface as a source error, not a silent 0 matches.
      const devices = await fetchAllPages('/devices', { search: query, limit: 30 }, limit, {
        failFast: true,
      })
      return devices
        .map((d) => {
          const { identity } = mapMobileApiDevice(d)
          const yearMatch = norm.text(d.release_date)?.match(/\b(19|20)\d{2}\b/)
          return {
            externalId: String(d.id ?? ''),
            name: norm.text(d.name) ?? '',
            brand: identity.brand,
            releaseYear: yearMatch ? Number(yearMatch[0]) : null,
            url: d.id != null ? `https://api.mobileapi.dev/devices/${d.id}/` : null,
            thumbnail: norm.text(d.image_url) ?? norm.text(d.image),
            sourceSlug: 'mobileapi',
            sourceLabel: 'MobileAPI.dev',
          }
        })
        .filter((m) => m.name)
    },

    async fetchSpecs(match: SourceMatch): Promise<SpecSnapshot | null> {
      if (!match.externalId) return null
      const d = await fetchDeviceDetail(match.externalId)
      const { specs, identity } = mapMobileApiDevice(d)
      const providedPaths = Object.entries(specs).flatMap(([section, values]) =>
        Object.entries(values as Record<string, unknown>)
          .filter(([, v]) => v != null)
          .map(([k]) => `${section}.${k}`),
      )
      return {
        match,
        specs,
        identity: {
          name: norm.text(d.name) ?? match.name,
          brand: identity.brand,
          modelNumber: identity.modelNumber,
          releaseYear: identity.releaseYear,
          variantLabel: null,
          region: null,
          tagline: identity.tagline,
        },
        raw: d,
        sourceUrl: match.url ?? null,
        providedPaths,
      }
    },
  }
}

