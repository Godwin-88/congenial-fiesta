'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface BrandOption {
  id: number
  name: string
}

interface BrandSelectProps {
  brands: BrandOption[]
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
  className?: string
}

export default function BrandSelect({ brands, value, onChange, disabled, className }: BrandSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selected = brands.find(b => b.id === value)

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none disabled:opacity-40"
      >
        <span className={selected ? 'text-white' : 'text-gray-500'}>
          {selected ? selected.name : 'Select brand…'}
        </span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-muted"
          >
            Select brand…
          </button>
          {brands.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onChange(b.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-muted"
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
