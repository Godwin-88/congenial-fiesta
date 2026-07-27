import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function seedAbout() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Seed milestones
  const milestones = [
    { year: 2022, title: 'Launched FweezyTech on YouTube', display_order: 1 },
    { year: 2022, title: 'First 1,000 YouTube Subscribers', display_order: 2 },
    { year: 2023, title: 'Expanded to TikTok — Hit 10K followers in 30 days', display_order: 1 },
    { year: 2023, title: 'First brand partnership — Tecno Mobile', display_order: 2 },
    { year: 2024, title: 'Crossed 100K combined followers across all platforms', display_order: 1 },
  ]

  for (const milestone of milestones) {
    const { data: exists } = await supabase
      .from('milestones')
      .select('id')
      .eq('title', milestone.title)
      .limit(1)

    if (!exists || exists.length === 0) {
      await supabase.from('milestones').insert(milestone)
      console.log(`✅ Created milestone: ${milestone.title}`)
    } else {
      console.log(`⏭️ Milestone already exists: ${milestone.title}`)
    }
  }

  console.log('✅ About seed complete!')
}

seedAbout().catch(console.error)