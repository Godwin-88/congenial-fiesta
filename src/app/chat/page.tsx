import type { Metadata } from 'next'
import ChatPageClient from './ChatPageClient'

export const metadata: Metadata = {
  title: 'Ask Fweezy Assistant',
  description: 'Chat with Fweezy Assistant — get device recommendations, compare phones, and find tech reviews. Powered by AI, built on FweezyTech.',
  robots: 'noindex',
}

export default function ChatPage() {
  return <ChatPageClient />
}