import Link from 'next/link'
import Image from 'next/image'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Device = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Brand = any
import { ScoreBadge } from '@/components/devices/ScoreBadge'
import AddToCompareButton from '@/components/devices/AddToCompareButton'

interface DeviceCardProps {
  device: Device
}

export function DeviceCard({ device }: DeviceCardProps) {
  const brand = device.brand as Brand
  const primaryImage = device.images?.find((img: any) => img.isPrimary) ?? device.images?.[0]
  const overallScore = device.scores_overall ?? 0

  return (
    <Link
      href={`/devices/${brand.slug}/${device.slug}`}
      className="group rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-lg sm:p-4"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted sm:aspect-[4/5]">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 transition-transform group-hover:scale-105 sm:p-4"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4 sm:space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{brand.name}</p>
            <h3 className="truncate font-heading text-sm font-bold text-foreground sm:text-lg">
              {device.name}
            </h3>
          </div>
          <ScoreBadge score={overallScore} size="sm" />
        </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:mt-2 sm:gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground sm:text-xs">
              {device.device_type?.label ?? device.major_category ?? 'Device'}
            </span>
            {device.price_kes && (
            <span className="text-xs font-semibold text-foreground sm:text-sm">
              KES {device.price_kes.toLocaleString()}
            </span>
          )}
        </div>

        {device.tagline && (
          <p className="hidden line-clamp-2 text-sm text-muted-foreground sm:block">
            {device.tagline}
          </p>
        )}

        <div className="pt-1 sm:pt-0">
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
      </div>
    </Link>
  )
}