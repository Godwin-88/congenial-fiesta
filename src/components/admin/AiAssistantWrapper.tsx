'use client'

import dynamic from 'next/dynamic'

const AiAssistant = dynamic(() => import('@/components/admin/AiAssistant'), { ssr: false })

export default function AiAssistantWrapper() {
  return <AiAssistant />
}