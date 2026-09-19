// Regression check for the pasted-spec-sheet pipeline.
// ============================================================================
// Guards the bug where a manufacturer paste returned "0 fields found / 47
// missing" because the brain emitted free-form keys ("Height", "Size") and
// unit-bearing strings ("161.42 mm") that the canonical zod schemas dropped.
//
// The fixture below is the shape the brain now produces for the OnePlus 15
// spec sheet (canonical keys, units still attached). The assertions cover the
// deterministic half of the pipeline: normalizeExtraction -> validateSpecs.
//
// Run: npx tsx src/scripts/verify-spec-extraction.ts

import { normalizeExtraction } from '@/lib/devices/import-agent/normalize-extract'
import { validateSpecs } from '@/lib/devices/spec-schema'
import type { TextSpecsExtraction } from '@/lib/devices/import-agent/text-specs'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    failures++
    console.error(`  FAIL ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  } else {
    console.log(`  ok   ${label} = ${JSON.stringify(actual)}`)
  }
}
function checkTruthy(label: string, actual: unknown) {
  if (actual == null) {
    failures++
    console.error(`  FAIL ${label}: expected a value, got ${JSON.stringify(actual)}`)
  } else {
    console.log(`  ok   ${label} = ${JSON.stringify(actual)}`)
  }
}

const onePlus15: TextSpecsExtraction = {
  name: 'OnePlus 15',
  brand: 'OnePlus',
  model_number: 'CPH2749',
  release_year: 2025,
  tagline: null,
  specs_design: {
    height_mm: '161.42 mm',
    width_mm: '76.67 mm',
    thickness_mm: '8.20 mm',
    weight_g: '215g',
    ip_rating: null,
    frame_material: null,
    back_material: null,
    front_glass_protection: 'Corning Gorilla Glass Victus 2',
    colors: undefined,
    speakers: undefined,
    ports: undefined,
  },
  specs_display: {
    size_inches: '17.23 cm (6.78 inches)',
    display_type: 'AMOLED',
    resolution_width: '2772*1272',
    resolution_height: null,
    refresh_hz: '1-120Hz Adaptive, Maximum 165Hz in gaming',
    adaptive_refresh: 'ltpo',
    peak_brightness_nits: '1800 nits',
    brightness_measured: undefined,
    hdr: 'HDR10+, HDR Vivid',
  },
  specs_processor: {
    chipset_name: 'Snapdragon 8 Elite Gen 5',
    cpu: 'Qualcomm Oryon CPU @4.608GHz',
    cpu_architecture: undefined,
    gpu: 'Adreno 840@1200MHZ',
    process_node: undefined,
    npu: undefined,
    max_clock_ghz: '4.608GHz',
  },
  specs_memory: {
    ram_gb: '12GB/16GB',
    ram_type: 'LPDDR5X Ultra',
    storage_gb: '256GB/512GB',
    storage_type: 'UFS 4.1',
    variants: undefined,
  },
  specs_camera: {
    rear: [
      { type: 'Main', megapixels: 50, sensor_model: 'Sony IMX906', aperture: 'ƒ/1.8', ois: 'Yes', af: 'Yes', optical_zoom_x: null },
      { type: 'Telephoto', megapixels: 50, sensor_model: 'S5KJN5', aperture: 'ƒ/2.8', ois: 'Yes', af: 'Yes', optical_zoom_x: '3.5X optical zoom' },
      { type: 'Ultra-wide', megapixels: 50, sensor_model: 'OV50D', aperture: 'ƒ/2.0', ois: null, af: 'Yes', optical_zoom_x: null },
    ],
    selfie: [{ type: 'Front', megapixels: 32, sensor_model: 'Sony IMX709', aperture: 'f/2.4', focal_length_mm: '21 mm equivalent', af: 'Supported' }],
    video_features: ['8K video: 30 fps', '4K video: 120fps'],
    extras: undefined,
  },
  specs_battery: {
    capacity_mah: '7,300 mAh',
    battery_type: 'Dual-cell 3,650 mAh, non-removable',
    wired_w: '80W SUPERVOOC',
    wireless_w: '50W AIRVOOC',
    reverse_wireless_w: null,
    protocols: ['SUPERVOOC', 'AIRVOOC'],
  },
  specs_connectivity: {
    wifi: 'Wi-Fi 7 (802.11be)',
    bluetooth: 'Bluetooth 6.0',
    nfc: 'NFC enabled',
    usb: 'USB 3.2 Gen 1 Type-C',
    positioning: ['GPS(L1+L5)', 'Galileo(E1+E5a)'],
    ir_blaster: 'Infrared remote control',
  },
  specs_network: {
    sim: ['Dual nano-SIM', 'eSIM'],
    technology: ['GSM', 'LTE', '5G'],
    bands_2g: 'GSM: 850/900/1800/1900MHz',
    bands_3g: 'WCDMA: Band 1/2/4/5/6/8/19',
    bands_4g: 'LTE FDD: Band 1/2/3/4/5/7/8/12/13/17/18/19/20/25/26/28/30/32/66/71',
    bands_5g: '5G NR: n1/n2/n3/n5/n7/n8/n12/n13/n20',
  },
  specs_software: { os: 'Android 16', ui: 'OxygenOS 16.0', os_upgrades: null, security_patches: null },
}

console.log('\nOnePlus 15 pasted-sheet fixture: normalize + validate\n')
const { sections, dropped } = normalizeExtraction(onePlus15)
const { valid, rejected } = validateSpecs(sections)

console.log('sections:', Object.keys(valid).join(', ') || '(none)')
console.log('dropped :', dropped.join(', ') || '(none)')
console.log('rejected:', rejected.join(', ') || '(none)')
console.log('')

const d = valid.specs_design as Record<string, unknown>
const disp = valid.specs_display as Record<string, unknown>
const proc = valid.specs_processor as Record<string, unknown>
const mem = valid.specs_memory as Record<string, unknown>
const cam = valid.specs_camera as Record<string, unknown>
const bat = valid.specs_battery as Record<string, unknown>
const conn = valid.specs_connectivity as Record<string, unknown>
const net = valid.specs_network as Record<string, unknown>
const soft = valid.specs_software as Record<string, unknown>

check('design.height_mm', d.height_mm, 161.42)
check('design.width_mm', d.width_mm, 76.67)
check('design.thickness_mm', d.thickness_mm, 8.2)
check('design.weight_g', d.weight_g, 215)
checkTruthy('design.front_glass_protection', d.front_glass_protection)

check('display.size_inches', disp.size_inches, 6.78)
check('display.resolution_width', disp.resolution_width, 2772)
check('display.resolution_height', disp.resolution_height, 1272)
check('display.refresh_hz', disp.refresh_hz, 165)
check('display.adaptive_refresh', disp.adaptive_refresh, 'ltpo')
check('display.peak_brightness_nits', disp.peak_brightness_nits, 1800)
check('display.hdr', disp.hdr, 'hdr10_plus')

check('processor.chipset_name', proc.chipset_name, 'Snapdragon 8 Elite Gen 5')
check('processor.max_clock_ghz', proc.max_clock_ghz, 4.608)
checkTruthy('processor.gpu', proc.gpu)

check('memory.ram_gb', mem.ram_gb, 12)
check('memory.ram_type', mem.ram_type, 'LPDDR5X')
check('memory.storage_gb', mem.storage_gb, 256)
check('memory.storage_type', mem.storage_type, 'UFS 4.1')

const rear = (cam.rear ?? []) as Array<Record<string, unknown>>
check('camera.rear count', rear.length, 3)
if (rear[0]) {
  check('camera.rear[0].type', rear[0].type, 'Main')
  check('camera.rear[0].megapixels', rear[0].megapixels, 50)
  check('camera.rear[0].aperture', rear[0].aperture, 1.8)
  check('camera.rear[0].ois', rear[0].ois, 'yes')
}
if (rear[1]) {
  check('camera.rear[1].type', rear[1].type, 'Telephoto')
  check('camera.rear[1].aperture', rear[1].aperture, 2.8)
  check('camera.rear[1].optical_zoom_x', rear[1].optical_zoom_x, 3.5)
}
const selfie = (cam.selfie ?? []) as Array<Record<string, unknown>>
check('camera.selfie count', selfie.length, 1)
if (selfie[0]) {
  check('camera.selfie[0].megapixels', selfie[0].megapixels, 32)
  check('camera.selfie[0].aperture', selfie[0].aperture, 2.4)
  check('camera.selfie[0].focal_length_mm', selfie[0].focal_length_mm, 21)
}

check('battery.capacity_mah', bat.capacity_mah, 7300)
check('battery.wired_w', bat.wired_w, 80)
check('battery.wireless_w', bat.wireless_w, 50)

check('connectivity.nfc', conn.nfc, 'yes')
check('connectivity.ir_blaster', conn.ir_blaster, 'yes')
checkTruthy('connectivity.wifi', conn.wifi)

check('network.bands_5g', net.bands_5g, '5G NR: n1/n2/n3/n5/n7/n8/n12/n13/n20')
check('software.os', soft.os, 'Android 16')
check('software.ui', soft.ui, 'OxygenOS 16.0')

console.log('')
if (failures > 0) {
  console.error(`${failures} assertion(s) failed`)
  process.exit(1)
}
console.log('All spec-extraction assertions passed')
