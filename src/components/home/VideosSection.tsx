'use client'

import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading'
import ScrollReveal from './ScrollReveal'
import { VideoCard } from '@/components/videos/VideoCard'
import type { YouTubeVideo } from '@/lib/youtube/client'

type Props = {
  videos: YouTubeVideo[]
}

export default function VideosSection({ videos }: Props) {
  const displayVideos = videos.slice(0, 4)

  return (
    <section className="py-16 md:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="CONTENT"
          title="Latest from Fweezy"
          viewAllHref="/videos"
        />

        {displayVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayVideos.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <VideoCard
                  id={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnailUrl}
                  platform="youtube"
                  viewCount={video.viewCount}
                  duration={video.duration}
                  publishedAt={video.publishedAt}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden"
              >
                <div className="aspect-video flex items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <span className="text-4xl opacity-30">🎬</span>
                  </div>
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">New videos on the way</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}