import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('awards')
      .select('*')
      .order('display_order', { ascending: true })
      .order('year', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    if (!body.award_name?.trim() || !body.awarding_body?.trim() || body.year === undefined) {
      return NextResponse.json({ error: 'Award name, awarding body, and year are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('awards')
      .insert({
        award_name: body.award_name.trim(),
        awarding_body: body.awarding_body.trim(),
        year: body.year,
        certificate_image: body.certificate_image?.trim() ?? null,
        award_url: body.award_url?.trim() ?? null,
        display_order: body.display_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
