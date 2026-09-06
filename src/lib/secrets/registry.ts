/**
 * Typed secret registry — the single source of truth for which credentials
 * exist, what env var they map to, and how they should display in the admin
 * Settings console. The UI never accepts arbitrary key names; it can only
 * operate on entries declared here.
 */

export type SecretField = 'plain' | 'password'
export type SecretCategory =
  | 'database'
  | 'ai'
  | 'email'
  | 'cdn'
  | 'data'
  | 'video'
  | 'cache'
  | 'queue'
  | 'analytics'
  | 'auth'
  | 'deployment'

export interface SecretDef {
  service: string            // grouping label, e.g. 'Groq'
  serviceSlug: string        // stable id, e.g. 'groq'
  key: string                // key name within the service, e.g. 'API_KEY'
  envVar: string             // fallback env variable
  description: string
  field?: SecretField
  category: SecretCategory
  required?: boolean         // is it required to be configured for the feature
}

const s = (d: Omit<SecretDef, 'field' | 'required'> & Partial<Pick<SecretDef, 'field' | 'required'>>): SecretDef => ({
  field: 'password',
  required: true,
  ...d,
})

export const SECRET_REGISTRY: SecretDef[] = [
  // Dataset & core
  s({ service: 'Supabase', serviceSlug: 'supabase', key: 'SERVICE_ROLE_KEY', envVar: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Server-side admin access to the Postgres database. Never exposed.', category: 'database' }),
  s({ service: 'Supabase', serviceSlug: 'supabase', key: 'DATABASE_URL', envVar: 'DATABASE_URL', description: 'Direct Postgres connection string (migrations, admin tools).', category: 'database' }),
  s({ service: 'Supabase', serviceSlug: 'supabase', key: 'ANON_KEY', envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Public anon key used by client-side Supabase calls.', category: 'database', required: true }),

  // AI
  s({ service: 'Groq', serviceSlug: 'groq', key: 'API_KEY', envVar: 'GROQ_API_KEY', description: 'Groq inference API key (chat, device analyzer, image search, prefill).', category: 'ai' }),
  s({ service: 'OpenAI', serviceSlug: 'openai', key: 'API_KEY', envVar: 'OPENAI_API_KEY', description: 'Only needed if UPSTASH_VECTOR_EMBEDDING_MODEL=openai.', category: 'ai', required: false }),

  // Email
  s({ service: 'Resend', serviceSlug: 'resend', key: 'API_KEY', envVar: 'RESEND_API_KEY', description: 'Transactional email provider key.', category: 'email', required: false }),
  s({ service: 'SMTP', serviceSlug: 'smtp', key: 'PASS', envVar: 'SMTP_PASS', description: 'SMTP password (fallback if Resend is not used).', category: 'email', required: false }),

  // CDN / media
  s({ service: 'Cloudflare Images', serviceSlug: 'cloudflare', key: 'API_TOKEN', envVar: 'CLOUDFLARE_IMAGES_API_TOKEN', description: 'Cloudflare Images API token.', category: 'cdn', required: false }),

  // Data
  s({ service: 'MobileAPI', serviceSlug: 'mobileapi', key: 'KEY', envVar: 'MOBILEAPI_KEY', description: 'Device spec database key (optional seeding).', category: 'data', required: false }),

  // Video
  s({ service: 'YouTube', serviceSlug: 'youtube', key: 'API_KEY', envVar: 'YOUTUBE_API_KEY', description: 'YouTube Data API key (optional — RSS fallback otherwise).', category: 'video', required: false }),

  // Cache
  s({ service: 'Upstash Redis', serviceSlug: 'upstash', key: 'REDIS_TOKEN', envVar: 'UPSTASH_REDIS_REST_TOKEN', description: 'Redis REST token (sessions, caches, rate limits, circuit breakers).', category: 'cache' }),
  // Queue
  s({ service: 'QStash', serviceSlug: 'qstash', key: 'TOKEN', envVar: 'QSTASH_TOKEN', description: 'QStash token (scheduled jobs, crons).', category: 'queue', required: false }),
  s({ service: 'QStash', serviceSlug: 'qstash', key: 'CURRENT_SIGNING_KEY', envVar: 'QSTASH_CURRENT_SIGNING_KEY', description: 'QStash request signature verification key.', category: 'queue', required: false }),
  s({ service: 'QStash', serviceSlug: 'qstash', key: 'NEXT_SIGNING_KEY', envVar: 'QSTASH_NEXT_SIGNING_KEY', description: 'QStash next signing key (rotation).', category: 'queue', required: false }),
  // Search
  s({ service: 'Upstash Search', serviceSlug: 'upstash-search', key: 'TOKEN', envVar: 'UPSTASH_SEARCH_REST_TOKEN', description: 'Upstash Search REST token.', category: 'queue' }),
  // Vector
  s({ service: 'Upstash Vector', serviceSlug: 'upstash-vector', key: 'TOKEN', envVar: 'UPSTASH_VECTOR_REST_TOKEN', description: 'Upstash Vector REST token (RAG / GraphRAG embeddings).', category: 'queue' }),

  // Analytics
  s({ service: 'Analytics', serviceSlug: 'analytics', key: 'BEACON_TOKEN', envVar: 'ANALYTICS_BEACON_TOKEN', description: 'Private page-view beacon token.', category: 'analytics', required: false }),
  s({ service: 'Analytics', serviceSlug: 'analytics', key: 'NEXT_PUBLIC_BEACON_TOKEN', envVar: 'NEXT_PUBLIC_ANALYTICS_BEACON_TOKEN', description: 'Public page-view beacon token (browser).', category: 'analytics', required: false }),

  // Auth
  s({ service: 'Supabase Auth', serviceSlug: 'supabase-auth', key: 'JWT_SECRET', envVar: 'SUPABASE_JWT_SECRET', description: 'Supabase JWT secret for admin password-based token verification.', category: 'auth', required: false }),

  // Deployment
  s({ service: 'Vercel', serviceSlug: 'vercel', key: 'TOKEN', envVar: 'VERCEL_TOKEN', description: 'Vercel platform token (one-way env sync to Vercel).', category: 'deployment', required: false }),
]

export function getServiceSlugs(): string[] {
  return [...new Set(SECRET_REGISTRY.map(s => s.serviceSlug))]
}

export function findByEnv(envVar: string): SecretDef | undefined {
  return SECRET_REGISTRY.find(s => s.envVar === envVar)
}

/** Current env fallback values (never includes resolved overrides). */
export function envValueFor(def: SecretDef): string | undefined {
  return process.env[def.envVar]
}