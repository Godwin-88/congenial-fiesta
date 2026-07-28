import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('contentType')

    let query = supabase
      .from('user_saved_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (contentType && ['article', 'device', 'comparison'].includes(contentType)) {
      query = query.eq('content_type', contentType)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content_type, content_id, metadata } = body

    if (!content_type || !content_id) {
      return NextResponse.json({ error: 'content_type and content_id are required' }, { status: 400 })
    }

    if (!['article', 'device', 'comparison'].includes(content_type)) {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_saved_items')
      .insert({
        user_id: user.id,
        content_type,
        content_id,
        metadata: metadata ?? {},
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already saved' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const content_type = searchParams.get('contentType')
    const content_id = searchParams.get('contentId')

    if (!content_type || !content_id) {
      return NextResponse.json({ error: 'contentType and contentId are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_saved_items')
      .delete()
      .eq('user_id', user.id)
      .eq('content_type', content_type)
      .eq('content_id', content_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}