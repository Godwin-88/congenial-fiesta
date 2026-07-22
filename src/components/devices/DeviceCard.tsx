import Link from 'next/link'
import Image from 'next/image'
import type { Device, Brand } from '@/payload-types'
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import AddToCompareButton from '@/components/devices/AddToCompareButton'

interface DeviceCardProps {
  device: Device
}

export function DeviceCard({ device }: DeviceCardProps) {
  const brand = device.brand as Brand
  const primaryImage = device.images?.find((img) => img.isPrimary) ?? device.images?.[0]
  const overallScore = device.scores?.overall ?? 0

  return (
    <Link
      href={`/devices/${brand.slug}/${device.slug}`}
      className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain p-4 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{brand.name}</p>
            <h3 className="truncate font-heading text-lg font-bold text-foreground">
              {device.name}
            </h3>
          </div>
          <ScoreBadge score={overallScore} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
            {device.category}
          </span>
          {device.priceKES && (
            <span className="text-sm font-semibold text-foreground">
              KES {device.priceKES.toLocaleString()}
            </span>
          )}
        </div>

        {device.tagline && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {device.tagline}
          </p>
        )}

        <AddToCompareButton
          device={{
            slug: device.slug,
            brandSlug: brand.slug,
            name: device.name,
            imageUrl: primaryImage?.url,
            score: overallScore,
          }}
        />
      </div>
    </Link>
  )
}