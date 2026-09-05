import { BadgeCheck, Clock, Ban } from 'lucide-react'

export type Availability =
  | 'in-stock'
  | 'coming-soon'
  | 'out-of-stock'
  | null
  | undefined

const CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  'in-stock': {
    label: 'In stock',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
    icon: <BadgeCheck size={14} />,
  },
  'coming-soon': {
    label: 'Coming soon',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: <Clock size={14} />,
  },
  'out-of-stock': {
    label: 'Out of stock',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: <Ban size={14} />,
  },
}

export default function AvailabilityBadge({ availability }: { availability: Availability }) {
  if (!availability) return null
  const cfg = CONFIG[availability]
  if (!cfg) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}