import { resolveSelection, type Selection, type Swatch } from '../config/catalog'
import type { RoomType } from '../types'

export interface MaterialRow {
  label: string
  text: string
  /** Missing when the design keeps what's there today */
  swatch?: Swatch
  kept: boolean
}

export const KEEP_EXISTING = 'Keep existing'

/** Every category of a design option, in display order (screen and PDF). */
export function materialRows(selection: Selection, opts: { hideKept?: boolean; room?: RoomType } = {}): MaterialRow[] {
  const r = resolveSelection(selection)
  const row = (label: string, text: string | undefined, swatch?: Swatch): MaterialRow =>
    text ? { label, text, swatch, kept: false } : { label, text: KEEP_EXISTING, kept: true }

  if (opts.room === 'bath') {
    const vanityText = r.vanity
      ? [r.vanity.name, r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
      : r.cabinetFinish
        ? `Refinish existing in ${r.cabinetFinish.name}`
        : undefined
    const showerText = r.shower
      ? `${r.shower.name}${r.shower.tiled ? `, ${r.backsplash ? r.backsplash.name : 'tile to be selected'}` : ''}${r.glass ? `, ${r.glass.name.toLowerCase()}` : ''}`
      : r.backsplash
        ? `Re-tile existing: ${r.backsplash.name}`
        : undefined
    const rows = [
      row('Vanity', vanityText, r.cabinetFinish?.swatch),
      row('Vanity top', r.countertop && `${r.countertop.brand} ${r.countertop.name}`, r.countertop?.swatch),
      row('Shower / tub', showerText, r.backsplash?.swatch),
      row('Toilet', r.toilet && `${r.toilet.brand} ${r.toilet.name}`),
      row('Fixtures', r.faucetFinish?.name, r.faucetFinish?.swatch),
      row('Hardware', r.hardwareFinish?.name, r.hardwareFinish?.swatch),
      row('Wall paint', r.paint && `${r.paint.brand} ${r.paint.name} (${r.paint.code})`, r.paint?.swatch),
      row('Flooring', r.flooring?.name, r.flooring?.swatch),
      row('Mirror & lighting', r.bathLight?.name),
    ]
    return opts.hideKept ? rows.filter((x) => !x.kept) : rows
  }

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
