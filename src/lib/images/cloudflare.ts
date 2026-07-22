/**
 * Generate an optimised Cloudflare Images URL for a given width.
 * Falls back to the original URL if it's not a Cloudflare Images URL.
 */
export function cfImageUrl(url: string, width: number): string {
  if (url.includes('imagedelivery.net')) {
    // Cloudflare Images URL format: https://imagedelivery.net/{accountHash}/{imageId}
    // Append width, quality, format transformations
    return `${url}/w=${width},q=80,f=webp`
  }
  // For placehold.co or other sources, return as-is
  return url
}