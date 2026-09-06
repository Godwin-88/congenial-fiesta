import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { requireOwnerRole } from '@/lib/secrets/guard'
import type { AdminUser } from '@/types/cms'

/**
 * Account & Security API (Settings -> Account & Security tab).
 *
 * GET — current admin's auth profile + the team roster + recent auth audit.
 * POST — one of:
 *   change-password (any admin): verify current password, then set a new one.
 *   change-email     (any admin): update email (Supabase sends a confirmation).
 *   reset-password   (owner only): force-set a team member's password + audit.
 *
 * No secrets are ever returned; responses only contain metadata.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASS = 8

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 })
}

/** Fetch all auth users (paginated) via the GoTrue Admin API. */
async function listAuthUsers(supabase: ReturnType<typeof getAdminClient>) {
  const users: Array<{ id: string; email?: string | null; app_metadata?: unknown; last_sign_in_at?: string | null; created_at?: string | null; email_confirmed_at?: string | null }> = []
  const PAGE = 50
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) throw new Error(error.message)
    users.push(...(data?.users ?? []))
    if ((data?.users?.length ?? 0) < PAGE) break
  }
  return users
}

/** Fetch a single auth user via the GoTrue Admin API. */
async function getAuthUser(supabase: ReturnType<typeof getAdminClient>, id: string) {
  const { data, error } = await supabase.auth.admin.getUserById(id)
  if (error) throw new Error(error.message)
  return data?.user ?? null
}

export async function GET() {
  try {
    const admin = await requireAdminAuth()
    const supabase = getAdminClient()

    // 1) The acting admin's Supabase auth profile. Use the GoTrue Admin API —
    //    `auth.users` is in the `auth` schema and NOT queryable via PostgREST
    //    (throws "Could not find the table 'public.auth.users'").
    const authUsers = await listAuthUsers(supabase)
    const authUser = authUsers.find((u) => u.id === admin.id) ?? null

    const providers: string[] =
      (authUser?.app_metadata as { providers?: string[] } | null)?.providers ?? []
    const hasPassword = Array.isArray(providers) && providers.includes('email')

    // 2) Team roster: admin_users joined to auth emails.
    const { data: teamRows, error: teamErr } = await supabase
      .from('admin_users')
      .select('id, display_name, role, created_at, updated_at')
      .order('created_at', { ascending: true })

    if (teamErr) return serverError(teamErr.message)

    const emailMap = new Map<string, string>()
    for (const u of authUsers) if (u.email) emailMap.set(u.id, u.email)

    const team: Array<AdminUser & { email?: string }> = (teamRows ?? []).map((r) => ({
      id: r.id,
      display_name: r.display_name,
      role: r.role,
      created_at: r.created_at,
      updated_at: r.updated_at ?? r.created_at,
      ...(emailMap.get(r.id) ? { email: emailMap.get(r.id) } : {}),
    }))

    // 3) Recent account-security audit trail.
    const { data: audit, error: auditErr } = await supabase
      .from('auth_audit')
      .select('id, action, target_email, admin_email, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (auditErr) return serverError(auditErr.message)

    return NextResponse.json({
      me: {
        id: admin.id,
        displayName: admin.display_name,
        role: admin.role,
        email: authUser?.email ?? null,
        emailConfirmedAt: authUser?.email_confirmed_at ?? null,
        lastSignInAt: authUser?.last_sign_in_at ?? null,
        createdAt: authUser?.created_at ?? admin.created_at,
        providers,
        hasPassword,
      },
      team,
      audit: audit ?? [],
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminAuth()
    const supabase = getAdminClient()

    const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
    const { action } = body

    // Resolve the acting admin's email for the audit record.
    const actorAuth = await getAuthUser(supabase, admin.id)
    const actorEmail: string | null = actorAuth?.email ?? null

    if (action === 'change-password') {
      const currentPassword = body.currentPassword as string | undefined
      const newPassword = body.newPassword as string | undefined

      if (typeof newPassword !== 'string' || newPassword.length < MIN_PASS) {
        return clientError(`New password must be at least ${MIN_PASS} characters.`)
      }
      if (newPassword.length > 200) return clientError('New password is too long.')

      // Verify the current password before allowing the change (if the account
      // uses a password provider). Sign in with a stateless server client.
      if (typeof currentPassword === 'string' && currentPassword.length > 0) {
        const verifier = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { getAll: () => [], setAll: () => {} } }
        )
        const { error: signInErr } = await verifier.auth.signInWithPassword({
          email: actorEmail ?? '',
          password: currentPassword,
        })
        if (signInErr) return clientError('Current password is incorrect.')
      }
      // No current password supplied — allow only when the account has no
      // password provider yet (e.g. joined via magic link).
      else {
        const me = await getAuthUser(supabase, admin.id)
        const providers =
          (me?.app_metadata as { providers?: string[] } | null)?.providers ?? []
        if (Array.isArray(providers) && providers.includes('email')) {
          return clientError('Please enter your current password.')
        }
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(admin.id, {
        password: newPassword,
      })
      if (updateErr) return serverError(updateErr.message)

      await supabase.from('auth_audit').insert({
        action: 'change_password',
        target_admin_id: admin.id,
        target_email: actorEmail,
        admin_id: admin.id,
        admin_email: actorEmail,
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'change-email') {
      const newEmail = body.newEmail as string | undefined
      if (typeof newEmail !== 'string' || !EMAIL_RE.test(newEmail.trim())) {
        return clientError('Please enter a valid email address.')
      }
      const normalized = newEmail.trim().toLowerCase()

      const { error: updateErr } = await supabase.auth.admin.updateUserById(admin.id, {
        email: normalized,
      })
      if (updateErr) return serverError(updateErr.message)

      await supabase.from('auth_audit').insert({
        action: 'change_email',
        target_admin_id: admin.id,
        target_email: normalized,
        admin_id: admin.id,
        admin_email: actorEmail,
      })

      return NextResponse.json({
        ok: true,
        message: `Confirmation email sent to ${normalized}. It takes effect once confirmed.`,
      })
    }

    if (action === 'reset-password') {
      // Owner-only action targeting a *different* admin account.
      const owner = await requireOwnerRole()
      const targetAdminId = body.targetAdminId as string | undefined
      const newPassword = body.newPassword as string | undefined

      if (typeof newPassword !== 'string' || newPassword.length < MIN_PASS) {
        return clientError(`New password must be at least ${MIN_PASS} characters.`)
      }
      if (typeof targetAdminId !== 'string' || !targetAdminId) {
        return clientError('targetAdminId is required.')
      }
      if (targetAdminId === owner.id) {
        return clientError('Use "Change my password" for your own account.')
      }

      const { data: targetRow, error: targetErr } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', targetAdminId)
        .maybeSingle()
      if (targetErr) return serverError(targetErr.message)
      if (!targetRow) return clientError('Target admin not found.')

      const targetAuth = await getAuthUser(supabase, targetAdminId)

      const { error: updateErr } = await supabase.auth.admin.updateUserById(targetAdminId, {
        password: newPassword,
      })
      if (updateErr) return serverError(updateErr.message)

      await supabase.from('auth_audit').insert({
        action: 'reset_password',
        target_admin_id: targetAdminId,
        target_email: targetAuth?.email ?? null,
        admin_id: owner.id,
        admin_email: actorEmail,
      })

      return NextResponse.json({ ok: true })
    }

    return clientError('Unknown action.')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}