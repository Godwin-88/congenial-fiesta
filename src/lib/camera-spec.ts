export type RearCameraType = 'Main' | 'Telephoto' | 'Ultrawide' | 'Macro' | 'Depth'

export interface RearCamera {
  id: string
  type: RearCameraType
  sensorType: string
}

export interface CameraSpec {
  rear: RearCamera[]
  selfie: { sensorType: string }
  video: { rear: string; front: string; features: string }
  extras: string
}

export const REAR_CAMERA_TYPES: RearCameraType[] = ['Main', 'Telephoto', 'Ultrawide', 'Macro', 'Depth']

export function emptyCamera(): CameraSpec {
  return {
    rear: [],
    selfie: { sensorType: '' },
    video: { rear: '', front: '', features: '' },
    extras: '',
  }
}

export function cameraHasContent(spec: CameraSpec): boolean {
  if (!spec) return false
  if ((spec.rear ?? []).some((c) => c.sensorType?.trim())) return true
  if (spec.selfie?.sensorType?.trim()) return true
  if (spec.video?.rear?.trim() || spec.video?.front?.trim() || spec.video?.features?.trim()) return true
  if (spec.extras?.trim()) return true
  return false
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

function normalizeRear(raw: unknown): RearCamera[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: any) => ({
    id: typeof item?.id === 'string' ? item.id : makeId(),
    type: REAR_CAMERA_TYPES.includes(item?.type) ? (item.type as RearCameraType) : 'Main',
    sensorType: typeof item?.sensorType === 'string' ? item.sensorType : '',
  }))
}

// Coerce arbitrary JSON (new structured shape OR legacy flat shape) into a valid CameraSpec.
export function normalizeCamera(raw: unknown): CameraSpec {
  const fallback = emptyCamera()
  if (!raw || typeof raw !== 'object') return fallback
  const o = raw as any

  // Already in the structured shape
  if (Array.isArray(o.rear) || o.selfie || o.video || typeof o.extras === 'string') {
    return {
      rear: normalizeRear(o.rear),
      selfie: { sensorType: typeof o.selfie?.sensorType === 'string' ? o.selfie.sensorType : '' },
      video: {
        rear: typeof o.video?.rear === 'string' ? o.video.rear : '',
        front: typeof o.video?.front === 'string' ? o.video.front : '',
        features: typeof o.video?.features === 'string' ? o.video.features : '',
      },
      extras: typeof o.extras === 'string' ? o.extras : '',
    }
  }

  // Legacy flat shape: { Main, Ultrawide, Telephoto, 'Video (main)', Front, 'Video (front)' }
  const rear: RearCamera[] = []
  const push = (type: RearCameraType, val: unknown) => {
    if (typeof val === 'string' && val.trim()) rear.push({ id: makeId(), type, sensorType: val })
  }
  push('Main', o.Main)
  push('Ultrawide', o.Ultrawide)
  push('Telephoto', o.Telephoto)
  push('Macro', o.Macro)
  push('Depth', o.Depth)

  return {
    rear,
    selfie: { sensorType: typeof o.Front === 'string' ? o.Front : '' },
    video: {
      rear: typeof o['Video (main)'] === 'string' ? o['Video (main)'] : '',
      front: typeof o['Video (front)'] === 'string' ? o['Video (front)'] : '',
      features: '',
    },
    extras: '',
  }
}
