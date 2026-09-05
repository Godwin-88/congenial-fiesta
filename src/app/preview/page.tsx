import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import DeviceDetail from '@/components/devices/DeviceDetail'
import { getAdminUser } from '@/lib/admin/require-admin'
import { getDevicePreview } from '@/lib/devices/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Draft Preview | FweezyTech',
  robots: { index: false, follow: false },
}

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; secret?: string }>
}) {
  const { id, secret } = await searchParams
  const deviceId = Number(id)
  if (!Number.isInteger(deviceId) || deviceId <= 0) notFound()

  const configured = process.env.CMS_PREVIEW_SECRET
  const secretOk = configured ? secret === configured : false

  if (!secretOk) {
    const admin = await getAdminUser().catch(() => null)
    if (!admin) notFound()
  }

  const device = await getDevicePreview(deviceId)
  if (!device) notFound()

  return <DeviceDetail device={device} isPreview />
}
