// Trust health bands — how social-proof is distributed across the catalog.
//
// Four bands because the community question is a lifecycle, not a percentage:
// healthy (proof is compounding) · thin (one voice) · stale (proof is ageing
// out) · silent (no proof at all). Width is the share of devices; the red
// silent band is deliberately last so the eye lands on the backlog size.

import { TRUST_HEALTH_COLORS, TRUST_HEALTH_DESCRIPTIONS, type TrustHealth } from '@/lib/analytics/community'

type Props = {
  mix: Array<{ health: TrustHealth; label: string; devices: number; sharePct: number }>
  total: number
}

export default function TrustHealthBand({ mix, total }: Props) {
  const visible = mix.filter((m) => m.devices > 0)

  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No devices to classify yet — the health bands appear once the catalog has rows.
      </p>
    )
  }

  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
        {visible.map((band) => (
          <div
            key={band.health}
            title={`${band.label}: ${band.devices.toLocaleString()} devices (${band.sharePct}%) — ${TRUST_HEALTH_DESCRIPTIONS[band.health]}`}
            className="flex items-center justify-center text-[11px] font-semibold text-white/95"
            style={{ width: `${Math.max(band.sharePct, 1.5)}%`, backgroundColor: TRUST_HEALTH_COLORS[band.health] }}
          >
            {band.sharePct >= 8 ? `${band.label} ${band.sharePct}%` : ''}
          </div>
        ))}
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {mix.map((band) => (
          <li key={band.health} className="flex items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TRUST_HEALTH_COLORS[band.health] }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {band.label}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {band.devices.toLocaleString()} devices · {band.sharePct}%
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">{TRUST_HEALTH_DESCRIPTIONS[band.health]}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> devices classified across the
        whole catalog (ratings + comments, any age). Health is a lifecycle: thin grows into healthy only when a second
        voice arrives — see the queue for the highest-traffic device without proof.
      </p>
    </div>
  )
}
