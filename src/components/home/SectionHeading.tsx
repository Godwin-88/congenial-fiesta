import Link from 'next/link'

type Props = {
  label: string
  title: string
  tagline?: string
  viewAllHref?: string
  viewAllLabel?: string
}

export default function SectionHeading({
  label, title, tagline, viewAllHref, viewAllLabel = 'View all'
}: Props) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div className="flex items-center gap-4">
        <div className="w-1 h-8 bg-brand-primary rounded-full shrink-0" />
        <div>
          <p className="text-brand-primary text-xs uppercase tracking-widest font-semibold mb-0.5">
            {label}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-heading">
            {title}
          </h2>
          {tagline && (
            <p className="text-muted-foreground text-sm italic mt-1">{tagline}</p>
          )}
        </div>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-brand-primary text-sm font-medium hover:underline shrink-0 mt-1 flex items-center gap-1"
        >
          {viewAllLabel} →
        </Link>
      )}
    </div>
  )
}