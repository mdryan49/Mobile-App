import { resolveSelection, type Selection } from '../config/catalog'
import { Swatch } from './Swatch'

export function LookMaterials({ selection }: { selection: Selection }) {
  const r = resolveSelection(selection)
  const rows = [
    { label: 'Cabinets', swatch: r.cabinetFinish.swatch, text: `${r.cabinetLine.name} ${r.doorStyle.name}, ${r.cabinetFinish.name}` },
    { label: 'Countertop', swatch: r.countertop.swatch, text: `${r.countertop.brand} ${r.countertop.name}` },
    { label: 'Backsplash', swatch: r.backsplash.swatch, text: r.backsplash.name },
    { label: 'Hardware', swatch: r.hardwareFinish.swatch, text: r.hardwareFinish.name },
    { label: 'Sink & faucet', swatch: r.faucetFinish.swatch, text: `Kohler ${r.sinkFaucet.name}, ${r.faucetFinish.name}` },
    { label: 'Wall paint', swatch: r.paint.swatch, text: `${r.paint.name} (${r.paint.code})` },
  ]
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
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
