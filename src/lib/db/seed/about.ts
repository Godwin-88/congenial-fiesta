import { config } from 'dotenv'
config({ path: '.env.local' })

import { getPayload } from 'payload'

async function seedAbout() {
  const { default: payloadConfig } = await import('@payload-config')
  const payload = await getPayload({ config: payloadConfig })

  // Seed milestones
  const milestones = [
    { year: 2022, title: 'Launched FweezyTech on YouTube', displayOrder: 1 },
    { year: 2022, title: 'First 1,000 YouTube Subscribers', displayOrder: 2 },
    { year: 2023, title: 'Expanded to TikTok — Hit 10K followers in 30 days', displayOrder: 1 },
    { year: 2023, title: 'First brand partnership — Tecno Mobile', displayOrder: 2 },
    { year: 2024, title: 'Crossed 100K combined followers across all platforms', displayOrder: 1 },
  ]

  for (const milestone of milestones) {
    const exists = await payload.find({
      collection: 'milestones',
      where: { title: { equals: milestone.title } },
      limit: 1,
    })

    if (exists.docs.length === 0) {
      await payload.create({
        collection: 'milestones',
        data: milestone,
      })
      console.log(`✅ Created milestone: ${milestone.title}`)
    } else {
      console.log(`⏭️ Milestone already exists: ${milestone.title}`)
    }
  }

  console.log('✅ About seed complete!')
}

seedAbout().catch(console.error)