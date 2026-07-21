import Link from 'next/link'
import type { Metadata } from 'next'
import { getDevices, getAllBrands } from '@/lib/devices/queries'
import { DeviceCard } from '@/components/devices/DeviceCard'

interface DevicesPageProps {
  searchParams: Promise<{ brand?: string; category?: string; page?: string }>
}

export async function generateMetadata({
  searchParams,
}: DevicesPageProps): Promise<Metadata> {
  const sp = await searchParams
  const title = sp.brand
    ? `${sp.brand.charAt(0).toUpperCase() + sp.brand.slice(1)} Devices | FweezyTech`
    : 'Devices | FweezyTech'
  return { title }
}

export default async function DevicesPage({ searchParams }: DevicesPageProps) {
  const sp = await searchParams
  const brand = sp.brand
  const category = sp.category
  const page = sp.page ? Number(sp.page) : 1

  const [{ devices, totalPages }, brands] = await Promise.all([
    getDevices({ brand, category, page }),
    getAllBrands(),
  ])

  const title = brand
    ? `${brand.charAt(0).toUpperCase() + brand.slice(1)} Devices`
    : 'Devices'

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>

      {/* Brand filter strip */}
      <div className="mt-8 overflow-x-auto">
        <div className="flex gap-3 pb-2">
          <Link
            href="/devices"
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 ${
              !brand ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-border text-foreground'
            }`}
          >
            All Brands
          </Link>
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/devices?brand=${b.slug}`}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 ${
                brand === b.slug
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                  : 'border-border text-foreground'
              }`}
            >
              {b.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo} alt="" className="h-5 w-5 rounded-full object-contain" />
              )}
              {b.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-muted p-1">
        {[
          { label: 'All', value: undefined },
          { label: 'Flagship', value: 'flagship' },
          { label: 'Mid-range', value: 'mid-range' },
          { label: 'Budget', value: 'budget' },
        ].map((tab) => {
          const href = tab.value
            ? `/devices?${new URLSearchParams({ ...(brand ? { brand } : {}), category: tab.value }).toString()}`
            : `/devices${brand ? `?brand=${brand}` : ''}`
          return (
            <Link
              key={tab.label}
              href={href}
              className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
                (tab.value === undefined && !category) || category === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Device grid */}
      {devices.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              href={`/devices?${new URLSearchParams({
                ...(brand ? { brand } : {}),
                ...(category ? { category } : {}),
                page: String(page - 1),
              }).toString()}`}
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
              href={`/devices?${new URLSearchParams({
                ...(brand ? { brand } : {}),
                ...(category ? { category } : {}),
                page: String(page + 1),
              }).toString()}`}
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
  )
}