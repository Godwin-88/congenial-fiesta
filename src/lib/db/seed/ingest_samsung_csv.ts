import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'

const { Pool } = pg

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres.vgsvlfhzwfpymzvrdjms:mcp-20260721-fweezytech@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
})

interface CsvRow {
  [key: string]: string
}

const DATA_PATH = '/tmp/kilo/samsung_devices.json'

function nullableScore(v: string): number {
  const str = (v || '').trim()
  if (!str) return 0
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

function nullableInt(v: string): number | null {
  const str = (v || '').trim()
  if (!str) return null
  const num = parseInt(str, 10)
  return isNaN(num) ? null : num
}

function nullableText(v: string): string | null {
  const str = (v || '').trim()
  return str === '' ? null : str
}

function validJsonOr(v: string, fallback: string): string {
  const str = (v || '').trim()
  if (!str) return fallback
  try {
    JSON.parse(str)
    return str
  } catch {
    return fallback
  }
}

// Wrap plain text in Tiptap rich text format for the jsonb verdict_full column
function richText(text: string): string {
  const safe = text || ''
  return JSON.stringify({
    root: {
      children: [
        {
          children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: safe, type: 'text', version: 1 }],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}

async function main() {
  console.log('📖 Reading device data...')
  const devices: CsvRow[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
  console.log(`  Found ${devices.length} devices`)

  // Resolve device_type IDs
  console.log('\n🔍 Resolving device type IDs...')
  const dtResult = await pool.query(
    "SELECT id, slug FROM device_types WHERE slug IN ('phone','tablet','smartwatch','tv','soundbar','speaker','headphone','earbuds')"
  )
  const dtMap = new Map<string, number>()
  for (const row of dtResult.rows) {
    dtMap.set(row.slug, parseInt(row.id))
    console.log(`  ✓ device_type '${row.slug}' -> id=${row.id}`)
  }

  // Get Samsung brand id
  const brandResult = await pool.query("SELECT id FROM brands WHERE name = 'Samsung'")
  const brandId = brandResult.rows.length > 0 ? parseInt(brandResult.rows[0].id) : 1
  console.log(`  ✓ Samsung brand id=${brandId}`)

  // Define columns in exact DB order
  const columns = [
    'name', 'slug', 'brand_id', 'device_type_id', 'major_category',
    'price_tier', 'release_year', 'price_kes', 'price_usd', 'tagline',
    'status', 'score_display', 'score_performance', 'score_camera',
    'score_battery', 'score_value', 'scores_overall',
    'verdict_pros', 'verdict_cons', 'verdict_bottom_line', 'verdict_full',
    'images',
    'specs_design', 'specs_display', 'specs_processor', 'specs_memory',
    'specs_camera', 'specs_battery', 'specs_connectivity', 'specs_software',
    'specs_network', 'buy_links',
    'related_video_id', 'related_tiktok_url',
    'seo_title', 'seo_description', 'seo_og_image',
    'created_at', 'updated_at',
  ]

  const updateCols = columns.filter((c) => c !== 'slug' && c !== 'created_at')
  const updateSet = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ')

  console.log(`\n📥 Inserting/upserting ${devices.length} devices...`)
  let success = 0
  let failed = 0

  for (const d of devices) {
    const dtId = dtMap.get(d.device_type)
    if (!dtId) {
      console.error(`  ✗ Unknown device_type '${d.device_type}' for ${d.name}`)
      failed++
      continue
    }

    // Map device_type to major_category based on device_types table mapping
    const categoryMap: Record<string, string> = {
      phone: 'phones',
      tablet: 'phones',
      smartwatch: 'phones',
      tv: 'televisions',
      soundbar: 'sound',
      speaker: 'sound',
      headphone: 'sound',
      earbuds: 'sound',
    }
    const majorCategory = categoryMap[d.device_type] || d.major_category

    const values = [
      d.name,                              // name
      d.slug,                              // slug
      brandId,                             // brand_id
      dtId,                                // device_type_id
      majorCategory,                       // major_category
      nullableText(d.price_tier),          // price_tier
      nullableInt(d.release_year),         // release_year
      nullableInt(d.price_kes),            // price_kes
      nullableInt(d.price_usd),            // price_usd
      nullableText(d.tagline),             // tagline
      d.status,                            // status
      nullableScore(d.score_display),      // score_display (NOT NULL)
      nullableScore(d.score_performance),  // score_performance (NOT NULL)
      nullableScore(d.score_camera),       // score_camera (NOT NULL)
      nullableScore(d.score_battery),      // score_battery (NOT NULL)
      nullableScore(d.score_value),        // score_value (NOT NULL)
      nullableScore(d.scores_overall) || null, // scores_overall (nullable)
      validJsonOr(d.verdict_pros, '[]'),   // verdict_pros (jsonb)
      validJsonOr(d.verdict_cons, '[]'),   // verdict_cons (jsonb)
      nullableText(d.verdict_bottom_line), // verdict_bottom_line (text)
      richText(nullableText(d.verdict_full) || ''), // verdict_full (jsonb - rich text)
      validJsonOr(d.images, '[]'),         // images (jsonb)
      validJsonOr(d.specs_design, '{}'),   // specs_design (jsonb)
      validJsonOr(d.specs_display, '{}'),  // specs_display (jsonb)
      validJsonOr(d.specs_processor, '{}'),// specs_processor (jsonb)
      validJsonOr(d.specs_memory, '{}'),   // specs_memory (jsonb)
      validJsonOr(d.specs_camera, '{}'),   // specs_camera (jsonb)
      validJsonOr(d.specs_battery, '{}'),  // specs_battery (jsonb)
      validJsonOr(d.specs_connectivity, '{}'), // specs_connectivity (jsonb)
      validJsonOr(d.specs_software, '{}'), // specs_software (jsonb)
      validJsonOr(d.specs_network, '{}'),  // specs_network (jsonb)
      validJsonOr(d.buy_links, '[]'),      // buy_links (jsonb)
      nullableText(d.related_video_id),    // related_video_id
      nullableText(d.related_tiktok_url),  // related_tiktok_url
      nullableText(d.seo_title),           // seo_title
      nullableText(d.seo_description),     // seo_description
      nullableText(d.seo_og_image),       // seo_og_image
      d.created_at,                        // created_at
      d.updated_at,                        // updated_at
    ]

    // Build placeholder array
    const placeholders = columns.map((_, i) => `$${i + 1}`)

    // For the upsert, we need to cast JSONB columns properly.
    // Since pg sends all string params as text, we need explicit casts.
    // The JSONB columns need ::jsonb cast in the VALUES clause.

    // Build the VALUES clause with proper casts for jsonb columns
    const valueClauses = columns.map((col, i) => {
      const val = `$${i + 1}`
      if (['verdict_pros', 'verdict_cons', 'verdict_full', 'images',
           'specs_design', 'specs_display', 'specs_processor', 'specs_memory',
           'specs_camera', 'specs_battery', 'specs_connectivity', 'specs_software',
           'specs_network', 'buy_links'].includes(col)) {
        return `${val}::jsonb`
      }
      return val
    })

    const sql = `
      INSERT INTO devices (${columns.join(', ')})
      VALUES (${valueClauses.join(', ')})
      ON CONFLICT (slug) DO UPDATE SET ${updateSet}
    `

    try {
      await pool.query(sql, values)
      success++
      console.log(`  ✓ upserted '${d.name}' (slug=${d.slug})`)
    } catch (err: any) {
      failed++
      console.error(`  ✗ Failed '${d.name}': ${err.message}`)
    }
  }

  console.log(`\n📊 Summary: ${success} succeeded, ${failed} failed out of ${devices.length}`)
  await pool.end()

  if (failed > 0) process.exit(1)
}

main().catch(async (err) => {
  console.error('❌ Ingestion failed:', err)
  await pool.end()
  process.exit(1)
})
