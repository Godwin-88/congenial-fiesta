/**
 * Admin role-based access control utilities.
 * These are used by admin API routes and pages to check permissions.
 */

export type AdminRole = 'admin' | 'editor' | 'viewer'

export function isAdmin(role: string): boolean {
  return role === 'admin'
}

export function isEditor(role: string): boolean {
  return role === 'admin' || role === 'editor'
}

export function isViewer(role: string): boolean {
  return true // viewers can view everything
}