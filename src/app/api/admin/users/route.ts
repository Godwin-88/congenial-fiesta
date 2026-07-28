import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })

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

    if (!body.email?.trim() || !body.display_name?.trim()) {
      return NextResponse.json({ error: 'Email and display name are required' }, { status: 400 })
    }

    if (!['admin', 'editor', 'viewer'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

     const { data: authUsers } = await supabase
       .from('auth.users')
       .select('id')
       .eq('email', body.email.trim())
       .limit(1)
       .maybeSingle()

     if (!authUsers) {
       return NextResponse.json(
         { error: 'User not found in auth system. Ask them to sign up first.' },
         { status: 400 }
       )
     }

     const { data, error } = await supabase
       .from('admin_users')
       .upsert({
         id: (authUsers as { id: string }).id,
         display_name: body.display_name.trim(),
         role: body.role,
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
