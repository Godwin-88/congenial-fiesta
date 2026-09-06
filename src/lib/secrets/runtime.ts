import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from '@/lib/secrets/cipher'
import { envValueFor, type SecretDef } from '@/lib/secrets/registry'

/**
 * Runtime secret resolution: DB override (from app_secrets) first, env fallback.
 *
 * Each value is resolved exactly once and cached for 60s in an in-process Map.
 * The admin Settings console writes encrypted overrides here; every other
 * consumer of a credential can route through resolveSecret() to pick up an
 * override without a redeploy.
 */

const cache = new Map<string, { value: string | null; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

function cacheKey(envVar: string): string {
  return `secret:${envVar}`
}

function readCached(envVar: string): string | null | undefined {
  const hit = cache.get(cacheKey(envVar))
  if (hit && hit.expiresAt > Date.now()) return hit.value
  cache.delete(cacheKey(envVar))
  return undefined
}

function writeCache(envVar: string, value: string | null): void {
  cache.set(cacheKey(envVar), { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Resolve a secret by its registry def: returns the app_secrets override if
 * present, otherwise the env value, otherwise null.
 * Never throws — returns null if anything is missing.
 */
export async function resolveSecret(def: SecretDef): Promise<string | null> {
  const envValue = envValueFor(def) || null

  // Avoid a DB round-trip when there is no override (fast path).
  const cached = readCached(def.envVar)
  if (cached !== undefined) return cached

  const db = adminClient()
  if (!db) {
    writeCache(def.envVar, envValue)
    return envValue
  }

  try {
    const { data, error } = await db
      .from('app_secrets')
      .select('encrypted_value, salt, iv')
      .eq('service', def.serviceSlug)
      .eq('key', def.key)
      .maybeSingle()

    if (error) throw error

    if (data) {
      const plain = decryptSecret({
        value: data.encrypted_value,
        salt: data.salt,
        iv: data.iv,
      })
      writeCache(def.envVar, plain)
      return plain
    }

    writeCache(def.envVar, envValue)
    return envValue
  } catch {
    writeCache(def.envVar, envValue)
    return envValue
  }
}

/** Force-refresh the in-process cache for one env var (after a write/reset). */
export function invalidateSecret(envVar: string): void {
  cache.delete(cacheKey(envVar))
}

export function clearSecretCache(): void {
  cache.clear()
}