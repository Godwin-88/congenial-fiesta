import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDeviceBySlug } from '@/lib/devices/queries'
import type { Device } from '@/types/cms'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_comparisons')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch saved comparisons:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    // Enrich each comparison with device data (name, score, image)
    const enriched = await Promise.all(
      (data ?? []).map(async (comp: Record<string, unknown>) => {
        const slugs = comp.device_slugs as string[] ?? []
        const devices: Array<{
          slug: string
          name: string
          score: number | null
          imageUrl: string | null
        }> = []

        for (const slug of slugs) {
          const device = await getDeviceBySlug(slug)
          if (device) {
            const d = device as unknown as Device
            const images = d.images as Array<Record<string, unknown>> | undefined
            const primaryImage = images?.find((img: any) => img.isPrimary) ?? images?.[0]
            devices.push({
              slug: d.slug,
              name: d.name,
              score: d.scores_overall,
              imageUrl: primaryImage?.url ? String(primaryImage.url) : null,
            })
          }
        }

        return {
          id: comp.id,
          name: comp.name,
          device_slugs: slugs,
          devices,
          created_at: comp.created_at,
          updated_at: comp.updated_at,
        }
      }),
    )

    return NextResponse.json({ comparisons: enriched })
  } catch (e) {
    console.error('saved-comparisons error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}