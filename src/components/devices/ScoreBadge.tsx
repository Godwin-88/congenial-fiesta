import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-14 w-14 text-lg',
  lg: 'h-20 w-20 text-2xl',
}

const scoreColorClass = (score: number): string => {
  if (score >= 80) return 'text-score-high border-score-high'
  if (score >= 60) return 'text-score-mid border-score-mid'
  return 'text-score-low border-score-low'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  // A Fweezy score of 0 / null means "not set yet" (the CMS seeds zeros until
  // the admin fills in the five sub-scores). We must not render a literal "0"
  // — an unset rating should read as "--", never as a real, terrible score.
  const hasScore = typeof score === 'number' && score > 0

  if (!hasScore) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full border-2 border-dashed border-border font-bold leading-none text-muted-foreground',
          sizeClasses[size],
        )}
        title="Score not set yet"
      >
        —
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-bold leading-none',
        sizeClasses[size],
        scoreColorClass(score),
      )}
      title={`Score: ${score}/100`}
    >
      {score}
    </div>
  )
}