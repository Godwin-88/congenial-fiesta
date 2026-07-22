'use client'

import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'

interface CompareDevicePickerProps {
  selectedSlugs: string[]
  deviceNames: string[]
  onAdd: (slug: string, name: string) => void
  onRemove: (slug: string) => void
}

export default function CompareDevicePicker({ selectedSlugs, deviceNames, onAdd, onRemove }: CompareDevicePickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ slug: string; name: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=device`)
        const data = await res.json()
        const devices = (data.results ?? []).slice(0, 8).map((r: { id: string; title: string }) => ({
          slug: r.id.replace(/^devices\//, ''),
          name: r.title,
        }))
        setResults(devices)
      } catch {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAdd = (slug: string, name: string) => {
    onAdd(slug, name)
    setQuery('')
    setResults([])
    setShowDropdown(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {selectedSlugs.map((slug) => (
          <span
            key={slug}
            className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium"
          >
            {deviceNames[selectedSlugs.indexOf(slug)]}
            <button
              onClick={() => onRemove(slug)}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${slug}`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
        ))}

        {selectedSlugs.length < 3 && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Add device..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="h-8 w-48 rounded-full border border-border bg-muted/50 px-3 text-sm outline-none focus:border-brand-primary"
            />
            <Search className="absolute right-2.5 top-1.5 h-4 w-4 text-muted-foreground" />
            {showDropdown && query.trim().length >= 2 && results.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover shadow-lg"
              >
                {results
                  .filter((r) => !selectedSlugs.includes(r.slug))
                  .slice(0, 5)
                  .map((r) => (
                    <button
                      key={r.slug}
                      onClick={() => handleAdd(r.slug, r.name)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="truncate">{r.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
