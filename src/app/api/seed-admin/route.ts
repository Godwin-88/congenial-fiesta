import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return createAdminUser(null)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return createAdminUser(body)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

async function createAdminUser(body: { email?: string; password?: string; display_name?: string } | null) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const adminEmail = body?.email || process.env.ADMIN_EMAIL || 'admin@fweezytech.com'
    const adminPassword = body?.password || process.env.ADMIN_SEED_PASSWORD || 'Admin123!'
    const displayName = body?.display_name || process.env.ADMIN_DISPLAY_NAME || 'Admin User'

    // 1. Find or create auth user
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({ error: `Auth check failed: ${listError.message}` }, { status: 500 })
    }

    let authUser = authUsers?.users.find(u => u.email === adminEmail)

    if (!authUser) {
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      })

      if (createError) {
        return NextResponse.json({ error: `Auth user creation failed: ${createError.message}` }, { status: 500 })
      }

      authUser = data.user
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Failed to get auth user' }, { status: 500 })
    }

    // 2. Ensure admin_users record exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('id, display_name, role')
      .eq('id', authUser.id)
      .maybeSingle()

    if (checkError) {
      return NextResponse.json({ error: `admin_users check failed: ${checkError.message}` }, { status: 500 })
    }

    if (!existingAdmin) {
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          id: authUser.id,
          display_name: displayName,
          role: 'admin',
        })

      if (insertError) {
        return NextResponse.json({ error: `admin_users insert failed: ${insertError.message}` }, { status: 500 })
      }
    }

    // 3. Verify the link
    const { data: verified } = await supabase
      .from('admin_users')
      .select('id, display_name, role')
      .eq('id', authUser.id)
      .single()

    return NextResponse.json({
      message: 'Admin user ready',
      email: adminEmail,
      authUserId: authUser.id,
      adminRecord: verified,
      loginUrl: '/auth/admin-login',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
