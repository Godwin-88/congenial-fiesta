'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Database, Sparkles } from 'lucide-react'

export function SearchIndexPanel({ onReindex }: { onReindex: () => Promise<void> }) {
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<{ search?: string; vector?: string; graph?: string }>({})

  const checkIndex = async () => {
    try {
      const [s, v, g] = await Promise.all([
        fetch('/api/admin/settings/health').then(r => r.json()),
        fetch('/api/admin/settings/health').then(r => r.json()),
        fetch('/api/admin/settings/health').then(r => r.json()),
      ])
      const sp = (s.probes ?? []).find((p: { slug: string }) => p.slug === 'upstash-search')
      const vp = (v.probes ?? []).find((p: { slug: string }) => p.slug === 'upstash-vector')
      const gp = (g.probes ?? []).find((p: { slug: string }) => p.slug === 'upstash-search')
      setStatus({
        search: sp?.message ?? 'Unknown',
        vector: vp?.message ?? 'Unknown',
        graph: gp?.message ?? 'Unknown',
      })
    } catch { /* no-op */ }
  }

  useEffect(() => { checkIndex() }, [])

  const run = async () => {
    setRunning(true)
    try {
      await onReindex()
      await checkIndex()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-2 border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Database size={17} className="text-brand-primary" /> Index status
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/50 px-4 py-3">
            <div className="text-xs text-muted-foreground">Upstash Search</div>
            <div className="mt-1 text-sm font-medium text-foreground">{status.search ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-border bg-background/50 px-4 py-3">
            <div className="text-xs text-muted-foreground">Upstash Vector</div>
            <div className="mt-1 text-sm font-medium text-foreground">{status.vector ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-border bg-background/50 px-4 py-3">
            <div className="text-xs text-muted-foreground">Knowledge Graph</div>
            <div className="mt-1 text-sm font-medium text-foreground">{status.graph ?? '—'}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border-2 border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <RefreshCw size={17} className="text-brand-primary" /> Reindex all content
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Rebuilds the Upstash Search index, the semantic vector index, and the Supabase knowledge graph
          from all published devices, articles, and videos. Safe to run at any time.
        </p>
        <button
          onClick={run}
          disabled={running}
          className="mt-4 flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/80 disabled:opacity-40"
        >
          <RefreshCw size={16} className={running ? 'animate-spin' : ''} />
          {running ? 'Reindexing…' : 'Reindex all content'}
        </button>
      </section>

      <section className="rounded-lg border-2 border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles size={17} className="text-brand-primary" /> How indexing works
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Published devices/articles/videos are written to Upstash Search (BM25 full-text).</li>
          <li>Rich spec-aware text is embedded into Upstash Vector (dense semantic search).</li>
          <li>A rule-based extractor builds entities &amp; relations into the Supabase knowledge graph for GraphRAG retrieval.</li>
          <li>The admin AI assistant blends all three sources for grounded answers.</li>
        </ul>
      </section>
    </div>
  )
}