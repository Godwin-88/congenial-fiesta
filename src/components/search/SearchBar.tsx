'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search } from 'lucide-react'

type SearchResult = {
  id: string
  type: 'device' | 'article' | 'video'
  title: string
  description: string
  url: string
  imageUrl: string
  brand?: string
  category?: string
  score?: number
}

type SearchBarProps = {
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export default function SearchBar({ placeholder = 'Search devices, reviews, comparisons...', autoFocus = false, className = '' }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const groupedResults = {
    devices: results.filter((r) => r.type === 'device'),
    articles: results.filter((r) => r.type === 'article'),
    videos: results.filter((r) => r.type === 'video'),
  }

  const totalResults = results.length

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        setIsOpen(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&preview=true`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data.results ?? [])
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && results[selectedIndex]) {
        router.push(results[selectedIndex].url)
        setIsOpen(false)
        setQuery('')
      } else {
        router.push(`/search?q=${encodeURIComponent(query)}`)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          autoFocus={autoFocus}
          className="h-11 w-full rounded-full border border-border/50 bg-background pl-10 pr-4 text-sm shadow-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-brand-primary" />
          </div>
        )}
      </div>

      {isOpen && totalResults > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          {Object.entries(groupedResults).map(([type, items]) => {
            if (items.length === 0) return null
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
            return (
              <div key={type}>
                <div className="px-3 py-2 text-xs font-semibold text-foreground/50 uppercase tracking-wider bg-muted/30">
                  {typeLabel}
                </div>
                {items.map((item, i) => {
                  const globalIndex = results.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      id={`result-${globalIndex}`}
                      role="option"
                      aria-selected={globalIndex === selectedIndex}
                      onClick={() => {
                        router.push(item.url)
                        setIsOpen(false)
                        setQuery('')
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        globalIndex === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="relative h-10 w-16 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                        {item.imageUrl && (
                          <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="64px" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                        <div className="text-xs text-foreground/50 truncate">
                          {item.brand && `${item.brand} · `}
                          {item.category?.replace('-', ' ')}
                          {item.score !== undefined && ` · ${item.score}/100`}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
          <button
            onClick={() => {
              router.push(`/search?q=${encodeURIComponent(query)}`)
              setIsOpen(false)
              setQuery('')
            }}
            className="flex w-full items-center justify-center px-3 py-2.5 text-sm font-medium text-brand-primary border-t border-border hover:bg-muted/30 transition-colors"
          >
            See all results for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  )
}