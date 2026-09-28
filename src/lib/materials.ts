import { resolveSelection, type Selection, type Swatch } from '../config/catalog'

export interface MaterialRow {
  label: string
  text: string
  /** Missing when the design keeps what's there today */
  swatch?: Swatch
  kept: boolean
}

export const KEEP_EXISTING = 'Keep existing'

/** Every category of a design option, in display order (screen and PDF). */
export function materialRows(selection: Selection, opts: { hideKept?: boolean } = {}): MaterialRow[] {
  const r = resolveSelection(selection)
  const row = (label: string, text: string | undefined, swatch?: Swatch): MaterialRow =>
    text ? { label, text, swatch, kept: false } : { label, text: KEEP_EXISTING, kept: true }

  const cabinetText = r.cabinetLine
    ? [`${r.cabinetLine.brand.replace(' Cabinets', '')} ${r.cabinetLine.name}`, r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
    : r.cabinetFinish
      ? `Refinish existing in ${r.cabinetFinish.name}${r.doorStyle ? `, ${r.doorStyle.name} doors` : ''}`
      : undefined
  const sinkText = r.sinkFaucet
    ? `${r.sinkFaucet.brand} ${r.sinkFaucet.name}${r.faucetFinish ? `, ${r.faucetFinish.name}` : ''}`
    : r.faucetFinish
      ? `Faucet finish: ${r.faucetFinish.name}`
      : undefined

  const rows = [
    row('Cabinets', cabinetText, r.cabinetFinish?.swatch ?? r.cabinetLine?.swatch),
    row('Countertop', r.countertop && `${r.countertop.brand} ${r.countertop.name} (${r.countertop.material.toLowerCase()})`, r.countertop?.swatch),
    row('Backsplash', r.backsplash && `${r.backsplash.brand} ${r.backsplash.name}`, r.backsplash?.swatch),
    row('Hardware', r.hardwareFinish?.name, r.hardwareFinish?.swatch),
    row('Sink & faucet', sinkText, r.faucetFinish?.swatch ?? r.sinkFaucet?.swatch),
    row('Wall paint', r.paint && `${r.paint.brand} ${r.paint.name} (${r.paint.code})`, r.paint?.swatch),
    row('Flooring', r.flooring && `${r.flooring.name}`, r.flooring?.swatch),
    row('Lighting', r.lighting?.name, r.lighting?.swatch),
  ]
  return opts.hideKept ? rows.filter((x) => !x.kept) : rows
}
