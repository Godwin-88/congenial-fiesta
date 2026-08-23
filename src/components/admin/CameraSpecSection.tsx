'use client'

import { CameraSpec, REAR_CAMERA_TYPES, RearCameraType, emptyCamera } from '@/lib/camera-spec'

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
    setRear([...v.rear, { id: crypto.randomUUID(), type, sensorType: '' }])
  const removeRear = (id: string) => setRear(v.rear.filter((c) => c.id !== id))

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
                  onChange={(e) => updateRear(cam.id, { type: e.target.value as RearCameraType })}
                  className={inputClass}
                >
                  {REAR_CAMERA_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
              + Add {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Selfie camera */}
      <div>
        <SubHeading>Selfie Camera</SubHeading>
        <div className="max-w-md">
          <label className={labelClass}>Sensor Type</label>
          <input
            type="text"
            value={v.selfie.sensorType}
            onChange={(e) => set({ selfie: { sensorType: e.target.value } })}
            placeholder="e.g. 32 MP, f/2.2"
            className={inputClass}
          />
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
