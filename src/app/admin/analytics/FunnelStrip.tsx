import type { ReactNode } from 'react'
import { Eye, MousePointerClick, Smartphone, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type FunnelStep = {
  label: string
  value: string
  sub: string
  icon: ReactNode
  accent?: boolean
}

type Props = {
  totalViews: number
  deviceViews: number
  clicks: number
  deviceToClickRate: number
}

export default function FunnelStrip({ totalViews, deviceViews, clicks, deviceToClickRate }: Props) {
  const steps: FunnelStep[] = [
    {
      label: '1 · Total Views',
      value: totalViews.toLocaleString(),
      sub: 'all pages',
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: '2 · Device Page Views',
      value: deviceViews.toLocaleString(),
      sub: 'catalog pages',
      icon: <Smartphone className="h-4 w-4" />,
    },
    {
      label: '3 · Affiliate Clicks',
      value: clicks.toLocaleString(),
      sub: 'outbound buy links',
      icon: <MousePointerClick className="h-4 w-4" />,
    },
    {
      label: '4 · Device → Click Conversion',
      value: `${deviceToClickRate}%`,
      sub: 'buy-link CTR on device pages',
      icon: <TrendingUp className="h-4 w-4" />,
      accent: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {steps.map((step) => (
        <Card key={step.label} className={step.accent ? 'border-brand-primary/40' : ''}>
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                step.accent ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-brand-primary'
              }`}
            >
              {step.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{step.label}</p>
              <p className="text-xl font-bold text-foreground truncate">{step.value}</p>
              <p className="text-xs text-muted-foreground">{step.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}