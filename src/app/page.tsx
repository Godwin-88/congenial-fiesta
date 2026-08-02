import { Suspense } from 'react'
import { getTopDevices } from '@/lib/devices/queries'
import { getRecentArticles } from '@/lib/articles/queries'
import { getActiveComingSoon } from '@/lib/videos/queries'
import { fetchTopYouTubeVideos } from '@/lib/youtube/client'
import HeroSection from '@/components/home/HeroSection'
import SocialProofBar from '@/components/home/SocialProofBar'
import VideosSection from '@/components/home/VideosSection'
import DevicesSection from '@/components/home/DevicesSection'
import ArticlesSection from '@/components/home/ArticlesSection'
import ComparisonCTA from '@/components/home/ComparisonCTA'
import ComingSoonSection from '@/components/home/ComingSoonSection'
import AboutCTA from '@/components/home/AboutCTA'
import NewsletterSection from '@/components/home/NewsletterSection'

export const metadata = {
  title: "FweezyTech — Kenya's #1 Tech Review Destination",
  description: "Honest phone reviews, device comparisons, and buying guides for the East African market. By Fweezy.",
  openGraph: {
    title: "FweezyTech — Kenya's #1 Tech Review Destination",
    images: [{ url: '/api/og/default?title=Home', width: 1200, height: 630 }],
  },
}

export default async function HomePage() {
  const [videos, devices, articles, teasers] = await Promise.allSettled([
    fetchTopYouTubeVideos(4).catch(() => []),
    getTopDevices(6).catch(() => []),
    getRecentArticles(4).catch(() => []),
    getActiveComingSoon().catch(() => []),
  ])

  const videoData = videos.status === 'fulfilled' ? videos.value : []
  const deviceData = devices.status === 'fulfilled' ? devices.value : []
  const articleData = articles.status === 'fulfilled' ? articles.value : []
  const teaserData = teasers.status === 'fulfilled' ? teasers.value : []

  return (
    <>
      <HeroSection topDevices={deviceData.slice(0, 3)} />
      <SocialProofBar />
      <VideosSection videos={videoData} />
      <DevicesSection devices={deviceData} />
      <ArticlesSection articles={articleData} />
      <ComparisonCTA devices={deviceData} />
      <ComingSoonSection teasers={teaserData} />
      <AboutCTA />
      <NewsletterSection />
    </>
  )
}