import type { Selection } from '../config/catalog'
import { materialRows } from '../lib/materials'
import { Swatch } from './Swatch'

export function LookMaterials({ selection }: { selection: Selection }) {
  return (
    <ul className="space-y-3">
      {materialRows(selection).map((row) => (
        <li key={row.label} className="flex items-center gap-3">
          <Swatch swatch={row.swatch} className="h-10 w-10" />
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{row.label}</div>
            <div className="leading-snug font-medium">{row.text}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
