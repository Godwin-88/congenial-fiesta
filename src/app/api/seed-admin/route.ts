import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fweezytech.com'
    const adminPassword = 'Admin123!'

    // Check if admin user already exists
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: adminEmail } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json({
        message: `Admin user "${adminEmail}" already exists`,
        email: adminEmail,
        loginUrl: '/admin',
      })
    }

    // Create admin user
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      },
    })

    return NextResponse.json({
      message: `Created Payload admin user`,
      email: adminEmail,
      password: adminPassword,
      loginUrl: '/admin',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}