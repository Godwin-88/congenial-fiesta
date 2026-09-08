import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import { importEarningsRows, type EarningsImportRow } from '@/lib/analytics/queries'

// POST /api/admin/analytics/earnings/import — import affiliate-network CSV
// statements into the affiliate_earnings ledger (owner/admin only).
//
// Expected CSV columns (case-insensitive, comma-separated; header row required):
//   retailer,period_start,period_end,gross_amount,commission_amount[,currency,status,source,note]
//
// Or send JSON directly: { "rows": [ { retailer: "jumia", periodStart: "...", ... } ] }

const EXPECTED_HEADERS = [
  'retailer',
  'period_start',
  'period_end',
  'gross_amount',
  'commission_amount',
]

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  // last field
  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  return rows
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    let rows: EarningsImportRow[] = []

    if (Array.isArray(body.rows)) {
      // JSON rows mode
      for (const r of body.rows) {
        rows.push({
          retailer: String(r.retailer ?? ''),
          periodStart: String(r.periodStart ?? ''),
          periodEnd: String(r.periodEnd ?? ''),
          gross: Number(r.gross),
          commission: Number(r.commission ?? 0),
          currency: r.currency ? String(r.currency) : undefined,
          status: r.status ? String(r.status) : undefined,
          source: r.source ? String(r.source) : undefined,
          note: r.note ? String(r.note) : undefined,
        })
      }
    } else if (typeof body.csv === 'string' && body.csv.trim()) {
      const parsed = parseCsv(body.csv)
      if (parsed.length < 2) {
        return NextResponse.json(
          { error: 'CSV must include a header row and at least one data row' },
          { status: 400 }
        )
      }
      const headers = parsed[0].map(normalizeHeader)
      const idx = Object.fromEntries(headers.map((h, i) => [h, i]))
      for (const h of EXPECTED_HEADERS) {
        if (!(h in idx)) {
          return NextResponse.json(
            { error: `Missing column "${h}". Expected: ${EXPECTED_HEADERS.join(', ')}` },
            { status: 400 }
          )
        }
      }
      // Handle both date column style (period_start/period_end) and single observed-period
      for (const line of parsed.slice(1)) {
        const cell = (h: string) => line[idx[h]]?.trim() ?? ''
        rows.push({
          retailer: cell('retailer'),
          periodStart: cell('period_start'),
          periodEnd: cell('period_end') || cell('period_start'),
          gross: Number(cell('gross_amount')),
          commission: Number(cell('commission_amount') || '0'),
          currency: cell('currency') || undefined,
          status: cell('status') || undefined,
          source: cell('source') || 'csv-import',
          note: cell('note') || undefined,
        })
      }
    } else {
      return NextResponse.json({ error: 'Provide "csv" text or "rows" array' }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No importable rows' }, { status: 400 })
    }

    const result = await importEarningsRows(rows)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}