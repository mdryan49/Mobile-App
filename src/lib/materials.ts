import { resolveSelection, type Selection, type SupplyField, type Swatch } from '../config/catalog'
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
  /** Adds "allowance $X" / "customer-supplied" to items that aren't simply supplied by us */
  const supplied = (field: SupplyField, text: string | undefined): string | undefined => {
    const c = selection.supply?.[field]
    if (!c) return text
    if (c.mode === 'owner') return `${text ?? "Customer's choice"} · customer-supplied, we install`
    return `${text ?? "Client's choice"} · allowance $${c.amount.toLocaleString('en-US')}`
  }

  if (opts.room === 'bath') {
    const vanityText = r.vanity
      ? [r.vanity.name, r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
      : r.cabinetFinish
        ? `Refinish existing in ${r.cabinetFinish.name}`
        : undefined
    const tileText = supplied('backsplashId', r.backsplash?.name)
    const glassText = supplied('glassId', r.glass?.name.toLowerCase())
    const showerText = r.shower
      ? `${r.shower.name}${r.shower.tiled ? `, ${tileText ?? 'tile allowance'}` : ''}${glassText ? `, ${glassText}` : ''}`
      : tileText
        ? `Re-tile existing: ${tileText}${glassText ? `, ${glassText}` : ''}`
        : glassText
    const rows = [
      row('Vanity', supplied('vanityId', vanityText), r.cabinetFinish?.swatch),
      row('Vanity top', r.countertop && `${r.countertop.brand} ${r.countertop.name}`, r.countertop?.swatch),
      row('Shower / tub', showerText, r.backsplash?.swatch),
      row('Toilet', supplied('toiletId', r.toilet && `${r.toilet.brand} ${r.toilet.name}`)),
      row('Fixtures', r.faucetFinish?.name, r.faucetFinish?.swatch),
      row('Hardware', r.hardwareFinish?.name, r.hardwareFinish?.swatch),
      row('Wall paint', r.paint && `${r.paint.brand} ${r.paint.name} (${r.paint.code})`, r.paint?.swatch),
      row('Flooring', supplied('flooringId', r.flooring?.name), r.flooring?.swatch),
      row('Mirror & lighting', supplied('bathLightId', r.bathLight?.name)),
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
    ...(r.islandFinish && r.islandFinish.id !== r.cabinetFinish?.id ? [row('Island cabinets', r.islandFinish.name, r.islandFinish.swatch)] : []),
    row('Countertop', r.countertop && `${r.countertop.brand} ${r.countertop.name} (${r.countertop.material.toLowerCase()})`, r.countertop?.swatch),
    ...(r.islandCountertop && r.islandCountertop.id !== r.countertop?.id
      ? [row('Island top', `${r.islandCountertop.brand} ${r.islandCountertop.name} (${r.islandCountertop.material.toLowerCase()})`, r.islandCountertop.swatch)]
      : []),
    row('Backsplash', supplied('backsplashId', r.backsplash && `${r.backsplash.brand} ${r.backsplash.name}`), r.backsplash?.swatch),
    row('Hardware', r.hardwareFinish?.name, r.hardwareFinish?.swatch),
    row('Sink & faucet', supplied('sinkFaucetId', sinkText), r.faucetFinish?.swatch ?? r.sinkFaucet?.swatch),
    row('Wall paint', r.paint && `${r.paint.brand} ${r.paint.name} (${r.paint.code})`, r.paint?.swatch),
    row('Flooring', supplied('flooringId', r.flooring?.name), r.flooring?.swatch),
    row('Lighting', supplied('lightingId', r.lighting?.name), r.lighting?.swatch),
    ...(r.accessories.length ? [row('Accessories', r.accessories.map((a) => a.name).join(', '))] : []),
  ]
  return opts.hideKept ? rows.filter((x) => !x.kept) : rows
}
