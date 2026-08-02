'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'

export type TrayDevice = {
  slug: string
  brandSlug: string
  name: string
  imageUrl: string
  score: number
}

interface ComparisonTrayContextType {
  devices: TrayDevice[]
  addDevice: (device: TrayDevice) => void
  removeDevice: (slug: string) => void
  clearTray: () => void
  isInTray: (slug: string) => boolean
  savedComparisons: SavedComparison[]
  fetchSavedComparisons: () => Promise<void>
  deleteSavedComparison: (id: number) => Promise<void>
}

export interface SavedComparison {
  id: number
  name: string
  device_slugs: string[]
  devices: Array<{
    slug: string
    name: string
    score: number | null
    imageUrl: string | null
  }>
  created_at: string
  updated_at: string
}

const TRAY_KEY = 'fweezytech:compare-tray'

function loadTrayFromStorage(): TrayDevice[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(TRAY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TrayDevice[]
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch {
    // ignore parse errors
  }
  return []
}

const ComparisonTrayContext = createContext<ComparisonTrayContextType>({
  devices: [],
  addDevice: () => {},
  removeDevice: () => {},
  clearTray: () => {},
  isInTray: () => false,
  savedComparisons: [],
  fetchSavedComparisons: async () => {},
  deleteSavedComparison: async () => {},
})

export function ComparisonTrayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [devices, setDevices] = useState<TrayDevice[]>(loadTrayFromStorage)
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([])
  const loadedFromServer = useRef(false)

  // On mount, if user is logged in, load their last comparison from Supabase
  useEffect(() => {
    if (!user || loadedFromServer.current) return
    loadedFromServer.current = true

    async function loadServerTray() {
      try {
        const res = await fetch('/api/user/saved-comparisons')
        if (res.ok) {
          const data = await res.json()
          const comps = (data.comparisons ?? []) as SavedComparison[]
          setSavedComparisons(comps)

          // If there's a most recent comparison and tray is empty, restore it
          if (comps.length > 0 && devices.length === 0) {
            const latest = comps[0]
            // Fetch device details for the slugs
            const devicePromises = latest.device_slugs.map(async (slug: string) => {
              const d = latest.devices.find((dd) => dd.slug === slug)
              if (d) {
                return {
                  slug: d.slug,
                  brandSlug: '',
                  name: d.name,
                  imageUrl: d.imageUrl ?? '',
                  score: d.score ?? 0,
                } as TrayDevice
              }
              return null
            })
            const trayDevices = (await Promise.all(devicePromises)).filter(
              (d): d is TrayDevice => d !== null,
            )
            if (trayDevices.length >= 2) {
              setDevices(trayDevices)
            }
          }
        }
      } catch {
        // ignore
      }
    }
    loadServerTray()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Persist to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(TRAY_KEY, JSON.stringify(devices))
    } catch {
      // ignore storage errors
    }

    // If user is logged in, sync the tray to a saved comparison
    if (user && devices.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          await fetch('/api/community/comparisons/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Comparison: ${devices.map((d) => d.name).slice(0, 2).join(' vs ')}`,
              deviceSlugs: devices.map((d) => d.slug),
            }),
          })
        } catch {
          // ignore
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [devices, user])

  const addDevice = useCallback((device: TrayDevice) => {
    setDevices((prev) => {
      if (prev.some((d) => d.slug === device.slug) || prev.length >= 3) return prev
      return [...prev, device]
    })
  }, [])

  const removeDevice = useCallback((slug: string) => {
    setDevices((prev) => prev.filter((d) => d.slug !== slug))
  }, [])

  const clearTray = useCallback(() => {
    setDevices([])
  }, [])

  const isInTray = useCallback(
    (slug: string) => devices.some((d) => d.slug === slug),
    [devices],
  )

  const fetchSavedComparisons = useCallback(async () => {
    try {
      const res = await fetch('/api/user/saved-comparisons')
      if (res.ok) {
        const data = await res.json()
        setSavedComparisons(data.comparisons ?? [])
      }
    } catch {
      // ignore
    }
  }, [])

  const deleteSavedComparison = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/community/comparisons/save?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSavedComparisons((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      // ignore
    }
  }, [])

  return (
    <ComparisonTrayContext.Provider
      value={{
        devices,
        addDevice,
        removeDevice,
        clearTray,
        isInTray,
        savedComparisons,
        fetchSavedComparisons,
        deleteSavedComparison,
      }}
    >
      {children}
    </ComparisonTrayContext.Provider>
  )
}

export function useComparisonTray() {
  return useContext(ComparisonTrayContext)
}
