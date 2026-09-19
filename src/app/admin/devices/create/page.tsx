'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronUp, Eye, Loader2, Save, Upload } from 'lucide-react'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'
import BrandSelect from '@/components/admin/BrandSelect'
import { CameraSpecSection } from '@/components/admin/CameraSpecSection'
import { CameraSpec, emptyCamera, cameraHasContent, cameraSpecToCanonical } from '@/lib/camera-spec'
import { MAJOR_CATEGORIES, type MajorCategory, type DeviceType } from '@/types/cms'
import { verdictContent } from '@/lib/verdict-content'
import { applyDevicePrefill } from '@/lib/chat/prefill-apply'
import SpecImportPanel from '@/components/admin/SpecImportPanel'
import { specsToDevicePrefill } from '@/lib/devices/form-mapping'
import type { DeviceSpecs } from '@/lib/devices/spec-schema'
import type { ImportPreview, SpecSnapshot } from '@/lib/devices/import-agent'
import type { DevicePrefill } from '@/lib/chat/prefill-schemas'

const TiptapEditor = dynamic(
  () => import('@/components/admin/TiptapEditor'),
  { ssr: false, loading: () => (
    <div className="h-[300px] bg-foreground/10 rounded-lg animate-pulse" />
  )}
)

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const PRICE_TIERS = [
  { value: '', label: 'Select price tier…' },
  { value: 'flagship', label: 'Flagship' },
  { value: 'mid-range', label: 'Mid-range' },
  { value: 'budget', label: 'Budget' },
  { value: 'ultra-premium', label: 'Ultra-premium' },
]

// Which spec sections to show per major category (identity-only save means
// these are all optional). Empty major = show everything.
const SPEC_SECTIONS_BY_MAJOR: Record<string, string[]> = {
  phones: ['design', 'display', 'processor', 'memory', 'camera', 'battery', 'connectivity', 'network', 'software'],
  televisions: ['design', 'display', 'processor', 'memory', 'connectivity', 'software'],
  sound: ['design', 'battery', 'connectivity', 'software'],
  macs: ['design', 'display', 'processor', 'memory', 'battery', 'connectivity', 'software'],
}

