import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fweezytech.com'

    // Check if admin user already exists
    const { data: existing } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', adminEmail)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        message: `Admin user "${adminEmail}" already exists`,
        email: adminEmail,
        loginUrl: '/auth/login',
      })
    }

    // Attempt to create admin via Supabase Auth admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: process.env.ADMIN_SEED_PASSWORD || 'Admin123!',
      email_confirm: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data.user) {
      // Add to admin_users table
      await supabase.from('admin_users').insert({
        id: data.user.id,
        email: data.user.email,
        role: 'admin',
      })
    }

    return NextResponse.json({
      message: `Created Supabase admin user "${adminEmail}"`,
      email: adminEmail,
      loginUrl: '/auth/login',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}