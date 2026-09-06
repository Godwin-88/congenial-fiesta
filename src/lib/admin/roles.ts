/**
 * Admin role helpers.
 *
 * Migration 033 introduced the `owner` role as the top-level account.
 * `owner` is a superset of `admin`, and elsewhere `editor`/`viewer` are
 * progressively narrower. Centralising these checks prevents the class of
 * bug where a route guarded `role === 'admin'` and accidentally locked the
 * site owner out of their own CMS (e.g. POST /api/admin/users 403).
 */

export type AdminRole = 'owner' | 'admin' | 'editor' | 'viewer'

/** Owner + Admin. Full content management + admin surface access. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/** Owner + Admin + Editor. Content creators and above. */
export function isEditorRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

/** Owner only. Credentials, role grants, destructive admin ops. */
export function isOwnerRole(role: string | null | undefined): boolean {
  return role === 'owner'
}

/** True if `role` is a valid, assignable admin role. */
export function isValidAdminRole(role: unknown): role is AdminRole {
  return role === 'owner' || role === 'admin' || role === 'editor' || role === 'viewer'
}