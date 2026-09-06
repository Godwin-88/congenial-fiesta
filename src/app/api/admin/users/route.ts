import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole, isOwnerRole, isValidAdminRole } from '@/lib/admin/roles'

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
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    if (!body.email?.trim() || !body.display_name?.trim()) {
      return NextResponse.json({ error: 'Email and display name are required' }, { status: 400 })
    }

    // Only an owner may grant the owner role; admins can assign admin/editor/viewer.
    if (body.role === 'owner' && !isOwnerRole(adminUser.role)) {
      return NextResponse.json(
        { error: 'Only the owner can grant the owner role' },
        { status: 403 }
      )
    }

    if (!isValidAdminRole(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Find the auth user via the GoTrue Admin API (auth.users is not exposed
    // through PostgREST, so a direct .from('auth.users') query would 500).
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 })
    }
    const normalizedEmail = body.email.trim().toLowerCase()
    const authUser = authUsers.users.find((u) => u.email?.toLowerCase() === normalizedEmail)

    if (!authUser) {
      return NextResponse.json(
        { error: 'User not found in auth system. Ask them to sign up first.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('admin_users')
      .upsert({
        id: authUser.id,
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
