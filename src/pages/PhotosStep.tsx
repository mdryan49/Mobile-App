import { useRef, useState } from 'react'
import { Button, ConfirmDialog } from '../components/ui'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { deletePhoto, putPhoto } from '../lib/db'
import { newId } from '../lib/id'
import { compressImage } from '../lib/image'
import type { PhotoRef } from '../types'
import { useProjectContext } from './ProjectLayout'

export const MIN_PHOTOS = 3
export const MAX_PHOTOS = 6

export default function PhotosStep() {
  const { project, update } = useProjectContext()
  const cameraInput = useRef<HTMLInputElement>(null)
  const uploadInput = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [toRemove, setToRemove] = useState<PhotoRef | null>(null)

  const count = project.photos.length
  const remaining = MAX_PHOTOS - count

  async function addFiles(list: FileList | null) {
    if (!list?.length) return
    setError(null)
    const files = Array.from(list).slice(0, remaining)
    if (list.length > remaining) setError(`Only ${MAX_PHOTOS} photos per consultation. Added the first ${files.length}.`)
    setProcessing(files.length)
    for (const file of files) {
      try {
        const { blob, width, height } = await compressImage(file)
        const id = newId()
        await putPhoto(project.id, id, blob)
        update((p) => ({
          ...p,
          photos: [...p.photos, { id, width, height, addedAt: Date.now() }],
          heroPhotoId: p.heroPhotoId ?? id, // first photo becomes hero by default
        }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'One photo could not be added.')
      } finally {
        setProcessing((n) => n - 1)
      }
    }
  }

  async function remove(photo: PhotoRef) {
    setToRemove(null)
    update((p) => {
      const photos = p.photos.filter((ph) => ph.id !== photo.id)
      return { ...p, photos, heroPhotoId: p.heroPhotoId === photo.id ? photos[0]?.id ?? null : p.heroPhotoId }
    })
    await deletePhoto(photo.id)
  }

  const setHero = (id: string) => update((p) => ({ ...p, heroPhotoId: id }))

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Kitchen photos</h1>
          <p className="mt-1 text-neutral-600">
            Take {MIN_PHOTOS}–{MAX_PHOTOS} photos. Tap <strong>Make hero</strong> on the best straight-on shot. That one is
            used for the AI renderings.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => cameraInput.current?.click()} disabled={remaining <= 0 || processing > 0}>
            📷 Take photo
          </Button>
          <Button variant="secondary" onClick={() => uploadInput.current?.click()} disabled={remaining <= 0 || processing > 0}>
            Upload
          </Button>
        </div>
      </div>

      {/* capture="environment" opens the rear camera on iPad */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={uploadInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-3 py-1 font-semibold ${count >= MIN_PHOTOS ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700'}`}>
          {count} of {MAX_PHOTOS} photos
        </span>
        {count < MIN_PHOTOS && <span className="text-neutral-500">Add at least {MIN_PHOTOS - count} more.</span>}
        {count > 0 && !project.heroPhotoId && <span className="font-semibold text-amber-700">Pick a hero photo.</span>}
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {project.photos.map((ph) => (
          <PhotoTile
            key={ph.id}
            photo={ph}
            isHero={ph.id === project.heroPhotoId}
            onHero={() => setHero(ph.id)}
            onRemove={() => setToRemove(ph)}
          />
        ))}
        {Array.from({ length: processing }).map((_, i) => (
          <li key={`p${i}`} className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
            Optimizing photo…
          </li>
        ))}
        {count === 0 && processing === 0 && (
          <li className="col-span-full rounded-2xl border-2 border-dashed border-neutral-200 py-16 text-center text-neutral-500">
            No photos yet. Tap <strong>Take photo</strong> to use the iPad camera.
          </li>
        )}
      </ul>

      <ConfirmDialog
        open={!!toRemove}
        title="Remove photo?"
        message="This photo will be deleted from this consultation."
        confirmLabel="Remove"
        danger
        onConfirm={() => toRemove && remove(toRemove)}
        onCancel={() => setToRemove(null)}
      />
    </section>
  )
}

function PhotoTile({
  photo,
  isHero,
  onHero,
  onRemove,
}: {
  photo: PhotoRef
  isHero: boolean
  onHero: () => void
  onRemove: () => void
}) {
  const url = usePhotoUrl(photo.id)
  return (
    <li className={`overflow-hidden rounded-2xl border-4 bg-white ${isHero ? 'border-accent' : 'border-transparent'}`}>
      <div className="relative aspect-[4/3] bg-neutral-100">
        {url && <img src={url} alt="Kitchen" className="h-full w-full object-cover" />}
        {isHero && (
          <span className="absolute top-3 left-3 rounded-full bg-accent px-3 py-1 text-sm font-bold text-white shadow">★ Hero</span>
        )}
      </div>
      <div className="flex">
        <button
          className={`min-h-12 flex-1 font-semibold ${isHero ? 'text-neutral-400' : 'text-accent active:bg-neutral-50'}`}
          onClick={onHero}
          disabled={isHero}
        >
          {isHero ? 'Hero photo' : 'Make hero'}
        </button>
        <button className="min-h-12 flex-1 border-l-2 border-neutral-100 font-semibold text-red-600 active:bg-neutral-50" onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  )
}
