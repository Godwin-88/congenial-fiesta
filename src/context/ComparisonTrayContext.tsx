'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

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
})

export function ComparisonTrayProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<TrayDevice[]>(loadTrayFromStorage)

  useEffect(() => {
    try {
      sessionStorage.setItem(TRAY_KEY, JSON.stringify(devices))
    } catch {
      // ignore storage errors
    }
  }, [devices])

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

  const isInTray = useCallback((slug: string) => {
    return devices.some((d) => d.slug === slug)
  }, [devices])

  return (
    <ComparisonTrayContext.Provider value={{ devices, addDevice, removeDevice, clearTray, isInTray }}>
      {children}
    </ComparisonTrayContext.Provider>
  )
}

export function useComparisonTray() {
  return useContext(ComparisonTrayContext)
}
