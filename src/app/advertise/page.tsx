import AdvertiseClient from '@/components/advertise/AdvertiseClient'

export const metadata = {
  title: 'Advertise with Fweezy Tech | Brand Partnerships & Sponsorships',
  description: 'Partner with Millan Wafula (Fweezy Tech) — Kenya\'s top tech content creator. Explore campaign packages and monthly retainer options, then request a quote.',
  robots: process.env.ADVERTISE_PAGE_INDEXED === 'true' ? undefined : 'noindex',
}

export default function AdvertisePage() {
  return <AdvertiseClient />
}
