// Dead device paths — demand that arrives at a 404.
//
// These slugs exist nowhere in the catalog, so the fix is never in the device
// record: it is a redirect, a repaired internal link or a new page. Listed
// separately from the fix queue because the owner is different (SEO/dev, not
// the catalog editor).

type Props = {
  paths: Array<{ path: string; slug: string; views: number }>
  totalViews: number
}

export default function OrphanDemandTable({ paths, totalViews }: Props) {
  if (paths.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-emerald-400">
        No dead device paths — every viewed device slug resolved to a catalog row.
      </p>
    )
  }

  const maxViews = Math.max(1, ...paths.map((p) => p.views))

  return (
    <div>
      <ul className="space-y-2">
        {paths.map((row) => (
          <li key={row.path} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-mono text-xs text-amber-400" title={row.path}>
                {row.path}
              </span>
              <span className="shrink-0 text-xs font-semibold text-foreground tabular-nums">
                {row.views.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${(row.views / maxViews) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{paths.reduce((sum, p) => sum + p.views, 0).toLocaleString()}</span>{' '}
        of {totalViews.toLocaleString()} device-page views landed on a path with no catalog row. Each one is a
        redirect waiting to happen — point it at the current slug or build the page the query implies.
      </p>
    </div>
  )
}
