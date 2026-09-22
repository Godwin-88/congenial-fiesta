// Outreach & Leads tab body — PIPELINE → DEMAND → SELF-SERVE → ACTION.
//
// Same contract as the other story tabs (CampaignsTabBody is the closest
// sibling): insight chip banner, lettered SectionHeadings, KPI cards carrying
// MetricInfo, one purpose-built visual per question, a ranked fix queue and a
// roadmap. The story is the two-lead-source problem: formal inbound and the
// self-serve audience that never fills a form.

import type { OutreachInsights } from '@/lib/analytics/queries'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Handshake, Inbox, PiggyBank, Users, Wrench } from 'lucide-react'
import MetricInfo from './MetricInfo'
import SectionHeading from './SectionHeading'
import RoadmapPanel, { type RoadmapItem } from './RoadmapPanel'
import OutreachTrendStrip from './OutreachTrendStrip'
import OutreachStatusPipeline from './OutreachStatusPipeline'
import OutreachBudgetLadder from './OutreachBudgetLadder'
import OutreachPackageDemand from './OutreachPackageDemand'
import OutreachLeadMix from './OutreachLeadMix'
import OutreachLeadScoreboard from './OutreachLeadScoreboard'
import OutreachFixQueue from './OutreachFixQueue'

const ROADMAP_OUTREACH_TAB: RoadmapItem[] = [
  {
    phase: 'Live',
    feature: 'Inquiry pipeline + package-demand matching',
    data: 'sponsor_inquiries × sponsorship_packages × sponsors wall',
    kpi: 'Open pipeline · median age · unmatched-interest queue',
  },
  {
    phase: 'Live',
    feature: 'Self-serve lead scoreboard + CSV export',
    data: 'FP-id intent score (compare=3 · save=2 · watch=1 · click=2)',
    kpi: 'Hot leads → retargeting / on-site recovery',
  },
  {
    phase: 'Phase 3',
    feature: 'Inquiry status history + SLA timer',
    data: 'append-only inquiry_events table (status transitions with timestamps)',
    kpi: 'Time-to-first-reply · true pipeline velocity instead of days-since-created',
  },
]

export type OutreachChip = { label: string; value: string }

type Props = {
  insights: OutreachInsights | null
  chips: OutreachChip[]
  period: string
}

function OutreachBanner({ insights, chips }: { insights: OutreachInsights | null; chips: OutreachChip[] }) {
  if (!insights) return null
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
          >
            <span className="text-muted-foreground">{chip.label}:</span>
            <span className="font-semibold text-foreground">{chip.value}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Data sources:{' '}
        <span className="font-medium text-foreground">
          sponsor_inquiries · sponsorship_packages · sponsors · fp_id intent
        </span>
        <span className="ml-1">
          — press rows ride the same inquiry table (budget_range = “press”); aging is days-since-created on open rows
          only, because statuses carry no history. Reads as pipeline → demand → self-serve → action.
        </span>
      </p>
    </div>
  )
}

