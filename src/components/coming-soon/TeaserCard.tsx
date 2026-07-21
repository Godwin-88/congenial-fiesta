import Image from 'next/image'

type TeaserCardProps = {
  id: string
  deviceName: string
  silhouetteImage?: string | null
  expectedWeek: string
  teaser?: string | null
}

export function TeaserCard({ id, deviceName, silhouetteImage, expectedWeek, teaser }: TeaserCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {silhouetteImage ? (
          <Image
            src={silhouetteImage}
            alt={deviceName}
            fill
            className="object-cover brightness-[0.3] blur-[4px] scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-4xl text-foreground/20">?</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white">{deviceName}</h3>
          <p className="text-sm text-white/70">{expectedWeek}</p>
        </div>
      </div>
      {teaser && (
        <div className="p-3">
          <p className="text-sm text-foreground/60 italic">&ldquo;{teaser}&rdquo;</p>
        </div>
      )}
      <div className="px-3 pb-3">
        <a
          href={`#notify-${id}`}
          className="block w-full rounded-lg bg-brand-primary py-2 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Notify Me
        </a>
      </div>
    </div>
  )
}