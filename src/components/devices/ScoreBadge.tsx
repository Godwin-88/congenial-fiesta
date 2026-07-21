import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
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