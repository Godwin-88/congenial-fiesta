'use client'

import Link from 'next/link'
import type { NavigationCard as NavCard } from '@/types/chat'

const typeIcons: Record<string, string> = {
  device: '📱',
  article: '📄',
  video: '▶️',
  page: '🔗',
}

export default function NavigationCard({
  card,
  onClose,
}: {
  card: NavCard
  onClose?: () => void
}) {
  return (
    <Link
      href={card.url}
      onClick={onClose}
      className="flex items-center gap-3 p-2.5 rounded-lg border border-brand-primary/30 bg-card/50 hover:bg-brand-primary/10 hover:scale-[1.02] transition-all duration-150 group max-h-14"
    >
      <span className="text-lg flex-shrink-0">{typeIcons[card.type] ?? '🔗'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{card.title}</p>
        <p className="text-xs text-muted-foreground truncate">{card.subtitle}</p>
      </div>
      {card.score !== undefined && (
        <span className="flex-shrink-0 text-xs font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">
          {card.score}
        </span>
      )}
    </Link>
  )
}