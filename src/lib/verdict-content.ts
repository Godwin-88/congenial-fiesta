/**
 * Converts a stored `verdict_full` value (TEXT column) into the `content`
 * shape accepted by `TiptapEditor`.
 *
 * The column has historically held several different formats:
 *  - Tiptap JSON        e.g. {"type":"doc","content":[...]}
 *  - Lexical JSON       legacy seed output, {"root":{"children":[...]}}
 *                       (see src/lib/db/seed/ingest_samsung_csv.ts)
 *  - HTML / plain text  written by early admin editor saves
 *  - "[object Object]"  garbage produced by sending a JS object to a TEXT column
 *
 * This helper never throws — unparseable values degrade to `null` (empty
 * editor) or are passed through as an HTML/plain-text string for Tiptap to
 * render literally. It also re-hydrates valid Tiptap JSON so it can be edited.
 */

export type EditorContent = string | Record<string, unknown> | null

function isTiptapDoc(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'doc'
  )
}

function extractText(node: unknown): string {
  if (typeof node === 'string') return node
  if (!node || typeof node !== 'object') return ''
  const obj = node as Record<string, unknown>
  if (typeof obj.text === 'string') return obj.text
  if (Array.isArray(obj.children)) {
    return obj.children.map(extractText).join('')
  }
  // Lexical documents wrap the tree under a top-level "root" node
  if (obj.root && typeof obj.root === 'object') {
    return extractText(obj.root)
  }
  return ''
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function verdictContent(raw: string | null | undefined): EditorContent {
  if (!raw) return null

  const value = raw.trim()

  // Garbage produced by writing a JS object straight to a TEXT column
  if (/^\[object /.test(value)) return null

  // Attempt to parse JSON formats (Tiptap and legacy Lexical)
  if (value.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(value)
      // Valid Tiptap document → hand straight to the editor
      if (isTiptapDoc(parsed)) return parsed
      // Legacy Lexical document from the seed scripts → surface its text
      const text = extractText(parsed)
      if (text.trim()) return `<p>${escapeHtml(text)}</p>`
      return null
    } catch {
      // Not JSON — fall through and treat as HTML / plain text
    }
  }

  // HTML (or plain text) — the editor accepts raw markup
  return raw
}