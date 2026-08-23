// Client-side helper to upload an image to the Supabase Storage bucket via /api/upload
export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  if (!res.ok || !data.url) {
    throw new Error(data?.error || 'Upload failed')
  }
  return data.url as string
}
