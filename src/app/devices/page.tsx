import Link from 'next/link'
import type { Metadata } from 'next'
import { getDevices, getAllBrands, getDeviceTypes, getBrandsByCategory, getMajorCategories } from '@/lib/devices/queries'
import { DeviceCard } from '@/components/devices/DeviceCard'
import type { MajorCategory } from '@/types/cms'

interface DevicesPageProps {
  searchParams: Promise<{ cat?: string; type?: string; brand?: string; page?: string }>
}

export async function generateMetadata({
  searchParams,
}: DevicesPageProps): Promise<Metadata> {
  const sp = await searchParams
  const majors = getMajorCategories()
  const major = majors.find(m => m.slug === sp.cat)
  const title = major ? `${major.label} Devices | FweezyTech` : 'Devices | FweezyTech'
  return { title }
}

export default async function DevicesPage({ searchParams }: DevicesPageProps) {
  const sp = await searchParams
  const cat = (sp.cat as MajorCategory) || undefined
  const typeSlug = sp.type
  const brand = sp.brand
  const page = sp.page ? Number(sp.page) : 1

  const majors = getMajorCategories()
  const deviceTypes = await getDeviceTypes()
  const brands = cat ? await getBrandsByCategory(cat) : await getAllBrands()

  const activeType = typeSlug
    ? deviceTypes.find(t => t.slug === typeSlug)
    : undefined
  const deviceTypeId = activeType?.id

  const [{ devices, totalPages }, ] = await Promise.all([
    getDevices({ majorCategory: cat, deviceTypeId, brand, page }),
  ])

  const activeMajor = majors.find(m => m.slug === cat)
  const title = activeMajor ? activeMajor.label : 'All Devices'

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const base = { cat, type: activeType?.slug, brand, ...overrides }
    if (base.cat) params.set('cat', base.cat)
    if (base.type) params.set('type', base.type)
    if (base.brand) params.set('brand', base.brand)
    const qs = params.toString()
    return qs ? `/devices?${qs}` : '/devices'
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>

      <div className="mt-8 flex gap-8">
        {/* Left master filter */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-8 space-y-1">
            <Link
              href="/devices"
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                !cat ? 'bg-brand-primary/10 text-brand-primary' : 'text-foreground hover:bg-muted/50'
              }`}
            >
              All Devices
            </Link>

            {majors.map(m => {
              const isActive = cat === m.slug
              const types = deviceTypes.filter(t => t.major_category === m.slug)
              return (
                <div key={m.slug}>
                  <Link
                    href={buildHref({ cat: m.slug, type: undefined, brand: undefined })}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-brand-primary/10 text-brand-primary' : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span>{m.label}</span>
                  </Link>

                  {isActive && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
                      <Link
                        href={buildHref({ type: undefined, brand: undefined })}
                        className={`block rounded px-2 py-1 text-xs ${
                          !activeType && !brand ? 'text-brand-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All {m.label}
                      </Link>
                      {types.map(t => (
                        <Link
                          key={t.id}
                          href={buildHref({ type: t.slug, brand: undefined })}
                          className={`block rounded px-2 py-1 text-xs ${
                            activeType?.slug === t.slug ? 'text-brand-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {t.label}
                        </Link>
                      ))}

                      <p className="px-2 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        Brands
                      </p>
                      {brands.map(b => (
                        <Link
                          key={b.id}
                          href={buildHref({ brand: b.slug })}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                            brand === b.slug ? 'text-brand-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {b.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.logo_url} alt="" className="h-4 w-4 rounded-full object-contain" />
                          )}
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        {/* Device grid */}
        <div className="min-w-0 flex-1">
          {brand && (
            <p className="mb-4 text-sm text-muted-foreground">
              Filtered by brand: <span className="text-foreground">{brand}</span>
            </p>
          )}

          {devices.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {devices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center">
              <div className="mx-auto h-32 w-32 rounded-full bg-muted" />
              <p className="mt-4 text-lg font-medium text-foreground">No devices found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or{' '}
                <a href="#" className="text-brand-primary underline">
                  suggest a device
                </a>
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              {page > 1 ? (
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
                  Previous
                </span>
              )}

              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
                  Next
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
