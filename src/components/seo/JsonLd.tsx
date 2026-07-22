type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface JsonLdProps {
  data: Record<string, JsonValue> | Record<string, JsonValue>[]
}

export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data, (_, value) => {
    // Remove undefined values to keep JSON-LD clean
    if (value === undefined) return null
    return value
  })

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}