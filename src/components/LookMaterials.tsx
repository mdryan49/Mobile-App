import type { Selection } from '../config/catalog'
import { materialRows } from '../lib/materials'
import { Swatch } from './Swatch'

export function LookMaterials({ selection }: { selection: Selection }) {
  return (
    <ul className="space-y-3">
      {materialRows(selection).map((row) => (
        <li key={row.label} className="flex items-center gap-3">
          {row.swatch ? (
            <Swatch swatch={row.swatch} className="h-10 w-10" />
          ) : (
            <span className="h-10 w-10 shrink-0 rounded-lg border-2 border-dashed border-neutral-300" />
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{row.label}</div>
            <div className={`leading-snug ${row.kept ? 'text-neutral-400' : 'font-medium'}`}>{row.text}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
