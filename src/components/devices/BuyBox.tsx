// eslint-disable-next-line @typescript-eslint/no-explicit-any

interface BuyBoxProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buyLinks: any
  deviceName: string
  deviceSlug: string
}

// Retailer metadata: display name + a small brand-colour chip/logo style.
const RETAILER_META: Record<
  string,
  { label: string; short: string; className: string }
> = {
  jumia: { label: 'Jumia', short: 'J', className: 'bg-orange-500/20 text-orange-400' },
  amazon: { label: 'Amazon', short: 'A', className: 'bg-yellow-500/20 text-yellow-400' },
  kilimall: { label: 'Kilimall', short: 'K', className: 'bg-blue-500/20 text-blue-400' },
  carrier: { label: 'Carrier', short: 'C', className: 'bg-emerald-500/20 text-emerald-400' },
  other: { label: 'Other', short: 'O', className: 'bg-gray-500/20 text-gray-400' },
}

function formatPrice(raw?: string | number): string {
  if (raw === undefined || raw === null || raw === '') return ''
  const str = String(raw)
  if (/[a-z]|\$|KES|\d\.\d{2}/i.test(str)) return str
  return `KES ${Number(str).toLocaleString()}`
}

function sortByPrice(links: any[]): any[] {
  return [...links].sort((a, b) => {
    const pa = parseNum(a?.price)
    const pb = parseNum(b?.price)
    if (pa === null && pb === null) return 0
    if (pa === null) return 1
    if (pb === null) return -1
    return pa - pb
  })
}

function parseNum(raw?: string | number): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const m = String(raw).match(/[\d.,]+/)
  if (!m) return null
  const n = parseFloat(m[0].replace(/,/g, ''))
  return isNaN(n) ? null : n
}

export function BuyBox({ buyLinks, deviceName, deviceSlug }: BuyBoxProps) {
  if (!buyLinks || buyLinks.length === 0) return null

  const links = sortByPrice(buyLinks)
  const cheapestIndex = links.findIndex((l: any) => parseNum(l.price) !== null)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 font-heading text-base font-semibold text-foreground">
        Where to Buy {deviceName}
      </h3>
      <div className="space-y-2">
        {links.map((link: any, i: number) => {
          const meta = RETAILER_META[link.retailer] ?? RETAILER_META.other
          const price = formatPrice(link.price)
          const isBest = i === cheapestIndex && cheapestIndex !== -1
          return (
            <a
              key={i}
              href={`/api/out/${deviceSlug}/${link.retailer}`}
              rel="noopener sponsored"
              target="_blank"
              className="group flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${meta.className}`}>
                  {meta.short}
                </span>
                <span className="font-medium text-foreground">{meta.label}</span>
                {isBest && (
                  <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-400">
                    Best price
                  </span>
                )}
              </span>
              <span className="flex flex-col items-end gap-0.5">
                {price && <span className="text-sm font-semibold text-foreground">{price}</span>}
                {link.priceDate && (
                  <span className="text-[10px] text-muted-foreground">
                    Price as of {new Date(link.priceDate).toLocaleDateString()}
                  </span>
                )}
              </span>
            </a>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Prices subject to change. We may earn a commission on purchases.
      </p>
    </div>
  )
}