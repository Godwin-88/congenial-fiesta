import Link from 'next/link'
import type { Metadata } from 'next'
import { getDevices, getAllBrands, getBrandsByCategory, getMajorCategories } from '@/lib/devices/queries'
import { DeviceCard } from '@/components/devices/DeviceCard'
import type { MajorCategory } from '@/types/cms'

interface DevicesPageProps {
  searchParams: Promise<{ cat?: string; brand?: string; page?: string }>
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
  const majors = getMajorCategories()
  const cat = ((sp.cat as MajorCategory) || majors[0]?.slug) as MajorCategory | undefined
  const brand = sp.brand
  const page = sp.page ? Number(sp.page) : 1

  const brands = cat ? await getBrandsByCategory(cat) : await getAllBrands()

  const [{ devices, totalPages }] = await Promise.all([
    getDevices({ majorCategory: cat, brand, page }),
  ])

  const activeMajor = majors.find(m => m.slug === cat)
  const title = activeMajor ? activeMajor.label : 'Devices'

  const buildHref = (overrides: { cat?: string; brand?: string; page?: string }) => {
    const params = new URLSearchParams()
    const base = {
      cat: cat ?? undefined,
      brand: brand ?? undefined,
      ...overrides,
    }
    if (base.cat) params.set('cat', base.cat)
    if (base.brand) params.set('brand', base.brand)
    if (base.page) params.set('page', base.page)
    const qs = params.toString()
    return qs ? `/devices?${qs}` : '/devices'
  }

  const tabHref = (slug?: MajorCategory) => buildHref({ cat: slug, brand: undefined, page: undefined })
  const brandHref = (slug?: string) => buildHref({ brand: slug, page: undefined })

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground">Devices</h1>

      {/* Major category tabs — no "All Devices" tab */}
      <div className="mt-8 border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-6" aria-label="Device categories">
          {majors.map(t => {
            const isActive = t.slug === cat
            return (
              <Link
                key={t.slug}
                href={tabHref(t.slug)}
                className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* Left sidebar: brand filters for the active category */}
        <aside className="lg:sticky lg:top-24 lg:w-56 lg:flex-shrink-0 lg:self-start">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title} Brands
          </h2>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1">
            <li>
              <Link
                href={brandHref(undefined)}
                className={`block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  !brand
                    ? 'bg-brand-primary text-white'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                All {title}
              </Link>
            </li>
            {brands.map(b => (
              <li key={b.id}>
                <Link
                  href={brandHref(b.slug)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    brand === b.slug
                      ? 'bg-brand-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {b.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo_url} alt="" className="h-4 w-4 rounded-full object-contain" />
                  )}
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main content: active filter + device grid */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-foreground">{title}</span>
            {brand && (
              <>
                <span>·</span>
                <span>Brand: <span className="text-foreground">{brand}</span></span>
              </>
            )}
          </div>

          <div className="mt-6">
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
    </div>
  )
}
