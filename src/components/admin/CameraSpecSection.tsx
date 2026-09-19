'use client'

import { CameraSpec, REAR_CAMERA_TYPES, RearCameraType, SelfieCameraType, SELFIE_CAMERA_TYPES, emptyCamera, rearCameraLabel, selfieCameraLabel, emptySelfie, SelfieCamera } from '@/lib/camera-spec'
import { slotToken, tokenToSlot, type CameraSlot } from '@/lib/devices/camera-types'

/** Keep `slot` in sync whenever the admin changes a lens's role dropdown. */
function slotFromType(type: RearCameraType): CameraSlot {
  return tokenToSlot(type) ?? 'main'
}

const inputClass =
  'w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none'
const labelClass = 'block text-xs text-gray-500 mb-1'

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
      {children}
    </div>
  )
}

export function CameraSpecSection({
  value,
  onChange,
}: {
  value: CameraSpec
  onChange: (v: CameraSpec) => void
}) {
  const v = value ?? emptyCamera()

  const set = (patch: Partial<CameraSpec>) => onChange({ ...v, ...patch })
  const setRear = (rear: CameraSpec['rear']) => set({ rear })
  const updateRear = (id: string, patch: Partial<CameraSpec['rear'][number]>) =>
    setRear(v.rear.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const addRear = (type: RearCameraType = 'Main') =>
    setRear([
      ...v.rear,
      { id: crypto.randomUUID(), slot: slotFromType(type), type, sensorType: '' },
    ])
  const removeRear = (id: string) => setRear(v.rear.filter((c) => c.id !== id))

  // Selfie cameras: index 0 is the primary front camera; dual-selfie phones
  // add a second (usually ultrawide) front unit.
  const selfies = v.selfie ?? []
  const setSelfies = (selfie: SelfieCamera[]) => set({ selfie })
  const updateSelfie = (i: number, patch: Partial<SelfieCamera>) =>
    setSelfies(selfies.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const removeSelfie = (i: number) => setSelfies(selfies.filter((_, j) => j !== i))
  const selfieSlotFromType = (type: SelfieCameraType): CameraSlot =>
    type === 'Selfie' ? 'selfie' : (tokenToSlot(type) ?? 'selfie')
  const addSelfie = (type: SelfieCameraType = 'Selfie') =>
    setSelfies([...selfies, { ...emptySelfie(), type, slot: selfieSlotFromType(type) }])

  return (
    <div className="space-y-6">
      {/* 1. Rear cameras */}
      <div>
        <SubHeading>Rear Cameras</SubHeading>
        <div className="space-y-3">
          {v.rear.length === 0 && (
            <p className="text-xs text-gray-500">No rear cameras added yet.</p>
          )}
          {v.rear.map((cam) => (
            <div key={cam.id} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-40">
                <label className={labelClass}>Type</label>
                <select
                  value={cam.type}
                  onChange={(e) => {
                    const type = e.target.value as RearCameraType
                    updateRear(cam.id, { type, slot: slotFromType(type) })
                  }}
                  className={inputClass}
                >
                  {REAR_CAMERA_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {rearCameraLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Sensor Type</label>
                <input
                  type="text"
                  value={cam.sensorType}
                  onChange={(e) => updateRear(cam.id, { sensorType: e.target.value })}
                  placeholder="e.g. 50 MP Sony IMX890, f/1.8, OIS"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRear(cam.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REAR_CAMERA_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addRear(t)}
              className="rounded-full border border-border px-3 py-1 text-xs text-gray-300 hover:border-brand-primary hover:text-brand-primary"
            >
              + Add {rearCameraLabel(t).replace(/ camera$/i, '')}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Selfie cameras (some phones have a second, e.g. ultrawide, front unit) */}
      <div>
        <SubHeading>Selfie Cameras</SubHeading>
        <div className="space-y-3">
          {selfies.length === 0 && (
            <p className="text-xs text-gray-500">No selfie cameras added yet.</p>
          )}
          {selfies.map((cam, i) => (
            <div key={`selfie-${i}`} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-40">
                <label className={labelClass}>Type</label>
                <select
                  value={cam.type ?? 'Selfie'}
                  onChange={(e) => {
                    const type = e.target.value as SelfieCameraType
                    updateSelfie(i, { type, slot: selfieSlotFromType(type) })
                  }}
                  className={inputClass}
                >
                  {SELFIE_CAMERA_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {selfieCameraLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Sensor Type</label>
                <input
                  type="text"
                  value={cam.sensorType}
                  onChange={(e) => updateSelfie(i, { sensorType: e.target.value })}
                  placeholder="e.g. 32 MP, f/2.2"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => removeSelfie(i)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SELFIE_CAMERA_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addSelfie(t)}
              className="rounded-full border border-border px-3 py-1 text-xs text-gray-300 hover:border-brand-primary hover:text-brand-primary"
            >
              + Add {selfieCameraLabel(t).replace(/ camera$/i, '')}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Video recording */}
      <div>
        <SubHeading>Video Recording</SubHeading>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Rear Video</label>
            <input
              type="text"
              value={v.video.rear}
              onChange={(e) => set({ video: { ...v.video, rear: e.target.value } })}
              placeholder="e.g. 8K@24fps, 4K@60fps"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Front Video</label>
            <input
              type="text"
              value={v.video.front}
              onChange={(e) => set({ video: { ...v.video, front: e.target.value } })}
              placeholder="e.g. 4K@30fps"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Video Features</label>
            <input
              type="text"
              value={v.video.features}
              onChange={(e) => set({ video: { ...v.video, features: e.target.value } })}
              placeholder="e.g. HDR, Dolby Vision, slow-mo 1080p@240fps"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* 4. Extras */}
      <div>
        <SubHeading>Extras</SubHeading>
        <div>
          <label className={labelClass}>Extras (HDR, partnerships, flashes, etc.)</label>
          <textarea
            value={v.extras}
            onChange={(e) => set({ extras: e.target.value })}
            placeholder="e.g. Dual-LED flash, Leica partnership, 10-bit HDR"
            rows={3}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
