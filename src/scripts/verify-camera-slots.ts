/**
 * Camera slot taxonomy verification.
 * Run: npx tsx src/scripts/verify-camera-slots.ts
 *
 * Guards the two invariants that broke before:
 *   1. every real-world lens-role dialect resolves to the intended slot
 *      (nothing is silently relabelled 'Main'), and
 *   2. an edit round-trip through the admin form model never destroys
 *      agent-imported camera detail.
 */
import { resolveCameraSlot, cameraLabel, readRearCameras, readSelfieCamera } from '@/lib/devices/camera-types'
import { normalizeCamera, cameraSpecToCanonical, REAR_CAMERA_TYPES } from '@/lib/camera-spec'

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

// ── 1. Alias resolution ───────────────────────────────────────────────────────
const DIALECTS: Array<[string | null, string | null]> = [
  ['Main', 'main'],
  ['Primary', 'main'],
  ['Wide', 'main'],
  ['Ultrawide', 'ultrawide'],
  ['Ultra-wide', 'ultrawide'],
  ['Ultra wide angle', 'ultrawide'],
  ['ultrawide_angle', 'ultrawide'],
  ['Telephoto', 'telephoto'],
  ['Periscope telephoto', 'periscope'],
  ['Periscope', 'periscope'],
  ['3x telephoto', 'telephoto'],
  ['Macro', 'macro'],
  ['Telemacro', 'macro'],
  ['Depth sensor', 'depth'],
  ['ToF', 'depth'],
  ['Monochrome', 'monochrome'],
  ['Ultra-something-else', null],
  ['', null],
  [null, null],
  [42, null],
]
for (const [input, expected] of DIALECTS) {
  check(`resolveCameraSlot(${JSON.stringify(input)})`, resolveCameraSlot(input), expected)
}

// ── 2. Display labels ─────────────────────────────────────────────────────────
check('label(main)', cameraLabel('main'), 'Main camera')
check('label(ultrawide)', cameraLabel('ultrawide'), 'Ultrawide camera')
check('label(telephoto, 2)', cameraLabel('telephoto', 2), 'Telephoto camera 2')
check('label(periscope)', cameraLabel('periscope'), 'Periscope telephoto camera')

// ── 3. Reader over all three stored shapes ───────────────────────────────────
const canonical = {
  rear: [
    { slot: 'Ultrawide', type: 'Ultrawide', megapixels: 50, sensor_model: 'JN5', aperture: 2.2, af: 'AF' },
    { slot: 'Main', type: 'Main', megapixels: 50, sensor_model: 'IMX906', aperture: 1.8, ois: 'yes' },
  ],
  selfie: [{ slot: 'Selfie', megapixels: 32, aperture: 2.4 }],
  video_features: ['8K@30fps', '4K@60fps'],
}
const rearCanonical = readRearCameras(canonical)
check('canonical rear order (layout, not source order)', rearCanonical.map((r) => r.label), [
  'Main camera',
  'Ultrawide camera',
])
check('canonical main value', rearCanonical[0].value, '50 MP · IMX906 · f/1.8 · OIS')
check('canonical selfie', readSelfieCamera(canonical)?.value, '32 MP · f/2.4')

const legacyStructured = {
  rear: [
    { type: 'Main', sensorType: '50 MP, f/1.8' },
    { type: 'Ultra-wide', sensorType: '8 MP, f/2.2' },
  ],
  selfie: { sensorType: '16 MP' },
  video: { rear: '4K@30fps', front: '1080p@30fps', features: 'HDR' },
}
check('legacy "Ultra-wide" is not relabelled Main', readRearCameras(legacyStructured).map((r) => r.label), [
  'Main camera',
  'Ultrawide camera',
])

const flatLegacy = {
  Main: '12 MP, f/1.8',
  Ultrawide: '12 MP, f/2.2',
  Telephoto: '12 MP, f/2.0',
  Front: '10 MP',
}
check('flat legacy reads all three rear lenses', readRearCameras(flatLegacy).map((r) => r.label), [
  'Main camera',
  'Ultrawide camera',
  'Telephoto camera',
])
check('flat legacy front camera', readSelfieCamera(flatLegacy)?.value, '10 MP')

// Unresolvable types must fall back positionally, not to 'Main'.
const positional = { rear: [{ type: 'Weird lens', sensorType: '5 MP' }, { type: 'Telephoto', sensorType: '8 MP' }] }
check('positional fallback for unknown roles', readRearCameras(positional).map((r) => r.label), [
  'Main camera',
  'Telephoto camera',
])

// Duplicate roles get an ordinal.
const dualTele = { rear: [{ type: 'Telephoto', sensorType: '3x' }, { type: 'Telephoto', sensorType: '5x' }] }
check('duplicate roles ordinalised', readRearCameras(dualTele).map((r) => r.label), [
  'Telephoto camera',
  'Telephoto camera 2',
])

// ── 4. Round-trip: admin form load → save never destroys agent detail ────────
// Readers sort by physical layout, so index 0 is the MAIN lens regardless of
// source order (the canonical fixture lists Ultrawide first).
const formView = normalizeCamera(canonical)
const resaved = cameraSpecToCanonical(formView)
const resavedRear = (resaved.rear as Array<Record<string, unknown>>) ?? []
check('round-trip preserves both lenses', resavedRear.length, 2)
check('round-trip keeps main megapixels', resavedRear[0]?.megapixels, 50)
check('round-trip keeps main sensor model', resavedRear[0]?.sensor_model, 'IMX906')
check('round-trip keeps main aperture', resavedRear[0]?.aperture, 1.8)
check('round-trip keeps main OIS', resavedRear[0]?.ois, 'yes')
check('round-trip keeps main slot', resavedRear[0]?.slot, 'Main')
check('round-trip keeps ultrawide slot', resavedRear[1]?.slot, 'Ultrawide')
check('round-trip keeps ultrawide AF', resavedRear[1]?.af, 'AF')
check('round-trip keeps selfie megapixels', (resaved.selfie as Record<string, unknown>)?.megapixels, 32)
check('round-trip keeps video features', resaved.video_features, ['8K@30fps', '4K@60fps'])

// Hand-entered free text must still contribute structured values to ranking.
const handTyped = cameraSpecToCanonical(
  normalizeCamera({ rear: [{ type: 'Main', sensorType: '50 MP Sony IMX890, f/1.8, OIS, PDAF' }] }),
)
const handRear = (handTyped.rear as Array<Record<string, unknown>>) ?? []
check('free text parsed: megapixels', handRear[0]?.megapixels, 50)
check('free text parsed: sensor model', handRear[0]?.sensor_model, 'IMX890')
check('free text parsed: aperture', handRear[0]?.aperture, 1.8)
check('free text parsed: OIS', handRear[0]?.ois, 'yes')
check('free text parsed: AF', handRear[0]?.af, 'PDAF')

// Empty/absent data stays empty.
check('null input → empty spec', readRearCameras(null).length, 0)
check('empty form serialises to empty rear', (cameraSpecToCanonical(normalizeCamera(null)).rear as unknown[] | null) ?? [], [])
check('taxonomy exposes the full token list', REAR_CAMERA_TYPES.length >= 7, true)

console.log(`\nCamera slots: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
