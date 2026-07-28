'use client'

import { useMemo } from 'react'

type ArticleBodyProps = {
  body: Record<string, unknown> | null
  bodyHtml?: string | null
}

// HTML entity map - built safely to avoid formatter issues
const ENTITY_AMP = '&' + 'amp;'
const ENTITY_LT = '&' + 'lt;'
const ENTITY_GT = '&' + 'gt;'
const ENTITY_QUOT = '&' + 'quot;'
const ENTITY_APOS = '&#' + '039;'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, ENTITY_AMP)
    .replace(/</g, ENTITY_LT)
    .replace(/>/g, ENTITY_GT)
    .replace(/"/g, ENTITY_QUOT)
    .replace(/'/g, ENTITY_APOS)
}

// Render Tiptap JSON (prosemirror) to HTML
function renderTiptapNode(node: Record<string, unknown>): string {
  const { type, attrs, content, text, marks } = node as {
    type?: string
    attrs?: Record<string, unknown>
    content?: Record<string, unknown>[]
    text?: string
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  }

  if (text !== undefined) {
    let result = escapeHtml(String(text))
    if (marks) {
      for (const mark of marks) {
        switch (mark.type) {
          case 'bold':
            result = '<strong>' + result + '</strong>'
            break
          case 'italic':
            result = '<em>' + result + '</em>'
            break
          case 'link':
            result = '<a href="' + escapeHtml(String(mark.attrs?.href ?? '#')) + '" target="_blank" rel="noopener noreferrer">' + result + '</a>'
            break
          case 'code':
            result = '<code>' + result + '</code>'
            break
          case 'strike':
            result = '<s>' + result + '</s>'
            break
        }
      }
    }
    return result
  }

  if (!type) return ''

  const children = content?.map(renderTiptapNode).join('') ?? ''

  switch (type) {
    case 'doc':
      return children
    case 'paragraph':
      return '<p>' + children + '</p>'
    case 'heading': {
      const level = (attrs?.level as number) ?? 2
      return '<h' + level + '>' + children + '</h' + level + '>'
    }
    case 'bulletList':
      return '<ul>' + children + '</ul>'
    case 'orderedList':
      return '<ol>' + children + '</ol>'
    case 'listItem':
      return '<li>' + children + '</li>'
    case 'blockquote':
      return '<blockquote>' + children + '</blockquote>'
    case 'codeBlock':
      return '<pre><code>' + children + '</code></pre>'
    case 'horizontalRule':
      return '<hr />'
    case 'hardBreak':
      return '<br />'
    case 'image': {
      const src = escapeHtml(String(attrs?.src ?? ''))
      const alt = escapeHtml(String(attrs?.alt ?? ''))
      return '<img src="' + src + '" alt="' + alt + '" class="rounded-xl" />'
    }
    default:
      return children
  }
}

export function ArticleBody({ body, bodyHtml }: ArticleBodyProps) {
  const renderedHtml = useMemo(() => {
    if (bodyHtml) return bodyHtml
    if (body) return renderTiptapNode(body)
    return ''
  }, [body, bodyHtml])

  if (!renderedHtml) return null

  return (
    <div
      className="prose prose-lg max-w-none dark:prose-invert
        prose-h2:font-heading prose-h2:text-brand-primary
        prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-brand-primary
        prose-img:rounded-xl"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  )
}