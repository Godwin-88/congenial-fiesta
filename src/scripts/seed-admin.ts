#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load .env.local BEFORE any other module imports
config({ path: '.env.local' })

async function createAdminUser() {
  // Use Payload's REST API directly instead of the SDK to avoid loadEnv issues
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fweezytech.com'
  const adminPassword = 'Admin123!'

  // First, create the initial admin by first logging in to get a session token.
  // Payload's first-user bootstrapping allows creating a user with role: 'admin'
  // via POST /api/users without auth, but only if no admin exists yet.
  // After that, we must authenticate to modify users.

  // 1. Try to log in first (in case user already exists but has wrong role)
  const loginResponse = await fetch(`${serverUrl}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  })

  if (loginResponse.ok) {
    const loginData = await loginResponse.json()
    const token = loginData.token
    console.log(`✓ Logged in as "${adminEmail}"`)

    // 2. Check the user's current role
    const meResponse = await fetch(`${serverUrl}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (meResponse.ok) {
      const meData = await meResponse.json()
      const currentRole = meData?.user?.role
      if (currentRole === 'admin') {
        console.log(`✓ User "${adminEmail}" already has admin role`)
        console.log(`  Login at ${serverUrl}/admin`)
        process.exit(0)
      }
      // 3. Upgrade role to admin using auth token
      const userId = meData?.user?.id
      if (userId) {
        const updateResponse = await fetch(`${serverUrl}/api/users/${userId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'admin' }),
        })
        if (updateResponse.ok) {
          console.log(`✓ Upgraded "${adminEmail}" from "${currentRole}" to admin`)
          console.log(`  Login at ${serverUrl}/admin`)
          process.exit(0)
        } else {
          const err = await updateResponse.text()
          console.error(`✗ Failed to upgrade role: ${err}`)
          process.exit(1)
        }
      }
    }
  }

  // 4. User doesn't exist yet — create as admin via first-user bootstrap
  console.log(`Creating admin user "${adminEmail}"...`)
  const createResponse = await fetch(`${serverUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    }),
  })

  if (createResponse.ok) {
    console.log(`✓ Created admin user: ${adminEmail} / ${adminPassword}`)
    console.log(`  Login at ${serverUrl}/admin`)
    process.exit(0)
  } else {
    const errorData = await createResponse.text()
    console.error(`✗ Failed to create admin user: ${errorData}`)
    console.error('')
    console.error('Possible fixes:')
    console.error('  1. Run the dev server first (npm run dev)')
    console.error('  2. If the user exists with viewer role, the login step above should upgrade them')
    console.error('  3. If login fails, delete the user from the database and re-run this script')
    process.exit(1)
  }
}

createAdminUser().catch((error) => {
  console.error('✗ Failed to create admin user:', error)
  process.exit(1)
})