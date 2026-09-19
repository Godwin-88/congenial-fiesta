/**
 * Viewport-cap checks for the device comparison layout.
 *
 * Product rule: a portrait phone compares at most 2 devices (the spec columns
 * cannot be read side-by-side); landscape phones, tablets and desktops compare 3.
 *
 * Run: npx tsx src/scripts/verify-compare-viewport.ts
 */
import {
  clampCompareSlugs,
  isWideCompareViewport,
  maxCompareDevices,
  COMPARE_DEVICE_CAP_PORTRAIT,
  COMPARE_DEVICE_CAP_WIDE,
} from '@/lib/devices/compare-viewport'

let passed = 0
let failed = 0

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    passed++
    console.log(`  ok   ${name}`)
  } else {
    failed++
    console.error(`  FAIL ${name}\n       expected ${JSON.stringify(expected)}\n       received ${JSON.stringify(actual)}`)
  }
}

const slugs3 = ['a', 'b', 'c']

console.log('\nmaxCompareDevices\n')
check('iPhone portrait 390x844 → 2', maxCompareDevices(390, 844), 2)
check('Pixel portrait 360x800 → 2', maxCompareDevices(360, 800), 2)
check('iPhone landscape 844x390 → 3', maxCompareDevices(844, 390), 3)
check('large phone landscape 932x430 → 3', maxCompareDevices(932, 430), 3)
check('tablet portrait 820x1180 → 3', maxCompareDevices(820, 1180), 3)
check('tablet landscape 1180x820 → 3', maxCompareDevices(1180, 820), 3)
check('desktop 1440x900 → 3', maxCompareDevices(1440, 900), 3)
check('short desktop window 700x400 → 3', maxCompareDevices(700, 400), 3)
check('tiny window 320x480 → 2', maxCompareDevices(320, 480), 2)
check('exactly 768px wide → 3', maxCompareDevices(768, 1000), 3)
check('767px wide, tall → 2', maxCompareDevices(767, 1000), 2)
check('639px wide, short → 2', maxCompareDevices(639, 400), 2)

console.log('\nisWideCompareViewport\n')
check('390x844 not wide', isWideCompareViewport(390, 844), false)
check('844x390 wide', isWideCompareViewport(844, 390), true)
check('zero height guarded', isWideCompareViewport(700, 0), false)

console.log('\nclampCompareSlugs\n')
check('portrait trims 3 → 2', clampCompareSlugs(slugs3, 390, 844), ['a', 'b'])
check('landscape keeps 3', clampCompareSlugs(slugs3, 844, 390), ['a', 'b', 'c'])
check('desktop keeps 3', clampCompareSlugs(slugs3, 1440, 900), ['a', 'b', 'c'])
check('2 slugs untouched on portrait', clampCompareSlugs(['a', 'b'], 390, 844), ['a', 'b'])
check('order preserved when trimming', clampCompareSlugs(['z', 'm', 'a'], 390, 844), ['z', 'm'])

// Identity fast-path: the guard relies on reference equality to skip routing.
const within = ['a', 'b']
check('within cap returns identical reference', clampCompareSlugs(within, 1440, 900) === within, true)

console.log('\ncaps\n')
check('portrait cap constant', COMPARE_DEVICE_CAP_PORTRAIT, 2)
check('wide cap constant', COMPARE_DEVICE_CAP_WIDE, 3)

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