const RETAILERS = [
  { value: '', label: 'Select retailer…' },
  { value: 'jiji', label: 'Jiji' },
  { value: 'jumia', label: 'Jumia' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'official', label: 'Official Store' },
]

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  /** Optional anchor so callers can scroll straight to this section. */
  id?: string
  /** Controlled mode — pass both `open` and `onOpenChange` to drive from outside. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  id,
  open: controlledOpen,
  onOpenChange,
}: CollapsibleSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next)
    if (controlledOpen === undefined) setUncontrolledOpen(next)
  }
  return (
    <div id={id} className="bg-card rounded-lg border-2 border-border mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export default function CreateDevicePage() {
  const router = useRouter()
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [saving, setSaving] = useState(false)
  const [deviceId, setDeviceId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [brands, setBrands] = useState<Array<{ id: number; name: string; slug: string }>>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  // YouTube import handoff (see the `yt` effect below): true while the payload
  // from the "Import from YouTube" modal is decoded and staged into this form.
  const [ytLoading, setYtLoading] = useState(false)
  const ytAppliedRef = useRef(false)
  // The YouTube candidate rebuilt as a SpecSnapshot so the Import
  // Specifications panel can merge it with the adapter sources (true
  // multi-source merger: YouTube supplies the name + what the video stated,
  // authoritative sources win factual conflicts).
  const [ytSnapshot, setYtSnapshot] = useState<SpecSnapshot | null>(null)
  // Import Specifications panel is collapsible; the quick-start chip opens it.
  const [importPanelOpen, setImportPanelOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  // Identity
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [brandId, setBrandId] = useState<number | null>(null)
  const [releaseYear, setReleaseYear] = useState('')
  const [priceKes, setPriceKes] = useState('')
  const [priceUsd, setPriceUsd] = useState('')
  const [tagline, setTagline] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [availability, setAvailability] = useState<'in-stock' | 'coming-soon' | 'out-of-stock' | ''>('')

  // Taxonomy (replaces the old single price-tier "category")
  const [priceTier, setPriceTier] = useState('')
  const [majorCategory, setMajorCategory] = useState<MajorCategory | ''>('')
  const [deviceTypeId, setDeviceTypeId] = useState<number | null>(null)
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])

  // Images
  const [images, setImages] = useState<Array<{ url: string; alt: string; isPrimary: boolean }>>([])

  // Scores
  const [scoreDisplay, setScoreDisplay] = useState('')
  const [scorePerformance, setScorePerformance] = useState('')
  const [scoreCamera, setScoreCamera] = useState('')
  const [scoreBattery, setScoreBattery] = useState('')
  const [scoreValue, setScoreValue] = useState('')

  // Verdict
  const [verdictPros, setVerdictPros] = useState<string[]>([])
  const [verdictCons, setVerdictCons] = useState<string[]>([])
  const [verdictBottomLine, setVerdictBottomLine] = useState('')
  const [verdictFull, setVerdictFull] = useState('')

  // Specs
  const [specsDesign, setSpecsDesign] = useState<Record<string, string>>({})
  const [specsDisplay, setSpecsDisplay] = useState<Record<string, string>>({})
  const [specsProcessor, setSpecsProcessor] = useState<Record<string, string>>({})
  const [specsMemory, setSpecsMemory] = useState<Record<string, string>>({})
  const [specsCamera, setSpecsCamera] = useState<CameraSpec>(emptyCamera())
  const [specsBattery, setSpecsBattery] = useState<Record<string, string>>({})
  const [specsConnectivity, setSpecsConnectivity] = useState<Record<string, string>>({})
  const [specsSoftware, setSpecsSoftware] = useState<Record<string, string>>({})
  const [specsNetwork, setSpecsNetwork] = useState<Record<string, string>>({})

  // Phone Database §13/§20 — variant + provenance identity fields.
  const [modelNumber, setModelNumber] = useState('')
  const [variantLabel, setVariantLabel] = useState('')
  const [region, setRegion] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [parentDeviceId, setParentDeviceId] = useState<number | null>(null)
  const [verifiedDate, setVerifiedDate] = useState('')

  // Buy links
  const [buyLinks, setBuyLinks] = useState<Array<{ retailer: string; url: string; price: string; priceDate: string }>>([])

  // Related content
  const [relatedVideoId, setRelatedVideoId] = useState('')
  const [relatedTiktokUrl, setRelatedTiktokUrl] = useState('')

  // SEO
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')

  // Track dirty state when any form field changes
  useEffect(() => {
    if (name || slug || tagline || priceKes || priceUsd || releaseYear || priceTier || majorCategory || deviceTypeId || status ||
        scoreDisplay || scorePerformance || scoreCamera || scoreBattery || scoreValue ||
        verdictBottomLine || verdictFull ||
        relatedVideoId || relatedTiktokUrl || seoTitle || seoDescription ||
        images.length > 0 || verdictPros.length > 0 || verdictCons.length > 0 || buyLinks.length > 0 ||
        Object.keys(specsDesign).length > 0 || Object.keys(specsDisplay).length > 0 ||
        Object.keys(specsProcessor).length > 0 || Object.keys(specsMemory).length > 0 ||
        cameraHasContent(specsCamera) || Object.keys(specsBattery).length > 0 ||
        Object.keys(specsConnectivity).length > 0 || Object.keys(specsSoftware).length > 0 ||
        Object.keys(specsNetwork).length > 0 ||
        modelNumber || variantLabel || region || importStatus || parentDeviceId != null || verifiedDate) {
      setDirty(true)
    }
  }, [name, slug, tagline, priceKes, priceUsd, releaseYear, priceTier, majorCategory, deviceTypeId, status,
      scoreDisplay, scorePerformance, scoreCamera, scoreBattery, scoreValue,
      verdictBottomLine, verdictFull,
      relatedVideoId, relatedTiktokUrl, seoTitle, seoDescription,
      images, verdictPros, verdictCons, buyLinks,
      specsDesign, specsDisplay, specsProcessor, specsMemory,
      specsCamera, specsBattery, specsConnectivity, specsSoftware, specsNetwork,
      modelNumber, variantLabel, region, importStatus, parentDeviceId, verifiedDate])

  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(slugify(name))
    }
  }, [name, slugManuallyEdited])

  // Agentic prefill: the AI assistant dispatches `fweezy:prefill-apply` to
  // populate this create form. The Phone Database import panel dispatches the
  // SAME event, so both paths share one code path with zero duplication.
  // Nothing is saved in either case — the admin reviews + saves.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ collection?: string; payload?: Record<string, unknown>; message?: string }>).detail
      if (!detail || detail.collection !== 'devices' || !detail.payload) return
      const fields = detail.payload as DevicePrefill

      applyDevicePrefill(fields, {
        setName,
        setSlug,
        setBrandId,
        setReleaseYear,
        setPriceKes,
        setPriceUsd,
        setPriceTier,
        setMajorCategory: (v: string) => setMajorCategory(v as MajorCategory | ''),
        setTagline,
        setScoreDisplay,
        setScorePerformance,
        setScoreCamera,
        setScoreBattery,
        setScoreValue,
        setVerdictPros,
        setVerdictCons,
        setVerdictBottomLine,
        setVerdictFull,
        setSpecsDesign,
        setSpecsDisplay,
        setSpecsProcessor,
        setSpecsMemory,
        setSpecsCamera,
        setSpecsBattery,
        setSpecsConnectivity,
        setSpecsSoftware,
        setSpecsNetwork,
        setBuyLinks,
        setRelatedVideoId,
        setSeoTitle,
        setSeoDescription,
        // Phone Database §13/§20 — variant + provenance identity fields.
        setModelNumber,
        setVariantLabel,
        setRegion,
        setParentDeviceId,
        setImportStatus,
        setVerifiedDate,
      })

      // Resolve brand name against the loaded brands list
      if (fields.brandName) {
        const match = brands.find((b) => b.name.toLowerCase() === fields.brandName!.toLowerCase())
        if (match) setBrandId(match.id)
        else setToast({ message: `Brand "${fields.brandName}" not found — please select it manually`, type: 'error' })
      }

      // Slug follows the name unless the admin overrode it
      if (fields.name && !slugManuallyEdited) setSlug(slugify(fields.name))

      setDirty(true)
      setToast({ message: detail.message ?? 'AI prefill applied — review before saving', type: 'success' })
    }
    window.addEventListener('fweezy:prefill-apply', handler)
    return () => window.removeEventListener('fweezy:prefill-apply', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands, slugManuallyEdited, setDirty, setToast])

  // ── YouTube import handoff ──────────────────────────────────────────────────
  // The "Import from YouTube" modal navigates here with `?yt=<payload>`: the
  // device name resolved from the video title, the major category resolved
  // against the live taxonomy, the related video id, and whatever canonical
  // specs the creator wrote into the description. We decode it and dispatch
  // the SAME `fweezy:prefill-apply` event the AI assistant and the Import
  // Specifications panel use, so there is exactly one staging code path.
  // Nothing is saved here — the admin reviews, supplements the missing specs
  // with the agent (the snapshot below is merged into that panel's fetch),
  // then saves.
  //
  // Waits for brands to load because brand resolution needs the loaded list.
  useEffect(() => {
    if (loadingBrands || ytAppliedRef.current) return
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('yt')
    if (!raw) return

    ytAppliedRef.current = true
    setYtLoading(true)

    const cleanupUrl = () => {
      // Drop the param so a refresh does not re-stage the same device.
      const url = new URL(window.location.href)
      url.searchParams.delete('yt')
      window.history.replaceState({}, '', url.pathname + url.search)
    }

    try {
      const base64 = raw.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      const binary = atob(padded)
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
        videoId?: string
        name?: string
        brandName?: string | null
        releaseYear?: number | null
        tagline?: string | null
        priceTier?: string | null
        majorCategory?: string | null
        specs?: Record<string, unknown>
      }

      if (!payload.name) throw new Error('missing device name')

      // Canonical specs from the video description → form prefill (shared mapper).
      const prefill = specsToDevicePrefill({
        identity: {
          name: payload.name,
          brand: payload.brandName ?? null,
          releaseYear: payload.releaseYear ?? null,
          tagline: payload.tagline ?? null,
        },
        specs: payload.specs ?? {},
      })

      window.dispatchEvent(
        new CustomEvent('fweezy:prefill-apply', {
          detail: {
            collection: 'devices',
            payload: prefill,
            message: `Loaded "${payload.name}" from YouTube — supplement any missing specs with the agent, then save.`,
          },
        }),
      )

      if (payload.videoId) setRelatedVideoId(payload.videoId)
      if (payload.priceTier) setPriceTier(payload.priceTier)
      if (payload.majorCategory) setMajorCategory(payload.majorCategory as MajorCategory)

      // Rebuild the YouTube candidate as the SpecSnapshot the import agent
      // merges. Identity carries the name the video resolved; specs carry
      // only what the description stated (validated upstream by the schema
      // gate — unstated fields are simply absent).
      const identityName = payload.name.trim()
      const watchUrl = `https://www.youtube.com/watch?v=${payload.videoId ?? ''}`
      setYtSnapshot({
        match: {
          externalId: payload.videoId ?? identityName,
          name: identityName,
          brand: payload.brandName ?? null,
          releaseYear: payload.releaseYear ?? null,
          modelNumber: null,
          region: null,
          variantLabel: null,
          url: payload.videoId ? watchUrl : null,
          thumbnail: null,
          sourceSlug: 'youtube',
          sourceLabel: 'YouTube review',
        },
        identity: {
          name: identityName,
          brand: payload.brandName ?? null,
          modelNumber: null,
          releaseYear: payload.releaseYear ?? null,
          variantLabel: null,
          region: null,
          tagline: payload.tagline ?? null,
        },
        specs: (payload.specs ?? {}) as Partial<DeviceSpecs>,
        raw: { videoId: payload.videoId ?? null, from: 'youtube-handoff' },
        sourceUrl: payload.videoId ? watchUrl : null,
        providedPaths: Object.entries(payload.specs ?? {}).flatMap(([section, values]) =>
          values && typeof values === 'object'
            ? Object.keys(values as Record<string, unknown>)
                .filter((k) => (values as Record<string, unknown>)[k] != null)
                .map((k) => `${section}.${k}`)
            : [],
        ),
      })
      setDirty(true)
    } catch {
      setToast({ message: 'Could not read the YouTube import payload.', type: 'error' })
    } finally {
      setYtLoading(false)
      cleanupUrl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingBrands])

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch('/api/admin/brands')
        if (res.ok) {
          const data = await res.json()
          setBrands(data.data ?? [])
        }
      } catch (e) {
        console.error('Failed to fetch brands:', e)
      } finally {
        setLoadingBrands(false)
      }
    }
    async function loadDeviceTypes() {
      try {
        const res = await fetch('/api/admin/device-types')
        if (res.ok) {
          const data = await res.json()
          setDeviceTypes(data.data ?? [])
        }
      } catch (e) {
        console.error('Failed to fetch device types:', e)
      }
    }
    loadBrands()
    loadDeviceTypes()
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const overallScore = useMemo(() => {
    const d = parseFloat(scoreDisplay) || 0
    const p = parseFloat(scorePerformance) || 0
    const c = parseFloat(scoreCamera) || 0
    const b = parseFloat(scoreBattery) || 0
    const v = parseFloat(scoreValue) || 0
    const overall = (d * 0.20 + p * 0.25 + c * 0.25 + b * 0.15 + v * 0.15) * 10
    return Math.round(overall * 10) / 10
  }, [scoreDisplay, scorePerformance, scoreCamera, scoreBattery, scoreValue])

  const addArrayField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ''])
  }

  const updateArrayField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => i === index ? value : item))
  }

  const removeArrayField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index))
  }

  const triggerImageUpload = (index: number) => {
    setUploadingIndex(index)
    fileInputRef.current?.click()
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploadingIndex === null) return
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'device-images')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed')
        return
      }
      setImages(prev => prev.map((item, idx) => idx === uploadingIndex ? { ...item, url: data.url } : item))
    } catch {
      setUploadError('Upload failed')
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleSave = async (publish: boolean) => {
    if (!name.trim() || !slug.trim()) {
      setToast({ message: 'Name and slug are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        brand_id: brandId,
        release_year: releaseYear ? parseInt(releaseYear) : null,
        price_tier: priceTier || null,
        major_category: majorCategory || null,
        device_type_id: deviceTypeId || null,
        price_kes: priceKes ? parseInt(priceKes) : null,
        price_usd: priceUsd ? parseInt(priceUsd) : null,
        tagline: tagline.trim() || null,
        status: publish ? 'published' : 'draft',
        availability: availability || null,
        images: images.filter(img => img.url.trim()),
        score_display: scoreDisplay ? parseFloat(scoreDisplay) : null,
        score_performance: scorePerformance ? parseFloat(scorePerformance) : null,
        score_camera: scoreCamera ? parseFloat(scoreCamera) : null,
        score_battery: scoreBattery ? parseFloat(scoreBattery) : null,
        score_value: scoreValue ? parseFloat(scoreValue) : null,
        verdict_pros: verdictPros.filter(p => p.trim()),
        verdict_cons: verdictCons.filter(c => c.trim()),
        verdict_bottom_line: verdictBottomLine.trim() || null,
        verdict_full: verdictFull.trim() || null,
        specs_design: specsDesign,
        specs_display: specsDisplay,
        specs_processor: specsProcessor,
        specs_memory: specsMemory,
        // Persist the canonical shape the ranking engine and public UI read
        // (form free-text is parsed into megapixels/aperture/OIS etc.).
        specs_camera: cameraSpecToCanonical(specsCamera),
        specs_battery: specsBattery,
        specs_connectivity: specsConnectivity,
        specs_software: specsSoftware,
        specs_network: specsNetwork,
        buy_links: buyLinks.filter(link => link.url.trim()),
        related_video_id: relatedVideoId.trim() || null,
        related_tiktok_url: relatedTiktokUrl.trim() || null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        // Phone Database §13/§20 — device identity + import provenance.
        model_number: modelNumber.trim() || null,
        variant_label: variantLabel.trim() || null,
        region: region.trim() || null,
        parent_device_id: parentDeviceId || null,
        import_status: importStatus || null,
        verified_at: verifiedDate || null,
      }

      const url = deviceId ? `/api/admin/devices/${deviceId}` : '/api/admin/devices'
      const method = deviceId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setToast({ message: publish ? 'Device published' : 'Draft saved', type: 'success' })
        resetDirty()
        if (!deviceId && data.data?.id) {
          setDeviceId(data.data.id)
          router.push(`/admin/devices/${data.data.id}/edit`)
        }
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Save failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = deviceId ? `/preview?id=${deviceId}` : null

  // Import agent → this form. Reuses the prefill event so the two paths
  // (AI assistant and Phone Database agent) never diverge.
  const handleImportApply = useCallback(
    (prefill: DevicePrefill, _preview: ImportPreview) => {
      window.dispatchEvent(
        new CustomEvent('fweezy:prefill-apply', {
          detail: {
            collection: 'devices',
            payload: prefill,
            message: 'Imported specifications staged — review, then save as draft.',
          },
        }),
      )
    },
    [],
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      <UnsavedChangesModal
        isOpen={showModal}
        onSave={() => {
          handleSave(false)
          handleCancel()
        }}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* YouTube import handoff: shown while the `?yt=` payload is staged. */}
      {ytLoading && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
          <Loader2 size={36} className="animate-spin text-brand-primary" />
          <p className="text-sm font-medium text-white">Loading device from YouTube…</p>
          <p className="text-xs text-muted-foreground">
            Resolving the device name and any specs from the review.
          </p>
        </div>
      )}

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white font-heading mb-6">
            {deviceId ? 'Edit Device' : 'Create Device'}
          </h1>

          {/* Progressive-disclosure hints: start with the name, then let the
              spec agent fill the rest (spec §14 — missing stays null). */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Quick start:</span>
            <button
              type="button"
              onClick={() => {
                document
                  .querySelector<HTMLInputElement>('input[placeholder="Device name"]')
                  ?.focus()
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-gray-300 transition-colors hover:border-brand-primary hover:text-white"
            >
              1. Type the device name
            </button>
            <button
              type="button"
              onClick={() => {
                setImportPanelOpen(true)
                requestAnimationFrame(() => {
                  document.getElementById('import-specs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-gray-300 transition-colors hover:border-brand-primary hover:text-white"
            >
              2. Import specifications
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="rounded-full border border-border px-3 py-1 text-xs text-gray-300 transition-colors hover:border-brand-primary hover:text-white disabled:opacity-40"
            >
              3. Save as draft
            </button>
          </div>

          {/* Import agent (Phone Database §10–§13): search sources, compare,
              resolve conflicts, stage into this form or save a draft device. */}
          <CollapsibleSection
            id="import-specs"
            title="Import Specifications (agent)"
            open={importPanelOpen}
            onOpenChange={setImportPanelOpen}
          >
            {ytLoading ? (
              <p className="mb-1 text-[11px] text-brand-primary">
                Loading device from YouTube — the video resolved the name and any specs the creator stated. The spec panel below merges that device with the agent sources.
              </p>
            ) : null}
            <SpecImportPanel
              existingDeviceId={deviceId}
              defaultQuery={name}
              youtubeSnapshot={ytSnapshot}
              onApplyToForm={handleImportApply}
              onCreated={(id) => {
                setDeviceId(id)
                setToast({ message: `Draft device #${id} created with provenance`, type: 'success' })
              }}
            />
          </CollapsibleSection>

          {/* Identity */}
          <CollapsibleSection title="Identity" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Device name"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Slug *</label>
                <input type="text" value={slug} onChange={e => { setSlugManuallyEdited(true); setSlug(e.target.value) }} placeholder="device-slug"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Brand</label>
                <BrandSelect brands={brands} value={brandId} onChange={setBrandId} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Release Year</label>
                <input type="number" value={releaseYear} onChange={e => setReleaseYear(e.target.value)} placeholder="2025"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Major Category</label>
                <select value={majorCategory} onChange={e => {
                  setMajorCategory(e.target.value as MajorCategory | '')
                  setDeviceTypeId(null)
                }}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                  <option value="">Select major…</option>
                  {MAJOR_CATEGORIES.map(m => <option key={m.slug} value={m.slug}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Device Type</label>
                <select value={deviceTypeId ?? ''} onChange={e => setDeviceTypeId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                  <option value="">Select type…</option>
                  {deviceTypes.filter(t => !majorCategory || t.major_category === majorCategory).map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price Tier</label>
                <select value={priceTier} onChange={e => setPriceTier(e.target.value)}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                  {PRICE_TIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tagline</label>
                <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short tagline"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (KES)</label>
                <input type="number" value={priceKes} onChange={e => setPriceKes(e.target.value)} placeholder="150000"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (USD)</label>
                <input type="number" value={priceUsd} onChange={e => setPriceUsd(e.target.value)} placeholder="1000"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>

              {/* Phone Database §13/§20 — variant + provenance identity fields. */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Model Number</label>
                <input type="text" value={modelNumber} onChange={e => setModelNumber(e.target.value)} placeholder="e.g. SM-S938B/DS"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Variant Label</label>
                <input type="text" value={variantLabel} onChange={e => setVariantLabel(e.target.value)} placeholder="e.g. Global, India, 12/256"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Region</label>
                <input type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. KE, IN, EU, Global"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Import Status</label>
                <select value={importStatus} onChange={e => setImportStatus(e.target.value)}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                  <option value="">Select status…</option>
                  <option value="manual">Manual</option>
                  <option value="imported">Imported</option>
                  <option value="verified">Verified</option>
                  <option value="conflict">Conflict</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Verified Date</label>
                <input type="date" value={verifiedDate} onChange={e => setVerifiedDate(e.target.value)}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
            </div>
          </CollapsibleSection>

          {/* Images */}
          <CollapsibleSection title="Images">
            {images.map((img, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">URL</label>
                  <input type="url" value={img.url} onChange={e => {
                    setImages(prev => prev.map((item, idx) => idx === i ? { ...item, url: e.target.value } : item))
                  }} placeholder="https://…"
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alt text</label>
                  <input type="text" value={img.alt} onChange={e => {
                    setImages(prev => prev.map((item, idx) => idx === i ? { ...item, alt: e.target.value } : item))
                  }} placeholder="Image description"
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                </div>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => triggerImageUpload(i)}
                    disabled={uploadingIndex === i}
                    className="text-xs text-brand-primary hover:text-blue-400 disabled:opacity-50">
                    {uploadingIndex === i ? 'Uploading…' : 'Upload'}
                  </button>
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={img.isPrimary} onChange={e => {
                      setImages(prev => prev.map((item, idx) => idx === i ? { ...item, isPrimary: e.target.checked } : item))
                    }} className="rounded border-border bg-muted" />
                    Primary
                  </label>
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 text-xs hover:text-red-300">Remove</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setImages(prev => [...prev, { url: '', alt: '', isPrimary: false }])}
              className="text-sm text-brand-primary hover:text-blue-400">+ Add Image</button>
            <p className="text-xs text-gray-500 mt-2">Paste an image URL above, or click &ldquo;Upload&rdquo; to upload a file.</p>
            {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden" onChange={handleImageFile} />
          </CollapsibleSection>

          {/* Fweezy Score */}
          <CollapsibleSection title="Fweezy Score" defaultOpen>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: 'Display', value: scoreDisplay, setter: setScoreDisplay },
                { label: 'Performance', value: scorePerformance, setter: setScorePerformance },
                { label: 'Camera', value: scoreCamera, setter: setScoreCamera },
                { label: 'Battery', value: scoreBattery, setter: setScoreBattery },
                { label: 'Value', value: scoreValue, setter: setScoreValue },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-xs text-gray-500 mb-1">{field.label} (0–10)</label>
                  <input type="number" min="0" max="10" step="0.1" value={field.value} onChange={e => field.setter(e.target.value)}
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-500">Overall Score</span>
              <p className={`text-3xl font-bold ${overallScore >= 80 ? 'text-score-high' : overallScore >= 60 ? 'text-score-mid' : 'text-score-low'}`}>
                {overallScore || '—'}
              </p>
            </div>
          </CollapsibleSection>

          {/* Verdict */}
          <CollapsibleSection title="Verdict" defaultOpen>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pros</label>
                {verdictPros.map((pro, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={pro} onChange={e => updateArrayField(setVerdictPros, i, e.target.value)} placeholder="Pro…"
                      className="flex-1 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                    <button type="button" onClick={() => removeArrayField(setVerdictPros, i)} className="text-red-400 text-xs">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayField(setVerdictPros)} className="text-sm text-brand-primary hover:text-blue-400">+ Add Pro</button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cons</label>
                {verdictCons.map((con, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={con} onChange={e => updateArrayField(setVerdictCons, i, e.target.value)} placeholder="Con…"
                      className="flex-1 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                    <button type="button" onClick={() => removeArrayField(setVerdictCons, i)} className="text-red-400 text-xs">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayField(setVerdictCons)} className="text-sm text-brand-primary hover:text-blue-400">+ Add Con</button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bottom Line</label>
                <input type="text" value={verdictBottomLine} onChange={e => setVerdictBottomLine(e.target.value)} placeholder="One-line summary"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Verdict</label>
                <TiptapEditor content={verdictContent(verdictFull)} onChange={(_, html) => setVerdictFull(html)} placeholder="Write full verdict…" />
              </div>
            </div>
          </CollapsibleSection>

          {/* Specs sections (conditional on major category) */}
          {([
            { key: 'design', title: 'Specs: Design', data: specsDesign, setter: setSpecsDesign, fields: ['Dimensions', 'Weight', 'Front', 'Back', 'Side', 'Ports', 'Speakers', 'Colours', 'IP Rating'] },
            { key: 'display', title: 'Specs: Display', data: specsDisplay, setter: setSpecsDisplay, fields: ['Size', 'Type', 'Resolution', 'Refresh Rate', 'Pixel Density', 'Screen-to-body ratio', 'Peak Brightness', 'HDR', 'Color depth', 'Protection'] },
            { key: 'processor', title: 'Specs: Processor', data: specsProcessor, setter: setSpecsProcessor, fields: ['Chipset', 'CPU', 'GPU', 'Node size', 'NPU'] },
            { key: 'memory', title: 'Specs: Memory', data: specsMemory, setter: setSpecsMemory, fields: ['RAM', 'RAM type', 'Storage', 'Storage type', 'Expandable'] },
            { key: 'camera', title: 'Specs: Camera', custom: true },
            { key: 'battery', title: 'Specs: Battery', data: specsBattery, setter: setSpecsBattery, fields: ['Capacity', 'Battery type', 'Wired charging', 'Wireless charging', 'Reverse charging', 'Charging protocols'] },
            { key: 'connectivity', title: 'Specs: Connectivity', data: specsConnectivity, setter: setSpecsConnectivity, fields: ['WiFi', 'Bluetooth', 'NFC', 'USB', 'Positioning', 'IR blaster'] },
            { key: 'network', title: 'Specs: Network', data: specsNetwork, setter: setSpecsNetwork, fields: ['SIM', 'Technology', '2G bands', '3G bands', '4G bands', '5G bands'] },
            { key: 'software', title: 'Specs: Software', data: specsSoftware, setter: setSpecsSoftware, fields: ['OS', 'UI layer', 'Major OS upgrades', 'Security patches'] },
          ] as any[])
            .filter(section => !majorCategory || (SPEC_SECTIONS_BY_MAJOR[majorCategory] ?? []).includes(section.key))
            .map(section => {
            if (section.custom) {
              return (
                <CollapsibleSection key={section.title} title={section.title}>
                  <CameraSpecSection value={specsCamera} onChange={setSpecsCamera} />
                </CollapsibleSection>
              )
            }
            return (
              <CollapsibleSection key={section.title} title={section.title}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field: string) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1">{field}</label>
                      <input type="text" value={section.data[field] ?? ''} onChange={e => section.setter((prev: Record<string, string>) => ({ ...prev, [field]: e.target.value }))} placeholder={field}
                        className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )
          })}

          {/* Buy Links */}
          <CollapsibleSection title="Buy Links">
            {buyLinks.map((link, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Retailer</label>
                  <select value={link.retailer} onChange={e => {
                    setBuyLinks(prev => prev.map((item, idx) => idx === i ? { ...item, retailer: e.target.value } : item))
                  }} className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                    {RETAILERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">URL</label>
                  <input type="url" value={link.url} onChange={e => {
                    setBuyLinks(prev => prev.map((item, idx) => idx === i ? { ...item, url: e.target.value } : item))
                  }} placeholder="https://…"
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Price</label>
                  <input type="text" value={link.price} onChange={e => {
                    setBuyLinks(prev => prev.map((item, idx) => idx === i ? { ...item, price: e.target.value } : item))
                  }} placeholder="KSh 150,000"
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
                </div>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => setBuyLinks(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 text-xs hover:text-red-300">Remove</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setBuyLinks(prev => [...prev, { retailer: '', url: '', price: '', priceDate: '' }])}
              className="text-sm text-brand-primary hover:text-blue-400">+ Add Buy Link</button>
          </CollapsibleSection>

          {/* Related Content */}
          <CollapsibleSection title="Related Content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">YouTube Video ID</label>
                <input type="text" value={relatedVideoId} onChange={e => setRelatedVideoId(e.target.value)} placeholder="dQw4w9WgXcQ"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">TikTok URL</label>
                <input type="url" value={relatedTiktokUrl} onChange={e => setRelatedTiktokUrl(e.target.value)} placeholder="https://…"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
            </div>
          </CollapsibleSection>

          {/* SEO */}
          <CollapsibleSection title="SEO">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meta Title</label>
                <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="SEO title"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meta Description</label>
                <textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="SEO description" rows={3}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none resize-none" />
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0">
          <div className="sticky top-8 space-y-4">
            <div className="bg-card rounded-lg border-2 border-border p-4">
              <h3 className="text-sm font-medium text-white mb-3">Status</h3>
              <select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Availability</label>
                <select value={availability} onChange={e => setAvailability(e.target.value as never)}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
                  <option value="">Not set</option>
                  <option value="in-stock">In stock</option>
                  <option value="coming-soon">Coming soon</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>
              </div>
            </div>

              <div className="bg-card rounded-lg border-2 border-border p-4">
                <h3 className="text-sm font-medium text-white mb-3">Brand</h3>
                <BrandSelect brands={brands} value={brandId} onChange={setBrandId} disabled={loadingBrands} />
              </div>

            <div className="bg-card rounded-lg border-2 border-border p-4 text-center">
              <h3 className="text-sm font-medium text-white mb-2">Overall Score</h3>
              <p className={`text-4xl font-bold ${overallScore >= 80 ? 'text-score-high' : overallScore >= 60 ? 'text-score-mid' : 'text-score-low'}`}>
                {overallScore || '—'}
              </p>
            </div>

            <div className="space-y-2">
              <button type="button" onClick={() => handleSave(false)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/80 disabled:opacity-40 text-sm font-medium">
                <Save size={16} /> {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button type="button" onClick={() => handleSave(true)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-40 text-sm font-medium">
                <Upload size={16} /> Publish
              </button>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-gray-400 rounded-lg hover:text-white text-sm">
                  <Eye size={16} /> Preview
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
