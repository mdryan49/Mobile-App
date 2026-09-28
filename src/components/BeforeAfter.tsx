import { useRef, useState, type PointerEvent } from 'react'

/** Drag or tap anywhere on the image to compare. Keyboard/VoiceOver use the hidden range input. */
export function BeforeAfter({ before, after, alt = 'Kitchen' }: { before: string; after: string; alt?: string }) {
  const [pos, setPos] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const moveTo = (e: PointerEvent) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    setPos(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <div
      ref={box}
      className="relative w-full cursor-ew-resize touch-none overflow-hidden rounded-2xl bg-neutral-100 select-none"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        moveTo(e)
      }}
      onPointerMove={(e) => dragging.current && moveTo(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <img src={after} alt={`${alt} after`} className="block w-full" draggable={false} />
      <img
        src={before}
        alt={`${alt} before`}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.5)]" />
        <div className="absolute top-1/2 -ml-7 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl font-bold text-accent shadow-lg">
          ⇆
        </div>
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">Before</span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Before and after comparison"
        className="sr-only"
      />
    </div>
  )
}
