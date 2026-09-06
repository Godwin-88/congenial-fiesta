import { requireAdminAuth } from '@/lib/admin/require-admin'
import type { AdminUser } from '@/types/cms'

/**
 * Owner-role guard for credential mutations.
 *
 * The full admin surface is gated by requireAdminAuth (admin/editor/viewer).
 * Anything that can modify encrypted credentials, configurations, or trigger
 * Vercel sync must additionally require the `owner` role — the only role that
 * can write/rotate/reset secrets.
 */
export async function requireOwnerRole(): Promise<AdminUser> {
  const user = await requireAdminAuth()
  if (user.role !== 'owner') {
    const e = new Error('Forbidden: requires the owner role')
    ;(e as Error & { status: number }).status = 403
    throw e
  }
  return user
}

export function isOwner(user: Pick<AdminUser, 'role'> | null): boolean {
  return user?.role === 'owner'
}