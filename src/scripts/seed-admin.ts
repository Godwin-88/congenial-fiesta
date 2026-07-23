#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load .env.local BEFORE any other module imports
config({ path: '.env.local' })

async function createAdminUser() {
  // Use Payload's REST API directly instead of the SDK to avoid loadEnv issues
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fweezytech.com'
  const adminPassword = 'Admin123!'

  // First check if user exists via the Payload REST API
  const checkResponse = await fetch(`${serverUrl}/api/users?where[email][equals]=${encodeURIComponent(adminEmail)}&depth=0&limit=1`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (checkResponse.ok) {
    const checkData = await checkResponse.json()
    if (checkData.docs && checkData.docs.length > 0) {
      console.log(`✓ Admin user "${adminEmail}" already exists`)
      console.log(`  Login at ${serverUrl}/admin`)
      process.exit(0)
    }
  }

  // Create admin user via Payload REST API
  const createResponse = await fetch(`${serverUrl}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    }),
  })

  if (createResponse.ok) {
    const data = await createResponse.json()
    console.log(`✓ Created Payload admin user: ${adminEmail} / ${adminPassword}`)
    console.log(`  Login at ${serverUrl}/admin`)
    process.exit(0)
  } else {
    const errorData = await createResponse.text()
    console.error(`✗ Failed to create admin user: ${errorData}`)
    process.exit(1)
  }
}

createAdminUser().catch((error) => {
  console.error('✗ Failed to create admin user:', error)
  process.exit(1)
})