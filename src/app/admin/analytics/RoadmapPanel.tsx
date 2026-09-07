export type RoadmapItem = {
  phase: string
  feature: string
  data: string
  kpi: string
}

type Props = {
  items: RoadmapItem[]
}

export default function RoadmapPanel({ items }: Props) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-3 pr-4 font-medium">Planned capability</th>
              <th className="text-left py-3 pr-4 font-medium">Phase</th>
              <th className="text-left py-3 pr-4 font-medium">Data / instrumentation</th>
              <th className="text-left py-3 font-medium">KPI enabled</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.feature} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 text-foreground">{item.feature}</td>
                <td className="py-3 pr-4">
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary whitespace-nowrap">
                    {item.phase}
                  </span>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{item.data}</td>
                <td className="py-3 text-muted-foreground">{item.kpi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        Instrumented in Phase 2/3 — see docs/analytics-enterprise-aligned-plan.md for the full capability registry.
 Data-layer additions ship without schema changes when this phase lands.
      </p>
    </div>
  )
}