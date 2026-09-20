// Revenue mix — where the proxy is made, per retailer channel.
//
// Server-rendered (no client JS): two bars per channel, clicks and the KES
// they price into, with the rate pill and the channel-state dot. A channel
// whose bar pair reads "clicks without money" is the story — unpriced or
// mismatched keys price real clicks at zero.

import { CHANNEL_COLORS, CHANNEL_LABELS, type ChannelState } from '@/lib/analytics/revenue'
import type { RevenueChannelRow } from '@/lib/analytics/queries'

type Props = {
  ledger: RevenueChannelRow[]
}

export default function RevenueMixChart({ ledger }: Props) {
  if (ledger.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No affiliate clicks in this period — the mix appears with the first click on a buy link.
      </p>
    )
  }

  const maxProxy = Math.max(...ledger.map((c) => c.proxy), 0.0001)

  return (
    <div>
      <div className="space-y-4">
        {ledger.map((ch) => {
          const barPct = Math.max((ch.proxy / maxProxy) * 100, ch.clicks > 0 ? 4 : 0)
          const clickPct = Math.min((ch.clicks / Math.max(...ledger.map((c) => c.clicks), 1)) * 100, 100)
          return (
            <div key={ch.rawKey}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CHANNEL_COLORS[ch.state] }}
                    title={`${CHANNEL_LABELS[ch.state]} — ${ch.state}`}
                  />
                  <span className="font-medium capitalize text-foreground">{ch.retailer}</span>
                  <span className="text-muted-foreground">· {CHANNEL_LABELS[ch.state]}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {ch.clicks.toLocaleString()} clicks · rate {Math.round(ch.rate * 100 * 100) / 100}% ·{' '}
                  <span className="font-semibold text-foreground">KES {ch.proxy.toLocaleString()}</span>
                </span>
              </div>
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barPct}%`, backgroundColor: CHANNEL_COLORS[ch.state] }}
                />
                <div
                  className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-foreground/40"
                  style={{ width: `${clickPct}%` }}
                  title="Click volume (thin line)"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-foreground/70">
                  {ch.sharePct}% of clicks
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Bar = KES the proxy prices into each channel (state-coloured, normalised-key join); thin line = raw click
        volume. A channel showing clicks with an empty bar has no rate at all — see the queue below.
      </p>
    </div>
  )
}
