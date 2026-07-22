'use client'

import dynamic from 'next/dynamic'

const ChatBubble = dynamic(() => import('./ChatBubble'), {
  ssr: false,
  loading: () => null,
})

export default function ChatBubbleWrapper() {
  return <ChatBubble />
}