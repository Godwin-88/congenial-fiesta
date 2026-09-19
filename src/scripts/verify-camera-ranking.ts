/**
 * Ranking camera-role regression check for the slot migration.
 * Run: npx tsx src/scripts/verify-camera-ranking.ts
 *
 * scoreCameras previously matched roles with regexes over the free-form
 * `type` field; it now prefers the canonical `slot`. Both rows below describe
 * the SAME phone — one written by the agent ('Ultra-wide' in `type`), one
 * written by the taxonomy migration ('Ultrawide' in `slot`+`type`). Their
 * camera scores must be identical, and the ultrawide must actually score
 * (previously 'Ultra-wide' silently fell into the Main bucket).
 */
import { scoreCameras } from '@/lib/ranking/formula'

let pass = 0
let fail = 0
function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    pass += 1
  } else {
    fail += 1
    console.error(`✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
  }
}

const best = { sensorArea: 100, aperture: 1.4 }

// Agent-written row: dialect type strings, no slot.
const agentRow = {
  rear: [
    { type: 'Main', megapixels: 50, sensor_area_mm2: 72, aperture: 1.8, ois: 'yes', af: 'PDAF' },
    { type: 'Ultra-wide', megapixels: 50, sensor_area_mm2: 30, aperture: 2.2, af: 'AF' },
    { type: 'Periscope telephoto', megapixels: 50, sensor_area_mm2: 30, aperture: 3.0, optical_zoom_x: 5 },
  ],
  selfie: [{ type: 'Front', megapixels: 32, aperture: 2.4 }],
}

// Migration-normalised row: canonical slot tokens.
const normalisedRow = {
  rear: [
    { slot: 'Main', type: 'Main', megapixels: 50, sensor_area_mm2: 72, aperture: 1.8, ois: 'yes', af: 'PDAF' },
    { slot: 'Ultrawide', type: 'Ultrawide', megapixels: 50, sensor_area_mm2: 30, aperture: 2.2, af: 'AF' },
    { slot: 'Periscope', type: 'Periscope telephoto', megapixels: 50, sensor_area_mm2: 30, aperture: 3.0, optical_zoom_x: 5 },
  ],
  selfie: [{ slot: 'Selfie', type: 'Front', megapixels: 32, aperture: 2.4 }],
}

const agentScore = scoreCameras(agentRow, best)
const normalisedScore = scoreCameras(normalisedRow, best)

check('agent row and normalised row score identically', normalisedScore.points, agentScore.points)
check('ultrawide dialect earns ultrawide points', agentScore.detail.ultrawide != null, true)
check('ultrawide slot earns ultrawide points', normalisedScore.detail.ultrawide != null, true)
check('telephoto (periscope) earns telephoto points', normalisedScore.detail.telephoto != null, true)
check('main earns main points', normalisedScore.detail.main != null, true)
check('selfie earns selfie points', normalisedScore.detail.selfie != null, true)

// A row where every unit type was coerced to 'Main' (pre-migration corruption):
// ultrawide/telephoto must read as *absent*, not prorated — per §28 that is a
// confirmed absence, which is exactly what the old data loss produced.
const corrupted = { rear: [{ type: 'Main', megapixels: 50 }] }
const corruptedScore = scoreCameras(corrupted, best)
check('corrupted row: ultrawide confirmed absent (0, not prorated)', [
  corruptedScore.detail.ultrawide,
  corruptedScore.detail.ultrawide === 0,
], [0, true])

console.log(`\nCamera ranking: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
