type ArticleBodyProps = {
  body: Record<string, unknown> | null
  bodyHtml?: string | null
}

export function ArticleBody({ body, bodyHtml }: ArticleBodyProps) {
  if (bodyHtml) {
    return (
      <div
        className="prose prose-lg max-w-none dark:prose-invert
          prose-h2:font-heading prose-h2:text-brand-primary
          prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-brand-primary
          prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    )
  }

  if (body) {
    return (
      <div className="prose prose-lg max-w-none dark:prose-invert
        prose-h2:font-heading prose-h2:text-brand-primary
        prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-brand-primary
        prose-img:rounded-xl"
      >
        <pre className="text-sm text-muted-foreground overflow-auto">
          {JSON.stringify(body, null, 2)}
        </pre>
      </div>
    )
  }

  return null
}