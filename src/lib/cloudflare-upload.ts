import { createClient } from '@supabase/supabase-js'

function getCloudflareConfig() {
  return {
    accountId: process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_IMAGES_API_TOKEN,
  }
}

export async function uploadToCloudflare(file: File, name?: string): Promise<string> {
  const { accountId, apiToken } = getCloudflareConfig()

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Images is not configured')
  }

  const formData = new FormData()
  formData.append('file', file)
  if (name) {
    formData.append('metadata', JSON.stringify({ name }))
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Cloudflare upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  const imageId = result.result?.id

  if (!imageId) {
    throw new Error('Cloudflare did not return an image ID')
  }

  return `https://imagedelivery.net/${accountId}/${imageId}/public`
}

export async function deleteFromCloudflare(imageId: string): Promise<void> {
  const { accountId, apiToken } = getCloudflareConfig()

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Images is not configured')
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Cloudflare delete failed: ${response.status} ${errorText}`)
  }
}

export async function listCloudflareImages(): Promise<
  Array<{ id: string; filename: string; uploaded: string; url: string }>
> {
  const { accountId, apiToken } = getCloudflareConfig()

  if (!accountId || !apiToken) {
    return []
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    return []
  }

  const result = await response.json()
  const images = result.result?.images ?? []

  return images.map((img: {
    id: string
    filename: string
    uploaded: string
  }) => ({
    id: img.id,
    filename: img.filename,
    uploaded: img.uploaded,
    url: `https://imagedelivery.net/${accountId}/${img.id}/public`,
  }))
}

export function extractImageIdFromUrl(url: string): string | null {
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/)
  return match ? match[1] : null
}
