'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UnsavedChangesOptions {
  message?: string
}

export function useUnsavedChanges(options: UnsavedChangesOptions = {}) {
  const { message = 'You have unsaved changes. If you leave, your changes will be lost.' } = options
  const [isDirty, setIsDirty] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const pendingNavigation = useRef<string | null>(null)
  const router = useRouter()

  // Browser tab close / refresh warning
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, message])

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty)
  }, [])

  const resetDirty = useCallback(() => {
    setIsDirty(false)
    setShowModal(false)
    pendingNavigation.current = null
  }, [])

  const confirmNavigation = useCallback((url: string) => {
    if (isDirty) {
      pendingNavigation.current = url
      setShowModal(true)
      return false
    }
    return true
  }, [isDirty])

  const handleSave = useCallback(() => {
    // The form's save handler should call resetDirty() after successful save
    // This just closes the modal and lets the form handle saving
    setShowModal(false)
  }, [])

  const handleDiscard = useCallback(() => {
    setIsDirty(false)
    setShowModal(false)
    if (pendingNavigation.current) {
      const url = pendingNavigation.current
      pendingNavigation.current = null
      router.push(url)
    }
  }, [router])

  const handleCancel = useCallback(() => {
    setShowModal(false)
    pendingNavigation.current = null
  }, [])

  return {
    isDirty,
    setDirty,
    resetDirty,
    showModal,
    confirmNavigation,
    handleSave,
    handleDiscard,
    handleCancel,
  }
}