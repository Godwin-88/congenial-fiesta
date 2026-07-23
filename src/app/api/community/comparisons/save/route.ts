'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  return NextResponse.json({ comparisons: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: { name?: string; deviceSlugs: string[] } = await request.json()

  if (!body.deviceSlugs || body.deviceSlugs.length < 2) {
    return NextResponse.json({ error: 'At least 2 device slugs required' }, { status: 400 })
  }

  if (body.deviceSlugs.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 devices per comparison' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_comparisons')
    .insert({
      user_id: user.id,
      name: body.name ?? 'Untitled Comparison',
      device_slugs: body.deviceSlugs,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save comparison:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ comparison: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Comparison ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('saved_comparisons')
    .delete()
    .eq('id', parseInt(id, 10))
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete comparison:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}