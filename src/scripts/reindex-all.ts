import { config } from 'dotenv'

// Load .env.local BEFORE any other module imports
config({ path: '.env.local' })

async function reindexAll() {
  const { createClient } = await import('@supabase/supabase-js')
  const { indexDevice, indexArticle, indexYouTubeVideo } = await import('@/lib/search/indexing')
  const { fetchAllYouTubeVideos } = await import('@/lib/youtube/client')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log('Starting reindex of all content into Upstash Search + Vector...\n')

  // ── Index Devices ─────────────────────────────────────────
  console.log('Fetching published devices...')
  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('status', 'published')
    .limit(500)

  const deviceList = devices ?? []
  console.log(`Found ${deviceList.length} published devices. Indexing...`)

  for (const device of deviceList) {
    try {
      await indexDevice(device)
      console.log(`  ✓ Indexed device: ${device.name}`)
    } catch (err) {
      console.error(`  ✗ Failed to index device ${device.name}:`, err)
    }
  }

  // ── Index Articles ────────────────────────────────────────
  console.log('\nFetching published articles...')
  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .limit(500)

  const articleList = articles ?? []
  console.log(`Found ${articleList.length} published articles. Indexing...`)

  for (const article of articleList) {
    try {
      await indexArticle(article)
      console.log(`  ✓ Indexed article: ${article.title}`)
    } catch (err) {
      console.error(`  ✗ Failed to index article ${article.title}:`, err)
    }
  }

  console.log(`\n✅ Reindex complete! Indexed ${deviceList.length} devices, ${articleList.length} articles.`)

  // ── Index YouTube Videos (from RSS or Data API) ─────────────────────
  console.log('\nFetching YouTube videos...')
  try {
    const videos = await fetchAllYouTubeVideos()
    console.log(`Found ${videos.length} YouTube videos. Indexing...`)

    let indexed = 0
    for (const video of videos) {
      try {
        await indexYouTubeVideo(video)
        indexed++
        console.log(`  ✓ Indexed YouTube video: ${video.title}`)
      } catch (err) {
        console.error(`  ✗ Failed to index YouTube video "${video.title}":`, err)
      }
    }
    console.log(`\n✅ Indexed ${indexed} YouTube videos.`)
  } catch (err) {
    console.error('YouTube video indexing failed:', err)
  }
}

reindexAll()
  .catch((err) => {
    console.error('Reindex failed:', err)
    process.exit(1)
  })