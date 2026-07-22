export type NavCardType = 'device' | 'article' | 'video' | 'page'

export type NavigationCard = {
  type: NavCardType
  title: string
  subtitle: string
  url: string
  score?: number
  imageUrl?: string
}

export type ChatMessageWithCards = {
  id: string
  role: 'user' | 'assistant'
  content: string
  navigationCards?: NavigationCard[]
  timestamp: number
  isLoading?: boolean
}

export type RateLimitInfo = {
  remaining: number
  isGuest: boolean
  rateLimited?: boolean
  error?: string
}