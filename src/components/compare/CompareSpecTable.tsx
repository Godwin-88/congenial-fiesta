'use client'

import { useState } from 'react'

interface SpecRow {
  label: string
  value: string | number | boolean | null | undefined
}

interface DeviceSpecs {
  [group: string]: Record<string, SpecRow>
}

interface CompareSpecTableProps {
  devices: DeviceSpecs[]
  deviceNames: string[]
}

const NUMERIC_KEYS = ['battery', 'capacity', 'ram', 'storage', 'refresh rate', 'resolution', 'size', 'weight']

const SPEC_GROUPS = [
  'Design',
  'Display',
  'Processor',
  'Memory',
  'Camera',
  'Battery',
  'Connectivity',
  'Software',
]

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const match = String(value).match(/[\d.]+/)
  if (!match) return null
  const num = parseFloat(match[0])
  return isNaN(num) ? null : num
}

function isNumericLabel(label: string): boolean {
  const lower = label.toLowerCase()
  return NUMERIC_KEYS.some((k) => lower.includes(k))
}

export default function CompareSpecTable({ devices, deviceNames }: CompareSpecTableProps) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false)

  if (devices.length === 0 || deviceNames.length === 0) return null

  const allGroups = SPEC_GROUPS.filter((group) =>
    devices.some((d) => d[group] && Object.keys(d[group]).length > 0),
  )

  if (allGroups.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="diff-only"
          checked={showDifferencesOnly}
          onChange={(e) => setShowDifferencesOnly(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <label htmlFor="diff-only" className="text-sm text-foreground/70">
          Show only differences
        </label>
      </div>

      {allGroups.map((group) => {
        const allLabels = devices.flatMap((d) => Object.keys(d[group] ?? {}))
        const uniqueLabels = Array.from(new Set(allLabels))

        if (uniqueLabels.length === 0) return null

        const rows = uniqueLabels.map((label) => {
          const values = devices.map((d) => {
            const row = (d[group] ?? {})[label]
            return row?.value ?? null
          })

          const allNull = values.every((v) => v === null || v === undefined || v === '')
          const allEqual = values.length > 1 && values.every((v) => v === values[0])

          if (showDifferencesOnly && allEqual) return null

          const isNumeric = isNumericLabel(label)
          const numericValues = values.map((v) => (typeof v === 'boolean' ? null : parseNumeric(typeof v === 'number' ? v : String(v))))
          let winnerIndex = -1
          if (isNumeric && numericValues.some((v) => v !== null)) {
            const nonNullNumbers = numericValues.filter((n): n is number => n !== null)
            const max = Math.max(...nonNullNumbers)
            winnerIndex = numericValues.findIndex((n) => n === max)
          }

          return { label, values, allNull, allEqual, isNumeric, winnerIndex }
        }).filter((r): r is NonNullable<typeof r> => r !== null)

        if (rows.length === 0) return null

        return (
          <div key={group} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 font-heading font-semibold text-foreground bg-muted/30">
              {group}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-1/4">
                      Spec
                    </th>
                    {deviceNames.map((name) => (
                      <th key={name} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.label}
                      className={`border-b border-border last:border-b-0 ${row.allEqual ? 'opacity-50' : 'bg-amber-500/5'}`}
                    >
                      <td className="px-4 py-2 text-sm text-muted-foreground">{row.label}</td>
                      {row.values.map((val: string | number | boolean | null | undefined, idx: number) => (
                        <td
                          key={idx}
                          className={`px-4 py-2 text-sm ${row.allEqual ? 'text-foreground/70' : 'text-foreground font-semibold'} ${row.winnerIndex === idx ? 'text-green-400' : ''}`}
                        >
                          {val === null || val === undefined || val === '' ? (
                            <span className="text-muted-foreground/50">—</span>
                          ) : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
