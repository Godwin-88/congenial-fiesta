// Section heading for the story-driven tabs (A · Coverage → D · Action).
//
// The Devices tab reads as four questions in order, so each block gets a letter
// marker and a rule. Kept as a plain server component so it costs no client JS
// and stays a sibling of the Card components rather than a wrapper.

type Props = {
  letter: string
  title: string
  hint?: string
}

export default function SectionHeading({ letter, title, hint }: Props) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-[11px] font-bold text-brand-primary">
        {letter}
      </span>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {hint ? <span className="hidden text-[11px] text-muted-foreground md:inline">· {hint}</span> : null}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
