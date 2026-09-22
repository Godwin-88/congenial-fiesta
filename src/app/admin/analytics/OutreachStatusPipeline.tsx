// Pipeline status band — the inquiry lifecycle as one horizontal band.
//
// Same house idiom as the Community tab's TrustHealthBand and the Search tab's
// AnswerCoverageBand (a share-of-total band where width IS the metric), but the
// axis is the inquiry lifecycle: new → contacted → declined → closed. Ordering
// is deliberate — the two OPEN states sit on the left where the eye lands, so
// the size of "still expects an answer" reads before the decided tail.
//
// Hover/tap a segment to pin the full metrics card for that status, per the
// dashboard's hover-card contract (ChartHoverCard, in-flow, never absolute).

'use client'

import { useState } from 'react'
import type { OutreachInsights } from '@/lib/analytics/queries'
import {
  FRESHNESS_COLORS,
  FRESHNESS_DESCRIPTIONS,
  FRESHNESS_LABELS,
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_DESCRIPTIONS,
  INQUIRY_STATUS_LABELS,
  type InquiryFreshness,
  type InquiryStatus,
} from '@/lib/analytics/outreach'
import ChartHoverCard from './ChartHoverCard'

type Props = {
  statusMix: OutreachInsights['pipeline']['byStatus']
  freshness: OutreachInsights['pipeline']['freshness']
  total: number
  openTotal: number
}

const STATUS_ORDER: InquiryStatus[] = ['new', 'contacted', 'declined', 'closed']
const FRESHNESS_ORDER: InquiryFreshness[] = ['fresh', 'warm', 'stale', 'cold']

export default function OutreachStatusPipeline({ statusMix, freshness, total, openTotal }: Props) {
  const [activeStatus, setActiveStatus] = useState<InquiryStatus | null>(null)
  const [activeFresh, setActiveFresh] = useState<InquiryFreshness | null>(null)

  if (total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No inquiries in this window — the lifecycle band appears with the first advertise or press submission.
      </p>
    )
  }

  const visibleStatus = STATUS_ORDER.map((s) => statusMix.find((b) => b.status === s)).filter(
    (row): row is OutreachInsights['pipeline']['byStatus'][number] => !!row && row.count > 0,
  )
  const statusBand = activeStatus ? statusMix.find((b) => b.status === activeStatus) ?? null : null
  const activeFreshness = activeFresh ? freshness.find((f) => f.freshness === activeFresh) ?? null : null
  const visibleFreshness = FRESHNESS_ORDER.map((f) => freshness.find((b) => b.freshness === f)).filter(
    (row): row is OutreachInsights['pipeline']['freshness'][number] => !!row && row.count > 0,
  )

  return (
    <div className="space-y-5">
      {statusBand && (
        <div className="flex justify-start">
          <ChartHoverCard
            title={`${statusBand.label} — ${statusBand.count.toLocaleString()} inquiries (${statusBand.sharePct}%)`}
            subtitle={statusBand.open ? 'Open — still expects an answer' : 'Decided'}
            rows={[
              { color: INQUIRY_STATUS_COLORS[statusBand.status], label: 'Inquiries', value: statusBand.count.toLocaleString() },
              { color: '#94A3B8', label: 'Median age', value: statusBand.medianAgeDays !== null ? `${statusBand.medianAgeDays}d` : '—' },
              { color: '#EF4444', label: 'Oldest age', value: statusBand.oldestAgeDays !== null ? `${statusBand.oldestAgeDays}d` : '—' },
            ]}
            footer={INQUIRY_STATUS_DESCRIPTIONS[statusBand.status]}
          />
        </div>
      )}

      <div>
        <div className="flex h-10 w-full overflow-hidden rounded-lg border border-border">
          {visibleStatus.map((band) => (
            <button
              key={band.status}
              type="button"
              onClick={() => setActiveStatus((prev) => (prev === band.status ? null : band.status))}
              onMouseEnter={() => setActiveStatus(band.status)}
              onMouseLeave={() => setActiveStatus(null)}
              onFocus={() => setActiveStatus(band.status)}
              aria-label={`${band.label}: ${band.count} inquiries, ${band.sharePct}% — activate to pin the breakdown`}
              className="flex cursor-pointer items-center justify-center text-[11px] font-semibold text-white/95 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-primary/60"
              style={{ width: `${Math.max(band.sharePct, 1.5)}%`, backgroundColor: INQUIRY_STATUS_COLORS[band.status] }}
            >
              {band.sharePct >= 10 ? `${band.label} ${band.sharePct}%` : ''}
            </button>
          ))}
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {statusMix.map((band) => (
            <li key={band.status} className="flex items-start gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: INQUIRY_STATUS_COLORS[band.status] }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {INQUIRY_STATUS_LABELS[band.status]}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {band.count.toLocaleString()} · {band.sharePct}%
                    {band.medianAgeDays !== null ? ` · median ${band.medianAgeDays}d` : ''}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{INQUIRY_STATUS_DESCRIPTIONS[band.status]}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {openTotal > 0 && visibleFreshness.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            How long the unanswered have waited ({openTotal.toLocaleString()} open)
          </p>
          {activeFreshness && (
            <div className="mb-3 flex justify-start">
              <ChartHoverCard
                title={`${activeFreshness.label} — ${activeFreshness.count.toLocaleString()} open (${activeFreshness.sharePct}% of open)`}
                rows={[
                  {
                    color: FRESHNESS_COLORS[activeFreshness.freshness],
                    label: 'Open inquiries',
                    value: activeFreshness.count.toLocaleString(),
                  },
                  { color: '#94A3B8', label: 'Share of open', value: `${activeFreshness.sharePct}%` },
                ]}
                footer={FRESHNESS_DESCRIPTIONS[activeFreshness.freshness]}
              />
            </div>
          )}
          <div className="flex h-8 w-full overflow-hidden rounded-lg border border-border">
            {visibleFreshness.map((band) => (
              <button
                key={band.freshness}
                type="button"
                onClick={() => setActiveFresh((prev) => (prev === band.freshness ? null : band.freshness))}
                onMouseEnter={() => setActiveFresh(band.freshness)}
                onMouseLeave={() => setActiveFresh(null)}
                onFocus={() => setActiveFresh(band.freshness)}
                aria-label={`${FRESHNESS_LABELS[band.freshness]}: ${band.count} open inquiries — activate to pin`}
                className="flex cursor-pointer items-center justify-center text-[10px] font-semibold text-white/95 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-primary/60"
                style={{ width: `${Math.max(band.sharePct, 2)}%`, backgroundColor: FRESHNESS_COLORS[band.freshness] }}
              >
                {band.sharePct >= 14 ? band.count : ''}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Age is days since the form was submitted — statuses carry no history, so this clock only runs on open rows.
          </p>
        </div>
      )}
    </div>
  )
}
