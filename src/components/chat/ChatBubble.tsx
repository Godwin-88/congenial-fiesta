'use client'

import { useEffect } from 'react'
import { useChat2 } from '@/context/ChatContext'
import ChatWindow from './ChatWindow'

export default function ChatBubble() {
  const { isOpen, setIsOpen, messages } = useChat2()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, setIsOpen])

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-40 sm:bottom-24 sm:right-6 max-sm:inset-0 max-sm:z-50"
        >
          <div
            className="bg-card border border-border shadow-2xl overflow-hidden border-t-4 border-t-brand-primary max-sm:rounded-none max-sm:border-t-0 max-sm:h-full max-sm:w-full max-sm:fixed max-sm:inset-0 max-sm:z-50 rounded-2xl"
            style={{
              width: '380px',
              height: '480px',
            }}
          >
            <div className="h-full flex flex-col">
              <ChatWindow variant="bubble" />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand-primary text-white shadow-lg hover:bg-brand-primary/90 transition-all duration-200 flex items-center justify-center"
        aria-label={isOpen ? 'Close Fweezy AI chat' : 'Open Fweezy AI chat'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {!isOpen && messages.length > 0 && (
        <span className="fixed bottom-[4.5rem] right-4 z-40 w-3 h-3 rounded-full bg-amber-500 border-2 border-background" />
      )}
    </>
  )
}