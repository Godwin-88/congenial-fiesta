import { createClient } from '@supabase/supabase-js'
import { redis } from '@/lib/upstash/redis'
import type { Device, Brand } from '@/types/cms'
import { mapDevice } from '@/types/cms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function getPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

type GetDevicesParams = {
  brand?: string
  category?: string
  page?: number
  limit?: number
}

export async function getDevices(
  params: GetDevicesParams = {},
): Promise<{ devices: Device[]; totalPages: number }> {
  const { brand, category, page = 1, limit = 12 } = params

  const cacheKey = `devices:list:${brand ?? ''}:${category ?? ''}:${page}`
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    if (typeof cached === 'string') return JSON.parse(cached)
    return cached as { devices: Device[]; totalPages: number }
  }

  const supabase = getSupabase()
  const offset = (page - 1) * limit

  let query = supabase
    .from('devices')
    .select('*, brand:brands(*)', { count: 'exact' })
    .eq('status', 'published')
    .order('release_year', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (brand) {
    const { data: brandData } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brand)
      .single()
    if (brandData) query = query.eq('brand_id', brandData.id)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('getDevices error:', error)
    return { devices: [], totalPages: 0 }
  }

  const result = {
    devices: data?.map(mapDevice) ?? [],
    totalPages: Math.ceil((count ?? 0) / limit),
  }

  await redis.setex(cacheKey, 300, JSON.stringify(result))
  return result
}

export async function getDevice(
  brandSlug: string,
  deviceSlug: string,
): Promise<Device | null> {
  const cacheKey = `devices:detail:${brandSlug}:${deviceSlug}`
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    try {
      return JSON.parse(cached as string)
    } catch {
      return null
    }
  }

  try {
    const supabase = getSupabase()

    const { data: brandData } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brandSlug)
      .single()

    if (!brandData) return null

    const { data, error } = await supabase
      .from('devices')
      .select('*, brand:brands(*)')
      .eq('slug', deviceSlug)
      .eq('brand_id', brandData.id)
      .eq('status', 'published')
      .single()

    if (error || !data) return null

    const device = mapDevice(data)
    await redis.setex(cacheKey, 600, JSON.stringify(device))
    return device
  } catch {
    return null
  }
}

export async function getAllDevicePaths(): Promise<
  Array<{ brand: string; slug: string }>
> {
  const cacheKey = 'devices:static-params'
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    try {
      return JSON.parse(cached as string)
    } catch {
      // stale cache, fall through
    }
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('devices')
      .select('slug, brand:brands(slug)')
      .eq('status', 'published')

    if (error) {
      console.error('getAllDevicePaths error:', error)
      return []
    }

    const paths = (data ?? []).map((d: Record<string, unknown>) => {
      const brand = d.brand as { slug: string } | null
      return { brand: brand?.slug ?? '', slug: d.slug as string }
    })

    await redis.setex(cacheKey, 3600, JSON.stringify(paths))
    return paths
  } catch {
    return []
  }
}

export async function getTopDevices(limit: number = 6): Promise<Device[]> {
  const cacheKey = `devices:top:${limit}`
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    if (typeof cached === 'string') return JSON.parse(cached)
    return cached as Device[]
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devices')
    .select('*, brand:brands(*)')
    .eq('status', 'published')
    .order('score_overall', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getTopDevices error:', error)
    return []
  }

  const devices = data?.map(mapDevice) ?? []
  await redis.setex(cacheKey, 600, JSON.stringify(devices))
  return devices
}

export async function searchDevices(query: string): Promise<Device[]> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('devices')
    .select('*, brand:brands(*)')
    .eq('status', 'published')
    .ilike('name', `%${query}%`)
    .limit(20)

  return data?.map(mapDevice) ?? []
}

export async function getDeviceBySlug(deviceSlug: string): Promise<Device | null> {
  const cacheKey = `devices:slug:${deviceSlug}`
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    try {
      return JSON.parse(cached as string)
    } catch {
      return null
    }
  }

  try {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devices')
    .select('*, brand:brands(*)')
    .eq('slug', deviceSlug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error('getDeviceBySlug error:', error)
    return null
  }

  if (!data) return null

    const device = mapDevice(data)
    await redis.setex(cacheKey, 600, JSON.stringify(device))
    return device
  } catch {
    return null
  }
}

export async function getAllBrands(): Promise<Brand[]> {
  const cacheKey = 'brands:all'
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    if (typeof cached === 'string') return JSON.parse(cached)
    return cached as Brand[]
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('getAllBrands error:', error)
    return []
  }

  const brands = (data ?? []) as Brand[]
  await redis.setex(cacheKey, 3600, JSON.stringify(brands))
  return brands
}

export async function getFeaturedBrands(): Promise<Brand[]> {
  const cacheKey = 'brands:featured'
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    if (typeof cached === 'string') return JSON.parse(cached)
    return cached as Brand[]
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('featured', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('getFeaturedBrands error:', error)
    return []
  }

  const brands = (data ?? []) as Brand[]
  await redis.setex(cacheKey, 3600, JSON.stringify(brands))
  return brands
}