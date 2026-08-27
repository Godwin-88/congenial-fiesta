import { config } from 'dotenv'

config({ path: '.env.local' })

async function main() {
  const { redis } = await import('@/lib/upstash/redis')
  if (!redis) {
    console.error('Redis not configured.')
    process.exit(1)
  }
  const patterns = ['devices:list:*', 'devices:static-params', 'devices:top:*', 'brands:*']
  let total = 0
  for (const p of patterns) {
    const keys = await redis.keys(p)
    if (keys && keys.length) {
      await redis.del(...keys)
      total += keys.length
      console.log(`cleared ${keys.length} keys matching ${p}`)
    } else {
      console.log(`no keys for ${p}`)
    }
  }
  console.log(`\nTotal cache keys cleared: ${total}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
