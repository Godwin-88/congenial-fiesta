import type { Device } from '@/payload-types'

interface BuyBoxProps {
  buyLinks: Device['buyLinks']
  deviceName: string
  deviceSlug: string
}

const RETAILER_LABELS: Record<string, string> = {
  jumia: 'Jumia',
  amazon: 'Amazon',
  kilimall: 'Kilimall',
  carrier: 'Carrier',
  other: 'Other',
}

export function BuyBox({ buyLinks, deviceName, deviceSlug }: BuyBoxProps) {
  if (!buyLinks || buyLinks.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 font-heading text-base font-semibold text-foreground">
        Where to Buy {deviceName}
      </h3>
      <div className="space-y-2">
        {buyLinks.map((link, i) => (
          <a
            key={i}
            href={`/api/out/${deviceSlug}/${link.retailer}`}
            rel="noopener sponsored"
            target="_blank"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-foreground">
              {RETAILER_LABELS[link.retailer] ?? link.retailer}
            </span>
            {link.price && (
              <span className="text-sm text-muted-foreground">{link.price}</span>
            )}
          </a>
        ))}
      </div>
      {buyLinks.some((l) => l.priceDate) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Prices as of{' '}
          {buyLinks
            .filter((l) => l.priceDate)
            .map((l) => new Date(l.priceDate!).toLocaleDateString())
            .join(', ')}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Prices subject to change. We may earn a commission on purchases.
      </p>
    </div>
  )
}