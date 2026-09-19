// Temporary live probe — deleted after the run.
import { readFileSync } from 'node:fs'
import { extractSpecsFromText } from '@/lib/devices/import-agent/brain'
import { normalizeExtraction } from '@/lib/devices/import-agent/normalize-extract'
import { validateSpecs } from '@/lib/devices/spec-schema'

async function main() {
  const sheet = readFileSync('src/scripts/fixtures/oneplus-15-specs.txt', 'utf8')
  console.log('fixture chars:', sheet.length)
  const result = await extractSpecsFromText(sheet)
  if ('failure' in result) {
    console.error(
      'FAILURE:',
      result.failure.reason,
      (result.failure as { message?: string }).message ?? '',
    )
    process.exit(2)
  }
  const { sections } = normalizeExtraction(result.extraction)
  const parsed = validateSpecs(sections)
  console.log('merged sections:', Object.keys(parsed.valid).join(','))
  const d = (parsed.valid.specs_design ?? {}) as Record<string, unknown>
  const disp = (parsed.valid.specs_display ?? {}) as Record<string, unknown>
  const proc = (parsed.valid.specs_processor ?? {}) as Record<string, unknown>
  const bat = (parsed.valid.specs_battery ?? {}) as Record<string, unknown>
  console.log('design:', JSON.stringify({ h: d.height_mm, w: d.weight_g }))
  console.log(
    'display:',
    JSON.stringify({ size: disp.size_inches, res: disp.resolution_width, hz: disp.refresh_hz, nits: disp.peak_brightness_nits }),
  )
  console.log(
    'perf/batt:',
    JSON.stringify({ chip: proc.chipset_name, mah: bat.capacity_mah, wired: bat.wired_w }),
  )
  console.log('rejected:', parsed.rejected.length ? parsed.rejected.join(',') : '(none)')
}

void main()
