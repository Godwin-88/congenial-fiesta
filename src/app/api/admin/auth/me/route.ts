import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    const adminUser = await requireAdminAuth()
    return NextResponse.json({ user: adminUser })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json(
      { error: message },
      { status: message === 'Forbidden' ? 403 : 401 }
    )
  }
}