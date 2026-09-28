import { usePhotoUrl } from '../hooks/usePhotoUrl'
import type { RenderVersion } from '../types'

/** Every saved rendering for a look. Tap one to bring it (and its materials) back. */
export function VersionStrip({
  versions,
  activeId,
  onSelect,
  priceFor,
}: {
  versions: RenderVersion[]
  activeId?: string
  onSelect: (v: RenderVersion) => void
  priceFor?: (v: RenderVersion) => string
}) {
  if (versions.length < 2) return null
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase">Saved versions ({versions.length})</h3>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {versions.map((v, i) => (
          <VersionThumb key={v.id} version={v} index={i + 1} active={v.id === activeId} onSelect={() => onSelect(v)} price={priceFor?.(v)} />
        ))}
      </ul>
    </div>
  )
}

function VersionThumb({ version, index, active, onSelect, price }: { version: RenderVersion; index: number; active: boolean; onSelect: () => void; price?: string }) {
  const url = usePhotoUrl(version.id)
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`w-40 overflow-hidden rounded-xl border-4 text-left ${active ? 'border-accent' : 'border-transparent active:border-neutral-200'}`}
      >
        <div className="aspect-video bg-neutral-100">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="bg-white px-2 py-1.5">
          <div className="truncate text-sm font-semibold">
            {index}. {version.label}
          </div>
          {price && <div className="truncate text-xs text-neutral-500">{price}</div>}
        </div>
      </button>
    </li>
  )
}
