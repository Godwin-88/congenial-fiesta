import { RichText } from '@payloadcms/richtext-lexical/react'

type ArticleBodyProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export function ArticleBody({ body }: ArticleBodyProps) {
  if (!body) return null

  return (
    <div className="prose prose-lg max-w-none dark:prose-invert
      prose-h2:font-heading prose-h2:text-brand-primary
      prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline
      prose-blockquote:border-brand-primary
      prose-img:rounded-xl
    ">
      <RichText data={body} />
    </div>
  )
}