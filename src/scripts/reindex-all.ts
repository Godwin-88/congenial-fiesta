import { getPayload } from 'payload'
import config from '@payload-config'
import { indexDevice, indexArticle } from '@/lib/search/indexing'

async function reindexAll() {
  console.log('Starting reindex of all content into Upstash Search + Vector...\n')

  const payload = await getPayload({ config })

  // ── Index Devices ─────────────────────────────────────────
  console.log('Fetching published devices...')
  const deviceResult = await payload.find({
    collection: 'devices',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: { equals: 'published' } } as any,
    limit: 500,
    depth: 2,
  })

  const devices = deviceResult.docs as any[]
  console.log(`Found ${devices.length} published devices. Indexing...`)

  for (const device of devices) {
    try {
      await indexDevice(device)
      console.log(`  ✓ Indexed device: ${device.name}`)
    } catch (err) {
      console.error(`  ✗ Failed to index device ${device.name}:`, err)
    }
  }

  // ── Index Articles ────────────────────────────────────────
  console.log('\nFetching published articles...')
  const articleResult = await payload.find({
    collection: 'articles',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: { equals: 'published' } } as any,
    limit: 500,
    depth: 2,
  })

  const articles = articleResult.docs as any[]
  console.log(`Found ${articles.length} published articles. Indexing...`)

  for (const article of articles) {
    try {
      await indexArticle(article)
      console.log(`  ✓ Indexed article: ${article.title}`)
    } catch (err) {
      console.error(`  ✗ Failed to index article ${article.title}:`, err)
    }
  }

  console.log(`\n✅ Reindex complete! Indexed ${devices.length} devices, ${articles.length} articles.`)
}

reindexAll()
  .catch((err) => {
    console.error('Reindex failed:', err)
    process.exit(1)
  })