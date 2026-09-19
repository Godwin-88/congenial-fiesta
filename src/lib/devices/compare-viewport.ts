/**
 * Viewport rules for device comparison.
 *
 * Product decision (FweezyTech):
 *  - Portrait phone: at most 2 devices side-by-side. The layout is a vertical
 *    card stack — a third device is unreadable without horizontal panning.
 *  - Landscape phone, tablet and desktop: up to 3 devices.
 *
 * These helpers are pure so the rules can be asserted in a script without a DOM.
 * The live viewport is read in `CompareViewportGuard` (client component).
 */

export const COMPARE_DEVICE_CAP_PORTRAIT = 2
export const COMPARE_DEVICE_CAP_WIDE = 3

/**
 * A "wide" viewport is anything that can lay out three device columns:
 * tablets and desktops by width, plus phones held in landscape.
 *
 * The landscape test uses width 640+ with a short height (<= 520) so a narrow
 * desktop window that happens to be short is still treated as wide.
 */
export function isWideCompareViewport(width: number, height: number): boolean {
  if (width >= 768) return true
  return width >= 640 && height > 0 && height <= 520
}

/** Max number of devices allowed for the given viewport. */
export function maxCompareDevices(width: number, height: number): number {
  return isWideCompareViewport(width, height)
    ? COMPARE_DEVICE_CAP_WIDE
    : COMPARE_DEVICE_CAP_PORTRAIT
}

/**
 * Trim a slug list to the viewport cap, preserving order.
 * Returns the same array instance when nothing needs dropping so callers can
 * cheaply detect "no change" by identity.
 */
export function clampCompareSlugs(
  slugs: string[],
  width: number,
  height: number,
): string[] {
  const cap = maxCompareDevices(width, height)
  return slugs.length > cap ? slugs.slice(0, cap) : slugs
}