import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUser } from '@/lib/auth/actions'
import { generateReportCsv } from '@/lib/analytics/export'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ report: string }> }
) {
  const { report } = await params

  // Auth check
  const user = await getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? '30d'
  const metric = url.searchParams.get('metric') ?? 'views'
  const dimension = url.searchParams.get('dimension') ?? 'path'
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 500)

  try {
    const { csv, filename } = await generateReportCsv(report, { period, limit, metric, dimension })
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown report type'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}