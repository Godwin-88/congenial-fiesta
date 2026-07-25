import type { Access, FieldAccess } from 'payload'

// ── Collection-level access ──────────────────────────────────

// Only admin role can perform this operation
export const adminOnly: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

// Admin or editor can perform this operation
export const adminOrEditor: Access = ({ req: { user } }) => {
  return user?.role === 'admin' || user?.role === 'editor'
}

// Anyone authenticated can read
export const authenticatedRead: Access = ({ req: { user } }) => {
  return !!user
}

// Owner or admin (for user profile self-editing)
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  return { id: { equals: user?.id } }
}

// ── Field-level access ───────────────────────────────────────
// Field-level access must return boolean (not Where clause)

// Only admins can read/update this field
export const adminOnlyField: FieldAccess = ({ req: { user } }) => {
  return user?.role === 'admin'
}