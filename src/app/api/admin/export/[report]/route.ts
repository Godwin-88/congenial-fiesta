import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/actions'
import {
  getPageViewsOverTime,
  getTopPages,
  getTopAffiliatePages,
} from '@/lib/analytics/queries'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0]).join(',')
  const body = data.map((row) =>
    Object.values(row)
      .map((val) => {
        const str = String(val ?? '')
        // Escape commas and quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  ).join('\n')
  return `${headers}\n${body}`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> }
) {
  const { report } = await params

  // Auth check
  const user = await getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(_request.url)
  const period = url.searchParams.get('period') ?? '30d'
  const date = new Date().toISOString().split('T')[0]

  let csv = ''
  let filename = ''

  switch (report) {
    case 'page-views': {
      const data = await getPageViewsOverTime(period)
      csv = toCSV(data.map((d) => ({ date: d.date, views: d.views })))
      filename = `page-views-${period}-${date}.csv`
      break
    }
    case 'top-pages': {
      const data = await getTopPages(period, 100)
      csv = toCSV(data.map((d, i) => ({ rank: i + 1, path: d.path, views: d.views })))
      filename = `top-pages-${period}-${date}.csv`
      break
    }
    case 'affiliate-clicks': {
      const data = await getTopAffiliatePages(period, 100)
      csv = toCSV(data.map((d, i) => ({
        rank: i + 1,
        device_slug: d.deviceSlug,
        retailer: d.retailer,
        clicks: d.clicks,
      })))
      filename = `affiliate-clicks-${period}-${date}.csv`
      break
    }
    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}