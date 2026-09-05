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

  console.log('Running agent pipeline (Groq extraction + web-search image curation)...')
  const result = await importDevicesFromYouTube(supabase, videos, {
    aiExtract: true,
    curateImages: true,
  })

  console.log('')
  console.log('── Import Summary ─────────────────────────')
  console.log(`  Fetched:        ${result.fetched}`)
  console.log(`  Created:        ${result.created}`)
  console.log(`  Updated:        ${result.updated}`)
  console.log(`  Skipped:        ${result.skipped}`)
  console.log(`  AI extracted:   ${result.aiExtracted}`)
  console.log(`  Images curated: ${result.imagesCurated}`)
  console.log('───────────────────────────────────────────')
  console.log('Done. New devices are DRAFTS — review + publish them in /admin/devices.')
}

run().catch((error) => {
  console.error('✗ Import failed:', error)
  process.exit(1)
})