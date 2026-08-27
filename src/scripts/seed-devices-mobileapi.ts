#!/usr/bin/env tsx
/**
 * Seed devices into the FweezyTech DB from MobileAPI.dev.
 *
 * Examples:
 *   # Dry run of the last 2 years (no DB writes), see what would import:
 *   npx tsx src/scripts/seed-devices-mobileapi.ts --dry-run --limit 20
 *
 *   # Inspect the raw shape of one device (validate the field mapping):
 *   npx tsx src/scripts/seed-devices-mobileapi.ts --inspect
 *
 *   # Populate Phones + Apple Macs for 2025 & 2026:
 *   npx tsx src/scripts/seed-devices-mobileapi.ts --years 2025,2026
 *
 *   # Only a specific brand (great for testing):
 *   npx tsx src/scripts/seed-devices-mobileapi.ts --brand Samsung --limit 50
 *
 *   # Refresh specs on already-imported devices:
 *   npx tsx src/scripts/seed-devices-mobileapi.ts --years 2025 --update
 *
 * Requires MOBILEAPI_KEY in .env.local. Televisions and Sound are not
 * covered by this source and will be skipped automatically.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fetchAllPages, debugList, fetchDeviceDetail } from '@/lib/devices/mobileapi'
import { ingestMobileApi } from '@/lib/devices/ingest-mobileapi'

config({ path: '.env.local' })

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    if (key === 'no-detail' || key === 'dry-run' || key === 'update' || key === 'inspect') {
      args[key] = true
    } else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) {
      args[key] = argv[++i]
    } else {
      args[key] = true
    }
  }
  return args
}

function listArg(v: string | boolean | undefined): string[] | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'string') return undefined
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

function numArg(v: string | boolean | undefined, fallback: number): number {
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.inspect) {
    if (!process.env.MOBILEAPI_KEY) {
      console.error('MOBILEAPI_KEY is not set.')
      process.exit(1)
    }
    const year = new Date().getFullYear()
    const paths = [
      `/devices/by-year/?year=${year}&page=1`,
      `/devices/?page=1&limit=1`,
    ]
    for (const p of paths) {
      const { status, url, body } = await debugList(p)
      console.log(`\n=== ${p} -> HTTP ${status} ===`)
      console.log('URL:', url)
      const preview = typeof body === 'string' ? body.slice(0, 800) : JSON.stringify(body, null, 2).slice(0, 1200)
      console.log(preview)
    }

    // Also dump a full detail object to map the spec fields.
    const listRes = await debugList(`/devices/by-year/?year=${year}&page=1&limit=1`)
    const firstId = listRes.body?.devices?.[0]?.id
    if (firstId) {
      const det = await fetchDeviceDetail(firstId)
      console.log(`\n=== DETAIL id=${firstId} -> keys ===`)
      console.log(Object.keys(det).join(', '))
      console.log('\n' + JSON.stringify(det, null, 2).slice(0, 3500))
    }
    process.exit(0)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  if (!process.env.MOBILEAPI_KEY) {
    console.error('MOBILEAPI_KEY is not set in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const opts = {
    types: listArg(args.types),
    years: listArg(args.years)?.map(Number),
    brand: typeof args.brand === 'string' ? args.brand : undefined,
    limit: args.limit !== undefined ? numArg(args.limit, Infinity) : undefined,
    delayMs: numArg(args.delay ?? '350', 350),
    detail: !args['no-detail'],
    dryRun: !!args['dry-run'],
    update: !!args.update,
    concurrency: numArg(args.concurrency ?? '6', 6),
  }

  console.log('Starting MobileAPI.dev ingestion with options:', opts, '\n')
  const result = await ingestMobileApi(supabase, opts)
  console.log('\n=== Ingestion complete ===')
  console.log(result)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
