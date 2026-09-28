import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { drawWallStrokes } from '../lib/wallMask'
import type { PhotoRef, WallChange, WallStructure } from '../types'
import { Button, ChoiceGroup, Field, NumberInput, TextArea } from './ui'

const BRUSHES = [
  { label: 'Thin', value: 0.02 },
  { label: 'Medium', value: 0.045 },
  { label: 'Wide', value: 0.08 },
]

const STRUCTURES: { value: WallStructure; label: string; hint: string }[] = [
  { value: 'non-bearing', label: 'Not load-bearing', hint: 'Partition wall' },
  { value: 'load-bearing', label: 'Load-bearing', hint: 'Needs beam + engineer' },
  { value: 'unknown', label: "Don't know yet", hint: 'Priced as load-bearing' },
]

/**
 * Full-screen editor: paint over the wall to remove with a finger, then describe it.
 * Strokes are stored normalized (0..1) so they line up at any size.
 */
export function WallEditor({
  photo,
  wall,
  onSave,
  onCancel,
  onDelete,
}: {
  photo: PhotoRef
  wall: WallChange
  onSave: (w: WallChange) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const url = usePhotoUrl(photo.id)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [draft, setDraft] = useState<WallChange>(wall)
  const drawing = useRef<[number, number][] | null>(null)

  // Redraw whenever strokes, brush or size change
  const redraw = (d: WallChange, live?: [number, number][] | null) => {
    const c = canvas.current
    if (!c) return
    const rect = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    if (c.width !== Math.round(rect.width * dpr) || c.height !== Math.round(rect.height * dpr)) {
      c.width = Math.round(rect.width * dpr)
      c.height = Math.round(rect.height * dpr)
    }
    // Nothing to draw on until the photo has loaded and given the canvas a size
    if (!c.width || !c.height) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    const strokes = live ? [...d.strokes, live] : d.strokes
    // Draw opaque on an offscreen layer, then show it translucent (matches what the AI receives)
    const layer = document.createElement('canvas')
    layer.width = c.width
    layer.height = c.height
    drawWallStrokes(layer.getContext('2d')!, [{ ...d, strokes }], c.width, c.height, 'rgb(230, 30, 30)')
    ctx.globalAlpha = 0.55
    ctx.drawImage(layer, 0, 0)
    ctx.globalAlpha = 1
  }

  useEffect(() => {
    redraw(draft)
    const onResize = () => redraw(draft)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })

  const point = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ]
  }

  const set = (patch: Partial<WallChange>) => setDraft((d) => ({ ...d, ...patch }))
  const hasStrokes = draft.strokes.length > 0

  return (
    <div role="dialog" aria-modal="true" aria-label="Mark wall to remove" className="fixed inset-0 z-50 flex flex-col bg-white safe-top safe-bottom">
      <header className="flex items-center justify-between gap-3 border-b-2 border-neutral-100 px-4 py-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <h2 className="text-lg font-bold">Mark wall to remove</h2>
        <Button onClick={() => onSave(draft)} disabled={!hasStrokes}>
          Save wall
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <p className="mb-2 text-neutral-600">
            <strong>Paint over the wall</strong> with your finger. Cover the whole section that comes out, floor to ceiling.
          </p>
          <div className="relative overflow-hidden rounded-2xl bg-neutral-100">
            {url && <img src={url} alt="Kitchen" className="block w-full select-none" draggable={false} onLoad={() => redraw(draft)} />}
            <canvas
              ref={canvas}
              className="absolute inset-0 h-full w-full touch-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                drawing.current = [point(e)]
                redraw(draft, drawing.current)
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return
                drawing.current.push(point(e))
                redraw(draft, drawing.current)
              }}
              onPointerUp={() => {
                if (drawing.current?.length) {
                  const stroke = drawing.current
                  set({ strokes: [...draft.strokes, stroke] })
                }
                drawing.current = null
              }}
              onPointerCancel={() => (drawing.current = null)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {BRUSHES.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => set({ brush: b.value })}
                className={`min-h-11 rounded-full px-4 font-semibold ${draft.brush === b.value ? 'bg-accent text-white' : 'bg-neutral-100 active:bg-neutral-200'}`}
              >
                {b.label} brush
              </button>
            ))}
            <span className="flex-1" />
            <Button variant="secondary" onClick={() => set({ strokes: draft.strokes.slice(0, -1) })} disabled={!hasStrokes}>
              ↶ Undo
            </Button>
            <Button variant="secondary" onClick={() => set({ strokes: [] })} disabled={!hasStrokes}>
              Clear
            </Button>
          </div>
        </div>

        <aside className="space-y-5">
          <Field label="Is it load-bearing?">
            <ChoiceGroup options={STRUCTURES} value={draft.structure} onChange={(structure) => set({ structure })} columns={2} />
          </Field>
          <Field label="Wall length" hint="Length of the section being removed">
            <NumberInput value={draft.lengthFt} onChange={(lengthFt) => set({ lengthFt })} suffix="ft" step={0.5} />
          </Field>
          <Field label="Notes for the rendering" hint='e.g. "Open to the dining room, keep the doorway trim"'>
            <TextArea value={draft.note} onChange={(e) => set({ note: e.target.value })} />
          </Field>
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Renderings with a wall removed are <strong>concept only</strong> until a structural review confirms it can come out.
          </p>
          {onDelete && (
            <Button variant="danger" className="w-full" onClick={onDelete}>
              Delete this wall
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}

export const newWall = (id: string, photoId: string): WallChange => ({
  id,
  photoId,
  strokes: [],
  brush: 0.045,
  structure: 'unknown',
  lengthFt: 0,
  note: '',
})
