#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load .env.local BEFORE any other module imports
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { fetchYouTubeVideos } from '../lib/youtube/client'
import { importDevicesFromYouTube } from '../lib/devices/import'

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('✗ Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('Fetching latest YouTube videos...')
  const videos = await fetchYouTubeVideos(50)
  console.log(`✓ Fetched ${videos.length} videos`)

  console.log('Importing devices...')
  const result = await importDevicesFromYouTube(supabase, videos)

  console.log('')
  console.log('── Import Summary ─────────────────────────')
  console.log(`  Fetched:  ${result.fetched}`)
  console.log(`  Created:  ${result.created}`)
  console.log(`  Updated:  ${result.updated}`)
  console.log(`  Skipped:  ${result.skipped}`)
  console.log('───────────────────────────────────────────')
  console.log('Done. New devices are published with 0 scores and can be scored in the admin panel.')
}

run().catch((error) => {
  console.error('✗ Import failed:', error)
  process.exit(1)
})