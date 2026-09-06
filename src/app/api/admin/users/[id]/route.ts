import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole, isOwnerRole, isValidAdminRole } from '@/lib/admin/roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await getAdminClient()

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    if (body.role === 'owner' && !isOwnerRole(adminUser.role)) {
      return NextResponse.json({ error: 'Only the owner can grant the owner role' }, { status: 403 })
    }

    if (!isValidAdminRole(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent demoting the last remaining owner (would lock everyone out).
    if (body.role !== 'owner') {
      const { count } = await supabase
        .from('admin_users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'owner')
      if (count !== null && count <= 1) {
        const target = await supabase.from('admin_users').select('role').eq('id', id).maybeSingle()
        if (target.data?.role === 'owner') {
          return NextResponse.json(
            { error: 'Cannot demote the last owner. Promote another user to owner first.' },
            { status: 400 }
          )
        }
      }
    }

    const { data, error } = await supabase
      .from('admin_users')
      .update({ role: body.role })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await getAdminClient()

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Prevent deleting the last remaining owner (would lock everyone out).
    const { count } = await supabase
      .from('admin_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
    if (count !== null && count <= 1) {
      const target = await supabase.from('admin_users').select('role').eq('id', id).maybeSingle()
      if (target.data?.role === 'owner') {
        return NextResponse.json({ error: 'Cannot delete the last owner' }, { status: 400 })
      }
    }

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
