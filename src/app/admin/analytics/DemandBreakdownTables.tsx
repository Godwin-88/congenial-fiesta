// Demand breakdown — price tier · major category · brand.
//
// Three columns that answer the same question from the three angles a
// merchandiser actually uses: what price band earns attention, what product
// family earns it, and which brand owns it. "Monetised share" is the tell: a
// tier with strong views but a low monetised share is demand you are wasting.

type TierRow = {
  tier: string
  label: string
  devices: number
  views: number
  clicks: number
  ctr: number
  viewsPerDevice: number
  monetisedSharePct: number
}

type CategoryRow = { category: string; label: string; devices: number; views: number; clicks: number; ctr: number }

type BrandRow = {
  brandSlug: string
  brandName: string
  devices: number
  views: number
  clicks: number
  ctr: number
  coveragePct: number
}

type Props = {
  byTier: TierRow[]
  byCategory: CategoryRow[]
  byBrand: BrandRow[]
}

function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`py-2 font-medium text-muted-foreground ${align === 'left' ? 'text-left pr-3' : 'text-right pr-3 last:pr-0'}`}>
      {children}
    </th>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-foreground/10 align-middle">
      <span
        className="block h-full rounded-full"
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }}
      />
    </span>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">No {label} data in this period.</p>
}

function healthClass(pct: number, good = 80): string {
  if (pct >= good) return 'text-emerald-400'
  if (pct >= good / 2) return 'text-amber-400'
  return 'text-red-400'
}

export default function DemandBreakdownTables({ byTier, byCategory, byBrand }: Props) {
  const tierMax = Math.max(1, ...byTier.map((r) => r.views))
  const categoryMax = Math.max(1, ...byCategory.map((r) => r.views))
  const brandMax = Math.max(1, ...byBrand.map((r) => r.views))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By price tier</p>
        {byTier.length === 0 ? (
          <Empty label="price tier" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <Th align="left">Tier</Th>
                <Th>Devices</Th>
                <Th>Views</Th>
                <Th>Monetised</Th>
              </tr>
            </thead>
            <tbody>
              {byTier.map((row) => (
                <tr key={row.tier} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <span className="text-foreground">{row.label}</span>
                    <span className="mt-0.5 block">
                      <Bar value={row.views} max={tierMax} color="#3B82F6" />
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.devices}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                    {row.views.toLocaleString()}
                    <span className="ml-1 text-[11px] text-muted-foreground">{row.viewsPerDevice}/dev</span>
                  </td>
                  <td className={`py-2 text-right tabular-nums ${healthClass(row.monetisedSharePct)}`}>
                    {row.monetisedSharePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By category</p>
        {byCategory.length === 0 ? (
          <Empty label="category" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <Th align="left">Category</Th>
                <Th>Devices</Th>
                <Th>Views</Th>
                <Th>Clicks/views</Th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((row) => (
                <tr key={row.category} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <span className="text-foreground">{row.label}</span>
                    <span className="mt-0.5 block">
                      <Bar value={row.views} max={categoryMax} color="#8B5CF6" />
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.devices}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.views.toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{row.ctr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          By brand <span className="font-normal normal-case">(top 12)</span>
        </p>
        {byBrand.length === 0 ? (
          <Empty label="brand" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <Th align="left">Brand</Th>
                <Th>Devices</Th>
                <Th>Views</Th>
                <Th>Covered</Th>
              </tr>
            </thead>
            <tbody>
              {byBrand.map((row) => (
                <tr key={row.brandSlug} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <span className="text-foreground">{row.brandName}</span>
                    <span className="mt-0.5 block">
                      <Bar value={row.views} max={brandMax} color="#10B981" />
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{row.devices}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">{row.views.toLocaleString()}</td>
                  <td className={`py-2 text-right tabular-nums ${healthClass(row.coveragePct)}`}>{row.coveragePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="col-span-full text-[11px] text-muted-foreground">
        Clicks are attributed by device slug, so a click that arrived from a search, home or compare card can exceed the
        page&apos;s own views inside the period — read the ratio as clicks per view, not a strict page-level percentage.
        Monetised share is the stricter signal: it is computed per device from that device&apos;s own page views.
      </p>
    </div>
  )
}


