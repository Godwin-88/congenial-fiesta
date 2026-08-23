'use client'

import { useRef, useState } from 'react'
import { uploadImageFile } from '@/lib/client-upload'

type UploadedImage = { url: string }

export default function ArticleImagesPanel({
  onInsert,
  onSetFeatured,
}: {
  onInsert: (url: string) => void
  onSetFeatured: (url: string) => void
}) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setError(null)
    try {
      for (const file of files) {
        const url = await uploadImageFile(file)
        setImages(prev => [...prev, { url }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-3">
      <label className="block text-xs text-muted-foreground uppercase tracking-wider">
        Images
      </label>
      <p className="text-xs text-muted-foreground/60">
        Upload as many images as you like, then insert them between paragraphs.
        Click into the editor where you want an image, then press Insert.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full py-2 px-3 rounded-lg border border-dashed border-border
                   text-sm text-muted-foreground hover:text-foreground
                   hover:border-brand-primary transition-colors disabled:opacity-40"
      >
        {uploading ? 'Uploading…' : '⬆ Upload images'}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative group rounded overflow-hidden border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-20 object-cover" />
              <div
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                           transition-opacity flex flex-col items-center justify-center gap-1 p-1"
              >
                <button
                  type="button"
                  onClick={() => onInsert(img.url)}
                  className="text-xs bg-brand-primary text-white px-2 py-1 rounded hover:bg-brand-primary/80"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => onSetFeatured(img.url)}
                  className="text-xs bg-muted text-foreground px-2 py-1 rounded hover:bg-muted/80"
                >
                  Featured
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
