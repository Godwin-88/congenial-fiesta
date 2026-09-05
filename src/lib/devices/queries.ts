import { createClient } from '@supabase/supabase-js'
import { redis, deserializeCache } from '@/lib/upstash/redis'
import type { Device, Brand, DeviceType, MajorCategory } from '@/types/cms'
import { mapDevice, MAJOR_CATEGORIES } from '@/types/cms'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type GetDevicesParams = {
  brand?: string
  category?: string
  majorCategory?: MajorCategory | null
  deviceTypeId?: number | null
  page?: number
  limit?: number
}

export async function getDevices(
  params: GetDevicesParams = {},
): Promise<{ devices: Device[]; totalPages: number }> {
  const { brand, category, majorCategory, deviceTypeId, page = 1, limit = 12 } = params

  const cacheKey = `devices:list:${brand ?? ''}:${category ?? ''}:${majorCategory ?? ''}:${deviceTypeId ?? ''}:${page}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedResult = deserializeCache<{ devices: Device[]; totalPages: number }>(cached)
  if (cachedResult) return cachedResult

  const supabase = getSupabase()
  const offset = (page - 1) * limit

  let query = supabase
    .from('devices')
    .select('*, brand:brands(*), device_type:device_types(*)', { count: 'exact' })
    .eq('status', 'published')
    .order('release_year', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('price_tier', category)
  if (majorCategory) query = query.eq('major_category', majorCategory)
  if (deviceTypeId) query = query.eq('device_type_id', deviceTypeId)
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

// All device types (for admin forms / lookups)
export async function getDeviceTypes(): Promise<DeviceType[]> {
  const cacheKey = 'device_types:all'
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedTypes = deserializeCache<DeviceType[]>(cached)
  if (cachedTypes) return cachedTypes

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('device_types')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('getDeviceTypes error:', error)
    return []
  }

  const types = (data ?? []) as DeviceType[]
  await redis.setex(cacheKey, 3600, JSON.stringify(types))
  return types
}

// Brands that have at least one published device in the given major category
export async function getBrandsByCategory(major: MajorCategory): Promise<Brand[]> {
  const cacheKey = `brands:by_category:${major}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedBrands = deserializeCache<Brand[]>(cached)
  if (cachedBrands) return cachedBrands

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devices')
    .select('brand:brands(id, name, slug, logo_url, website, featured)')
    .eq('status', 'published')
    .eq('major_category', major)

  if (error) {
    console.error('getBrandsByCategory error:', error)
    return []
  }

  const seen = new Map<number, Brand>()
  for (const row of (data ?? []) as Array<{ brand?: any }>) {
    const b = row.brand as Brand | null | undefined
    if (b && b.id && !seen.has(b.id)) seen.set(b.id, b)
  }

  const brands = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  await redis.setex(cacheKey, 600, JSON.stringify(brands))
  return brands
}

export function getMajorCategories() {
  return MAJOR_CATEGORIES
}

export async function getDevice(
  brandSlug: string,
  deviceSlug: string,
): Promise<Device | null> {
  const cacheKey = `devices:detail:${brandSlug}:${deviceSlug}`
  const cached = await redis.get(cacheKey).catch(() => null)
  const cachedDevice = deserializeCache<Device>(cached)
  // A stale/corrupt/mis-shapen cache entry must never cause a miss —
  // fall through to the database.
  if (cachedDevice) return cachedDevice

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
  const cachedPaths = deserializeCache<Array<{ brand: string; slug: string }>>(cached)
  if (cachedPaths) return cachedPaths

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
  const cachedDevices = deserializeCache<Device[]>(cached)
  if (cachedDevices) return cachedDevices

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('devices')
    .select('*, brand:brands(*)')
    .eq('status', 'published')
    .order('scores_overall', { ascending: false })
    .limit(limit)

  if (error) {
    console.error(
      'getTopDevices error:',
      error instanceof Error ? error.message : JSON.stringify(error),
    )
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
  const cachedDevice = deserializeCache<Device>(cached)
  // A stale/corrupt/mis-shapen cache entry must never cause a miss —
  // fall through to the database.
  if (cachedDevice) return cachedDevice

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
  const cachedBrands = deserializeCache<Brand[]>(cached)
  if (cachedBrands) return cachedBrands

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
  const cachedBrands = deserializeCache<Brand[]>(cached)
  if (cachedBrands) return cachedBrands

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