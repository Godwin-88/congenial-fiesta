import Link from 'next/link'

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  viewAllHref?: string
  viewAllLabel?: string
}

/**
 * Standard section header used across device detail, list pages and
 * home sections: optional uppercase brand-colour eyebrow, bold heading,
 * optional description and an optional "View all" link. Gives every
 * page the same scannable cadence.
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  viewAllHref,
  viewAllLabel = 'View all',
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="mt-1 shrink-0 text-sm font-medium text-brand-primary hover:underline"
        >
          {viewAllLabel} →
        </Link>
      )}
    </div>
  )
}