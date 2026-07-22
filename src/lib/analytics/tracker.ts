import { headers } from 'next/headers'

export type PageViewData = {
  path: string
  referrer: string | null
  source: 'direct' | 'search' | 'social' | 'referral'
  platform: string | null
  countryCode: string | null
  deviceType: 'mobile' | 'tablet' | 'desktop' | null
}

// Classify traffic source from referrer URL
export function classifySource(referrer: string | null): {
  source: PageViewData['source']
  platform: string | null
} {
  if (!referrer) return { source: 'direct', platform: null }
  const url = referrer.toLowerCase()
  if (url.includes('google.') || url.includes('bing.') ||
      url.includes('yahoo.') || url.includes('duckduckgo.'))
    return { source: 'search', platform: null }
  if (url.includes('youtube.com') || url.includes('youtu.be'))
    return { source: 'social', platform: 'youtube' }
  if (url.includes('tiktok.com'))
    return { source: 'social', platform: 'tiktok' }
  if (url.includes('instagram.com'))
    return { source: 'social', platform: 'instagram' }
  if (url.includes('facebook.com') || url.includes('fb.com'))
    return { source: 'social', platform: 'facebook' }
  if (url.includes('twitter.com') || url.includes('x.com'))
    return { source: 'social', platform: 'twitter' }
  return { source: 'referral', platform: null }
}

// Classify device type from User-Agent string
export function classifyDevice(userAgent: string): PageViewData['deviceType'] {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || (ua.includes('android') && !ua.includes('tablet')))
    return 'mobile'
  if (ua.includes('tablet') || ua.includes('ipad'))
    return 'tablet'
  return 'desktop'
}

// Build PageViewData from request headers
// Call this from the page-view API route
export function buildPageViewData(
  path: string,
  requestHeaders: Headers
): PageViewData {
  const referrer = requestHeaders.get('referer')
  const userAgent = requestHeaders.get('user-agent') ?? ''
  const countryCode = requestHeaders.get('x-vercel-ip-country') ?? null
  const { source, platform } = classifySource(referrer)
  const deviceType = classifyDevice(userAgent)
  return { path, referrer, source, platform, countryCode, deviceType }
}