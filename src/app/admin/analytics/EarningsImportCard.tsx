'use client'

import { useState } from 'react'
import { CloudUpload } from 'lucide-react'

interface ImportResult {
  inserted: number
  skipped: number
  errors?: Array<{ row: number; error: string }>
}

const SAMPLE_CSV = `retailer,period_start,period_end,gross_amount,commission_amount,currency,status,source
jumia,2026-08-01,2026-08-31,152000,12160,KES,confirmed,jumia-statement
amazon,2026-08-01,2026-08-31,89000,3560,KES,confirmed,amazon-associates
kilimall,2026-08-01,2026-08-31,43000,2580,KES,estimated,kilimall-statement
`

export default function EarningsImportCard({ canManage }: { canManage: boolean }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importCsv = async (file: File) => {
    const csv = await file.text()
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/admin/analytics/earnings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
        return
      }
      setResult(data)
    } catch {
      setError('Request failed — check the file and try again')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await importCsv(file)
  }

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'earnings-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CloudUpload className="h-4 w-4 text-brand-primary" />
        <p className="text-sm font-medium text-foreground">Import Earnings CSV</p>
      </div>

      {!canManage ? (
        <p className="text-xs text-muted-foreground">Editor/viewer cannot modify earnings. Owner or admin only.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            Paste or upload a CSV from your affiliate network (Jumia, Amazon, Kilimall). Columns:{' '}
            <code className="text-foreground/80">retailer, period_start, period_end, gross_amount, commission_amount[, currency, status, source]</code>
          </p>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border
                              text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 cursor-pointer">
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" disabled={busy} />
              {busy ? 'Importing…' : 'Choose CSV…'}
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground
                         hover:text-foreground hover:bg-foreground/5"
            >
              Download template
            </button>
          </div>

          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

          {result && (
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-foreground">
                Imported <span className="font-bold text-emerald-400">{result.inserted}</span> row
                {result.inserted === 1 ? '' : 's'} · skipped duplicates:{' '}
                <span className="font-bold">{result.skipped}</span>
              </p>
              {result.errors && result.errors.length > 0 && (
                <ul className="text-muted-foreground list-disc list-inside">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                  {result.errors.length > 5 && <li>…{result.errors.length - 5} more</li>}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}