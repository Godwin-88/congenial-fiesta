import { Client } from '@upstash/qstash'

const token = process.env.QSTASH_TOKEN
const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL

if (!token) {
  console.error('Missing env var QSTASH_TOKEN')
  process.exit(1)
}

if (!BASE_URL) {
  console.error('Missing env var NEXT_PUBLIC_SERVER_URL')
  process.exit(1)
}

const qstash = new Client({ token })

const jobs = [
  {
    name: 'keep-alive',
    url: `${BASE_URL}/api/cron/keep-alive`,
    // Every 5 days at 06:00 UTC
    cron: '0 6 */5 * *',
  },
  {
    name: 'aggregate-analytics',
    url: `${BASE_URL}/api/cron/aggregate-analytics`,
    // Daily at 23:00 UTC (02:00 EAT)
    cron: '0 23 * * *',
  },
  {
    name: 'weekly-digest',
    url: `${BASE_URL}/api/cron/weekly-digest`,
    // Mondays at 05:00 UTC (08:00 EAT)
    cron: '0 5 * * 1',
  },
  {
    name: 'seed-coming-soon',
    url: `${BASE_URL}/api/cron/seed-coming-soon`,
    // Daily at 06:00 UTC (09:00 EAT)
    cron: '0 6 * * *',
  },
  {
    name: 'import-youtube-devices',
    url: `${BASE_URL}/api/cron/import-youtube-devices`,
    // Daily at 07:00 UTC (10:00 EAT)
    cron: '0 7 * * *',
  },
]

async function registerCrons() {
  for (const job of jobs) {
    try {
      const result = await qstash.schedules.create({
        destination: job.url,
        cron: job.cron,
      })
      console.log(`✅ Registered: ${job.name} → ${result.scheduleId}`)
    } catch (err) {
      console.error(`❌ Failed: ${job.name}`, err instanceof Error ? err.message : err)
    }
  }
  console.log('\nAll cron jobs registered. View at https://console.upstash.com/qstash')
}

registerCrons()