import type { Device } from '@/payload-types'

interface VerdictBlockProps {
  verdict: Device['verdict']
}

export function VerdictBlock({ verdict }: VerdictBlockProps) {
  if (!verdict) return null

  const hasPros = verdict.pros && verdict.pros.length > 0
  const hasCons = verdict.cons && verdict.cons.length > 0
  const hasBottomLine = !!verdict.bottomLine
  const hasFullVerdict = !!verdict.fullVerdict

  if (!hasPros && !hasCons && !hasBottomLine && !hasFullVerdict) return null

  return (
    <div className="rounded-xl border-l-4 border-brand-primary bg-card p-6">
      <h3 className="mb-4 font-heading text-xl font-bold text-foreground">
        Fweezy's Verdict
      </h3>

      <div className="grid gap-6 sm:grid-cols-2">
        {hasPros && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-score-high">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              Pros
            </h4>
            <ul className="space-y-1.5">
              {verdict.pros!.map((pro, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-score-high">✓</span>
                  {pro.point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasCons && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-score-low">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              Cons
            </h4>
            <ul className="space-y-1.5">
              {verdict.cons!.map((con, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-score-low">✗</span>
                  {con.point}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {hasBottomLine && (
        <p className="mt-4 italic text-foreground/80">&ldquo;{verdict.bottomLine}&rdquo;</p>
      )}
    </div>
  )
}

export function FullVerdictRichText({
  fullVerdict,
}: {
  fullVerdict: Record<string, unknown>
}) {
  return (
    <div className="rounded-xl border-l-4 border-brand-primary bg-card p-6">
      <h3 className="mb-4 font-heading text-xl font-bold text-foreground">
        Fweezy's Full Verdict
      </h3>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {JSON.stringify(fullVerdict)}
      </div>
    </div>
  )
}