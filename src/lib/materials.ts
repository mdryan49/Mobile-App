import { resolveSelection, type Selection, type Swatch } from '../config/catalog'

export interface MaterialRow {
  label: string
  text: string
  swatch: Swatch
}

/** The six finishes that define a look, in display order (screen and PDF). */
export function materialRows(selection: Selection): MaterialRow[] {
  const r = resolveSelection(selection)
  return [
    { label: 'Cabinets', swatch: r.cabinetFinish.swatch, text: `${r.cabinetLine.name} ${r.doorStyle.name}, ${r.cabinetFinish.name}` },
    { label: 'Countertop', swatch: r.countertop.swatch, text: `${r.countertop.brand} ${r.countertop.name} (${r.countertop.material.toLowerCase()})` },
    { label: 'Backsplash', swatch: r.backsplash.swatch, text: `${r.backsplash.brand} ${r.backsplash.name}` },
    { label: 'Hardware', swatch: r.hardwareFinish.swatch, text: r.hardwareFinish.name },
    { label: 'Sink & faucet', swatch: r.faucetFinish.swatch, text: `Kohler ${r.sinkFaucet.name}, ${r.faucetFinish.name}` },
    { label: 'Wall paint', swatch: r.paint.swatch, text: `${r.paint.brand} ${r.paint.name} (${r.paint.code})` },
  ]
}