function OutreachKpis({ totals }: { totals: OutreachInsights['totals'] | undefined }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CardTitle className="text-sm">Inbound</CardTitle>
          <MetricInfo
            metric="Inbound inquiries"
            definition="Sponsor and press inquiries created in the period. Press rows use budget_range = 'press' — the press-room promise rides the same table as the money."
            formula="count(sponsor_inquiries where created_at ≥ period start)"
            ga4Alias="— (first-party)"
            dataSource="sponsor_inquiries"
            action="Zero inbound is itself the finding — the queue leads with it when the window is empty."
          />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{(totals?.inquiries ?? 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(totals?.commercialInquiries ?? 0).toLocaleString()} commercial · {(totals?.pressInquiries ?? 0).toLocaleString()} press
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CardTitle className="text-sm">Open Pipeline</CardTitle>
          <MetricInfo
            metric="Open pipeline"
            definition="Inquiries still in 'new' or 'contacted' — the only two states that still expect an answer from us."
            formula="count(status in ('new','contacted')) ÷ all × 100"
            ga4Alias="— (prescriptive)"
            dataSource="sponsor_inquiries.status"
            action="Median open age is the tab's heartbeat: anything past three weeks is pipeline rot."
          />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">
            {(totals?.open ?? 0).toLocaleString()}
            <span className="ml-1 text-base font-normal text-muted-foreground">({totals?.openPct ?? 0}%)</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals?.medianOpenAgeDays !== null && totals?.medianOpenAgeDays !== undefined
              ? `median open age ${totals.medianOpenAgeDays}d`
              : 'no open rows'}
            {' · '}
            {(totals?.agedOpen ?? 0).toLocaleString()} past 21d
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CardTitle className="text-sm">Decided</CardTitle>
          <MetricInfo
            metric="Decided inquiries"
            definition="Closed (completed work) vs declined (passed on) — the win-rate numerator and the positioning signal."
            formula="count(status='closed') vs count(status='declined')"
            dataSource="sponsor_inquiries.status"
            action="A budget band that keeps ending in declined is a pricing problem, not a lead problem."
          />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{(totals?.won ?? 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            won · {(totals?.declined ?? 0).toLocaleString()} declined · {(totals?.activeSponsors ?? 0).toLocaleString()} active sponsors
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CardTitle className="text-sm">Self-Serve Leads</CardTitle>
          <MetricInfo
            metric="Self-serve leads"
            definition="Visitors who behave like leads without filling a form — fp_id intent scores, shared with the Compare tab's qualification model."
            formula="Σ weights per fp_id · hot ≥ 8 · warm ≥ 4"
            ga4Alias="— (first-party, behavioural)"
            dataSource="interactions · affiliate_clicks · fp_id"
            action="Hot leads gone quiet are the cheapest recovered revenue on the tab."
          />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{(totals?.selfServeLeads ?? 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(totals?.selfServeHot ?? 0).toLocaleString()} hot · {(totals?.selfServeWarm ?? 0).toLocaleString()} warm ·{' '}
            {(totals?.selfServeClickers ?? 0).toLocaleString()} clicked a buy link
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OutreachTabBody({ insights, chips, period }: Props) {
  const totals = insights?.totals
  const pipeline = insights?.pipeline
  const demand = insights?.demand
  const selfServe = insights?.selfServe

  return (
    <div className="space-y-6">
      <OutreachBanner insights={insights} chips={chips} />

      {/* ══ A · PIPELINE — what arrived, and what still expects an answer ══ */}
      <SectionHeading
        letter="A"
        title="Pipeline — what arrived, and what still expects an answer"
        hint="aging is honest days-since-created"
      />
      <OutreachKpis totals={totals} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-brand-primary" />
              Inquiry Arrivals — Daily Strip
              <MetricInfo
                metric="Inquiry arrival strip"
                definition="Inquiries per calendar day, zero-filled so quiet weeks read as quiet. Hover or tap a column for that day's count."
                formula="count by date(created_at), zero-filled across the period"
                ga4Alias="— (first-party)"
                dataSource="sponsor_inquiries.created_at"
                action="A flat strip with a full queue is a follow-up problem; a flat strip with an empty table is a distribution problem."
              />
            </CardTitle>
            <CardDescription>Quiet days are data, not gaps</CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachTrendStrip trend={pipeline?.trend ?? []} maxDaily={pipeline?.maxDaily ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-brand-primary" />
              Pipeline Lifecycle — Where Every Inquiry Stands
              <MetricInfo
                metric="Pipeline lifecycle band"
                definition="Every inquiry in the window laid out as one band across the four statuses (new → contacted → declined → closed), with the open-row freshness strip underneath. Width IS the share."
                formula="GROUP BY status · per-bucket median and max of days-since-created"
                ga4Alias="— (prescriptive)"
                dataSource="sponsor_inquiries (status × created_at)"
                action="Work the oldest 'new' segment first — silence converts worse than a decline, and the advertise form promised a follow-up."
              />
            </CardTitle>
            <CardDescription>Statuses carry no history — age is days since the form was submitted</CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachStatusPipeline
              statusMix={pipeline?.byStatus ?? []}
              freshness={pipeline?.freshness ?? []}
              total={totals?.inquiries ?? 0}
              openTotal={totals?.open ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* ══ B · DEMAND — what the market asked for ═══════════════════ */}
      <SectionHeading
        letter="B"
        title="Demand — budgets on the ladder, stated interest against the catalog"
        hint="unmatched interest is the sales signal"
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-brand-primary" />
              Budget Ladder — What Prospects Say They Can Spend
              <MetricInfo
                metric="Budget ladder"
                definition="Stated budget_range values in form order (Under $300 → $10,000+ / custom), with press held aside. Because the advertise form only offers a fixed ladder, a value outside it is a data problem rather than a nuance."
                formula="GROUP BY budget_range, ladder-ordered · tier rollup via rankToTier (Entry ≤ rank 1 · Mid 2–3 · Top 4+)"
                ga4Alias="— (first-party, self-reported)"
                dataSource="sponsor_inquiries.budget_range"
                action="A ladder heavy at Entry with a mid/top-heavy catalog is a packaging problem — prospects qualify themselves down before they ever talk to you."
              />
            </CardTitle>
            <CardDescription>Lowest band first, exactly as the form asks it</CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachBudgetLadder budgets={demand?.budgets ?? []} total={totals?.inquiries ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-primary" />
              Package Demand — Stated Interest vs the Live Catalog
              <MetricInfo
                metric="Package-interest matching"
                definition="Free-text package_interest from the advertise form, fuzzy-matched against the live sponsorship_packages names: catalog = token-identical · fuzzy = one side contains the other or shares a token · unmatched = the prospect asked for something the catalog does not sell · none = the field was left empty."
                formula="normalise (lowercase, strip punctuation) → exact equality → containment / shared-token → unmatched"
                ga4Alias="— (first-party)"
                dataSource="sponsor_inquiries.package_interest × sponsorship_packages.name"
                action="Unmatched rows are quotes you cannot send. Match the closest package manually now, then rename or add the package so the next inquiry lands on it."
              />
            </CardTitle>
            <CardDescription>
              {(demand?.statedInterest ?? 0).toLocaleString()} stated · {(demand?.unmatchedInterest ?? 0).toLocaleString()} match no live package
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachPackageDemand
              packages={demand?.packages ?? []}
              livePackages={demand?.livePackages ?? []}
              stated={demand?.statedInterest ?? 0}
              unmatched={demand?.unmatchedInterest ?? 0}
              total={totals?.inquiries ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* ══ C · SELF-SERVE — the audience that behaves like leads ════ */}
      <SectionHeading
        letter="C"
        title="Self-serve — the audience that behaves like leads without a form"
        hint="same scores as the Compare tab"
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-primary" />
              Lead Thermometer — Hot, Warm, Cold, Cooling
              <MetricInfo
                metric="Lead temperature band"
                definition="Scored fp_id visitors banded by intent temperature. Hot ≥ 8 points, warm 4–7, cold under 4. The hatched slice of the hot band is the part not seen in the last week of the window — heat actively escaping."
                formula="Σ weights per fp_id → bucket · cooling = hot where last_seen older than 7d"
                ga4Alias="— (first-party, behavioural)"
                dataSource="interactions · affiliate_clicks · fp_id"
                action="Recover cooling hot leads with retargeting-friendly surfaces — fresh related content, a visible sponsorship CTA, a sign-in prompt. There is no email behind an fp_id."
              />
            </CardTitle>
            <CardDescription>
              {(selfServe?.hot ?? 0).toLocaleString()} hot · {(selfServe?.warm ?? 0).toLocaleString()} warm ·{' '}
              {(selfServe?.cooling ?? 0).toLocaleString()} cooling · median score {selfServe?.medianScore ?? 0}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachLeadMix
              hot={selfServe?.hot ?? 0}
              warm={selfServe?.warm ?? 0}
              cold={selfServe?.cold ?? 0}
              cooling={selfServe?.cooling ?? 0}
              clickers={selfServe?.clickers ?? 0}
              signedIn={selfServe?.signedIn ?? 0}
              medianScore={selfServe?.medianScore ?? 0}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-primary" />
              Lead Scoreboard — The Bench, Ranked
              <MetricInfo
                metric="Self-serve lead scoreboard"
                definition="The scored audience as CRM-handoff rows: one fp_id per row with its intent score and the raw signals behind it (compares · saves · watches · related-clicks) plus affiliate clicks and last-seen date."
                formula="score = compares×3 + saves×2 + watches + related-clicks + affiliate-clicks×2 (+ signed-in bonus)"
                ga4Alias="— (first-party)"
                dataSource="interactions · affiliate_clicks · fp_id"
                action="Rows marked ▾ are cooling — seen, interested, and drifting. They are the cheapest recovered revenue on the tab."
              />
            </CardTitle>
            <CardDescription>Ranked by intent score · synced with the qualified-leads CSV export</CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachLeadScoreboard leads={selfServe?.leads ?? []} limit={15} />
          </CardContent>
        </Card>
      </div>

      {/* ══ D · ACTION — the ranked outreach queue ═══════════════════ */}
      <SectionHeading
        letter="D"
        title="Action — the outreach queue, ranked by money at stake"
        hint="unanswered inbound first · then rot · then unquotable demand"
      />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-brand-primary" />
              Outreach Fix Queue
            <MetricInfo
              metric="Outreach fix queue"
              definition="One row per fixable gap, ranked by stake: inquiries gone stale in 'new', press rows unanswered, contacted-but-never-resolved rot, stated interests the catalog cannot quote, closed deals missing from the sponsor wall, hot leads gone quiet, and open inquiries with no website on file."
              formula="stake = age or volume × gap cost (stale new ×2/day · contacted rot ×1.5/day · unmatched interest ×6/ask · cooling hot lead ×2/score-point) · queue capped at 25"
              ga4Alias="— (prescriptive, not a GA4 metric)"
              dataSource="sponsor_inquiries × sponsorship_packages × sponsors × fp_id scores"
              action="Work top-down: the first rows are money already on the table that nobody has answered."
            />
          </CardTitle>
          <CardDescription>Prescriptive, prioritised, deep-linked where it counts</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/api/admin/export/outreach-queue?period=${period}`}>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                <Download className="mr-1 h-4 w-4" /> Queue CSV
              </Button>
            </Link>
            <Link href={`/api/admin/export/outreach-pipeline?period=${period}`}>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                <Download className="mr-1 h-4 w-4" /> Pipeline CSV
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <OutreachFixQueue items={insights?.action.fixQueue ?? []} limit={25} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-brand-primary" />
            Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoadmapPanel items={ROADMAP_OUTREACH_TAB} />
        </CardContent>
      </Card>
    </div>
  )
}

