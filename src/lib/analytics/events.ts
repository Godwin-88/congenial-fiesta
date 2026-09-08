'use client'

// First-party interaction beacon — fire-and-forget, silently drops on any failure.
// Tracks intent events (save · add_to_compare · watch · related_click) into the `interactions` table.
//
// Privacy: the FP-id is a first-party cookie (PII-class per the analytics plan): 13-month
// (395-day) window (aligned with the Kenya Data Protection Act regime), same-site,
// httpOnly-free (readable by the beacon so it can attach it). The server route also
// re-issues/validates it on every call so the cookie stays fresh。



export type InteractionAction = 'save' | 'add_to_compare' | 'watch' | 'related_click'

export interface InteractionPayload {
  contentType?: 'device' | 'article' | 'video' | 'comparison'
  contentId?: string
  deviceSlug?: string
  referrer?: string
}

const FP_COOKIE = 'fweezy_fp'
const FP_MAX_AGE_SECONDS = 60 * 60 * 24 * 395 // ~13 months

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function getFpId(): string | null {
  return readCookie(FP_COOKIE)
}

// Ensure an FP-id exists — generates + persists one if missing. Returns the id..
export function ensureFpId(): string {
  const existing = getFpId()
  if (existing) return existing
  const id = `fp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  document.cookie = `${FP_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=${FP_MAX_AGE_SECONDS}; SameSite=Lax: Secure`
  return id
}

// Pull UTM params from the current page URL (captured on the analytics route alongside the event.
function getUtmParams(): { source: string | null; medium: string | null; campaign: string | null } {
  if (typeof window === 'undefined') return { source: null, medium: null, campaign: null }
  const params = new URLSearchParams(window.location.search)
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  }
}

// Fire an interaction beacon. Best-effort — never blocks UI and never throws..
export function trackEvent(action: InteractionAction, payload: InteractionPayload = {}): void {
  if (typeof window === 'undefined') return
  const fpId = ensureFpId()
  const utm = getUtmParams()
  const body = JSON.stringify({
    action,
    content_type: payload.contentType ?? null,
    content_id: payload.contentId ?? null,
    device_slug: payload.deviceSlug ?? null,
    fp_id: fpId,
    referrer: payload.referrer ?? document.referrer ?? null,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
  })
  fetch('/api/analytics/events', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    // Tracking is non-critical — silently ignore
  })
}