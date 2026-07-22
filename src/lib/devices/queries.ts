import { getPayload } from 'payload'
import config from '@payload-config'
import { redis } from '@/lib/upstash/redis'
import type { Device, Brand } from '@/payload-types'

function safeJsonParse<T>(data: unknown): T | null {
  if (!data || typeof data !== 'string') return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
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
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<{ devices: Device[]; totalPages: number }>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    status: { equals: 'published' },
  }
  if (brand) {
    const brandDocs = await payload.find({
      collection: 'brands',
      where: { slug: { equals: brand } },
      limit: 1,
      depth: 0,
    })
    if (brandDocs.docs.length > 0) {
      where.brand = { equals: brandDocs.docs[0].id }
    }
  }
  if (category) {
    where.category = { equals: category }
  }

  const result = await payload.find({
    collection: 'devices',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    page,
    limit,
    sort: '-releaseYear',
    depth: 2,
  })

  const output = {
    devices: result.docs as unknown as Device[],
    totalPages: result.totalPages,
  }

  await redis.setex(cacheKey, 300, JSON.stringify(output))
  return output
}

export async function getDevice(
  brandSlug: string,
  deviceSlug: string,
): Promise<Device | null> {
  const cacheKey = `devices:detail:${brandSlug}:${deviceSlug}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Device>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const brandDocs = await payload.find({
    collection: 'brands',
    where: { slug: { equals: brandSlug } },
    limit: 1,
    depth: 0,
  })
  if (brandDocs.docs.length === 0) return null

  const devices = await payload.find({
    collection: 'devices',
     
    where: {
      slug: { equals: deviceSlug },
      brand: { equals: brandDocs.docs[0].id },
      status: { equals: 'published' },
    } as any,
    limit: 1,
    depth: 2,
  })

  const device = (devices.docs[0] ?? null) as unknown as Device | null
  if (device) {
    await redis.setex(cacheKey, 600, JSON.stringify(device))
  }
  return device
}

export async function getAllDevicePaths(): Promise<
  Array<{ brand: string; slug: string }>
> {
  const cacheKey = 'devices:static-params'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Array<{ brand: string; slug: string }>>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const devices = await payload.find({
    collection: 'devices',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: { equals: 'published' } } as any,
    limit: 500,
    depth: 1,
  })

  const paths = (devices.docs as unknown as Device[]).map((d) => {
    const brandSlug =
      typeof d.brand === 'object' && d.brand !== null
        ? (d.brand as Brand).slug
        : ''
    return { brand: brandSlug, slug: d.slug }
  })

  await redis.setex(cacheKey, 3600, JSON.stringify(paths))
  return paths
}

export async function getTopDevices(limit: number = 6): Promise<Device[]> {
  const cacheKey = `devices:top:${limit}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Device[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'devices',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: { equals: 'published' } } as any,
    sort: '-scores.overall',
    limit,
    depth: 2,
  })

  const devices = result.docs as unknown as Device[]
  await redis.setex(cacheKey, 600, JSON.stringify(devices))
  return devices
}

export async function searchDevices(query: string): Promise<Device[]> {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'devices',
     
    where: {
      status: { equals: 'published' },
      name: { contains: query },
    } as any,
    limit: 20,
    depth: 2,
  })

  return result.docs as unknown as Device[]
}

export async function getDeviceBySlug(deviceSlug: string): Promise<Device | null> {
  const cacheKey = `devices:slug:${deviceSlug}`
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Device>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const devices = await payload.find({
    collection: 'devices',
     
    where: {
      slug: { equals: deviceSlug },
      status: { equals: 'published' },
    } as any,
    limit: 1,
    depth: 2,
  })

  const device = (devices.docs[0] ?? null) as unknown as Device | null
  if (device) {
    await redis.setex(cacheKey, 600, JSON.stringify(device))
  }
  return device
}

export async function getAllBrands(): Promise<Brand[]> {
  const cacheKey = 'brands:all'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Brand[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'brands',
    limit: 100,
    sort: 'name',
    depth: 0,
  })

  const brands = result.docs as unknown as Brand[]
  await redis.setex(cacheKey, 3600, JSON.stringify(brands))
  return brands
}

export async function getFeaturedBrands(): Promise<Brand[]> {
  const cacheKey = 'brands:featured'
  const cached = await redis.get(cacheKey)
  const parsed = safeJsonParse<Brand[]>(cached)
  if (parsed) return parsed

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'brands',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { featured: { equals: true } } as any,
    limit: 20,
    sort: 'name',
    depth: 0,
  })

  const brands = result.docs as unknown as Brand[]
  await redis.setex(cacheKey, 3600, JSON.stringify(brands))
  return brands
}