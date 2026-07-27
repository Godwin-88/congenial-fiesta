import Script from "next/script"

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface JsonLdProps {
  data: Record<string, JsonValue> | Record<string, JsonValue>[]
}

export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data, (_, value) => {
    if (value === undefined) return null
    return value
  })

  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}