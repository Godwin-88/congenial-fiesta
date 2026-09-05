'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { Device } from '@/types/cms'

interface RelatedDevicesProps {
  devices: Device[]
  currentSlug: string
}

export default function RelatedDevices({ devices, currentSlug }: RelatedDevicesProps) {
  const related = devices.filter((d) => d.slug !== currentSlug)
  if (related.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
        You might also consider
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {related.slice(0, 4).map((device) => {
          const brandSlug = (device.brand as any)?.slug
          const primary = (device.images ?? []).find((img: any) => img.isPrimary) ?? (device.images ?? [])[0]
          return (
            <Link
              key={device.id}
              href={`/devices/${brandSlug}/${device.slug}`}
              className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg"
            >
              <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                {primary?.url ? (
                  <Image
                    src={String(primary.url)}
                    alt={String(device.name)}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain p-2 transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {(device.brand as any)?.name ? `${(device.brand as any).name} ` : ''}{device.name}
              </h3>
              {device.scores_overall != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fweezy Score: <span className="font-medium text-foreground">{device.scores_overall}</span>
                </p>
              )}
            </Link>
          )
        })}
      </div>
      <div className="mt-4">
        <Link
          href="/devices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
        >
          View all devices <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}