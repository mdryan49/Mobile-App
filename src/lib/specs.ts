import { HARDWARE_COST_EACH, resolveSelection, type Selection, type SupplyField } from '../config/catalog'
import type { PricingSettings } from '../config/defaultSettings'
import type { Project } from '../types'

/** One line of the "Selections & specifications" list on the proposal. */
export interface SpecRow {
  item: string
  product: string
  sku: string
  qty: string
  leadTime: string
  supply: string
}

const n = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1))

/**
 * Every product a design option uses, with quantity, part number, lead time and who supplies it.
 * "Keep existing" items are left out.
 */
export function specRows(p: Pick<Project, 'roomType' | 'measurements' | 'bath'>, sel: Selection, pricing: PricingSettings): SpecRow[] {
  const r = resolveSelection(sel)
  const rows: SpecRow[] = []
  const supplyOf = (field: SupplyField) => {
    const c = sel.supply?.[field]
    return !c ? 'We supply' : c.mode === 'owner' ? 'Customer supplies' : `Allowance $${c.amount.toLocaleString('en-US')}`
  }
  const add = (row: Partial<SpecRow> & Pick<SpecRow, 'item' | 'product'>) =>
    rows.push({ sku: '-', qty: '1', leadTime: '-', supply: 'We supply', ...row })
  const suppliable = (field: SupplyField, item: string, product: { name: string; sku?: string; leadTime?: string } | undefined, qty: string, label?: string) => {
    if (!product && !sel.supply?.[field]) return
    add({
      item,
      product: label ?? product?.name ?? (sel.supply?.[field]?.mode === 'owner' ? "Customer's choice" : "Client's choice"),
      sku: product?.sku ?? '-',
      leadTime: product?.leadTime ?? '-',
      qty,
      supply: supplyOf(field),
    })
  }

  if (p.roomType === 'bath') {
    const b = p.bath
    const widthIn = r.vanity?.widthIn ?? b.vanityWidthIn
    const style = [r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
    if (r.vanity || sel.supply?.vanityId) suppliable('vanityId', 'Vanity', r.vanity, '1', r.vanity && `${r.vanity.name}${style ? `, ${style}` : ''}`)
    else if (r.cabinetFinish) add({ item: 'Vanity', product: `Refinish existing in ${r.cabinetFinish.name}`, qty: `${widthIn}" wide` })
    if (r.countertop) add({ item: 'Vanity top', product: `${r.countertop.brand} ${r.countertop.name}`, sku: r.countertop.sku, leadTime: r.countertop.leadTime, qty: `${n(Math.max(3, (widthIn / 12) * (22 / 12)))} sq ft` })
    if (r.shower) add({ item: 'Shower / tub', product: `${r.shower.brand} ${r.shower.name}`, sku: r.shower.sku, leadTime: r.shower.leadTime })
    suppliable('backsplashId', 'Shower wall tile', r.backsplash, `${n(b.showerTileSqft)} sq ft`)
    suppliable('glassId', 'Shower glass', r.glass, '1')
    suppliable('toiletId', 'Toilet', r.toilet, '1', r.toilet && `${r.toilet.brand} ${r.toilet.name}`)
    if (r.faucetFinish) add({ item: 'Faucets & trim', product: `Faucet, shower valve trim & accessories, ${r.faucetFinish.name}`, qty: 'Set' })
    if (r.hardwareFinish) add({ item: 'Vanity hardware', product: `Pulls, ${r.hardwareFinish.name}`, qty: String(Math.max(2, Math.ceil((widthIn / 12) * 1.5))) })
    suppliable('flooringId', 'Flooring', r.flooring, `${n(b.floorSqft)} sq ft`)
    suppliable('bathLightId', 'Mirror & lighting', r.bathLight, '1 set')
    if (r.paint) add({ item: 'Wall paint', product: `${r.paint.brand} ${r.paint.name}`, sku: r.paint.code, qty: `${n(b.paintSqft)} sq ft` })
    return rows
  }

  const m = p.measurements
  const islandLf = m.hasIsland ? m.islandLengthFt : 0
  const perimeterLf = m.baseCabinetLf + m.wallCabinetLf
  const twoToneIsland = m.hasIsland && r.islandFinish && r.islandFinish.id !== r.cabinetFinish?.id
  if (r.cabinetLine) {
    const style = [r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
    add({
      item: twoToneIsland ? 'Cabinets (perimeter)' : 'Cabinets',
      product: `${r.cabinetLine.brand.replace(' Cabinets', '')} ${r.cabinetLine.name}${style ? `, ${style}` : ''}`,
      sku: r.cabinetLine.sku,
      leadTime: r.cabinetLine.leadTime,
      qty: `${n(twoToneIsland ? perimeterLf : perimeterLf + islandLf)} lin ft`,
    })
    if (twoToneIsland) add({ item: 'Cabinets (island)', product: `${r.cabinetLine.name}${r.doorStyle ? ` ${r.doorStyle.name}` : ''}, ${r.islandFinish!.name}`, sku: r.cabinetLine.sku, leadTime: r.cabinetLine.leadTime, qty: `${n(islandLf)} lin ft` })
  } else if (r.cabinetFinish || twoToneIsland) {
    if (r.cabinetFinish) add({ item: 'Cabinet refinish', product: `Existing cabinets in ${r.cabinetFinish.name}`, qty: `${n(twoToneIsland ? perimeterLf : perimeterLf + islandLf)} lin ft` })
    if (twoToneIsland) add({ item: 'Island refinish', product: `Existing island in ${r.islandFinish!.name}`, qty: `${n(islandLf)} lin ft` })
  }
  for (const a of r.accessories) add({ item: 'Cabinet accessory', product: a.name, sku: a.sku, leadTime: a.leadTime })

  const islandTop = m.hasIsland ? r.islandCountertop ?? r.countertop : undefined
  const islandSqft = m.hasIsland ? Math.min(m.countertopSqft, m.islandLengthFt * m.islandWidthFt) : 0
  const split = islandTop && r.countertop && islandTop.id !== r.countertop.id
  if (r.countertop) {
    add({
      item: split ? 'Countertop (perimeter)' : 'Countertop',
      product: `${r.countertop.brand} ${r.countertop.name} (${r.countertop.material.toLowerCase()})`,
      sku: r.countertop.sku,
      leadTime: r.countertop.leadTime,
      qty: `~${n(split || !islandTop ? m.countertopSqft - islandSqft : m.countertopSqft)} sq ft`,
    })
  }
  if (islandTop && (split || !r.countertop)) {
    add({ item: 'Countertop (island)', product: `${islandTop.brand} ${islandTop.name} (${islandTop.material.toLowerCase()})`, sku: islandTop.sku, leadTime: islandTop.leadTime, qty: `~${n(islandSqft)} sq ft` })
  }
  suppliable('backsplashId', 'Backsplash tile', r.backsplash, `${n(m.backsplashSqft)} sq ft`, r.backsplash && `${r.backsplash.brand} ${r.backsplash.name}`)
  suppliable(
    'sinkFaucetId',
    'Sink & faucet',
    r.sinkFaucet,
    '1',
    r.sinkFaucet && `${r.sinkFaucet.brand} ${r.sinkFaucet.sink} + ${r.sinkFaucet.faucet}${r.faucetFinish ? `, ${r.faucetFinish.name}` : ''}`,
  )
  if (!r.sinkFaucet && r.faucetFinish && !sel.supply?.sinkFaucetId) add({ item: 'Faucet', product: `New faucet, ${r.faucetFinish.name}` })
  if (r.hardwareFinish) {
    const count = Math.ceil((perimeterLf + islandLf) * pricing.hardwarePerLf)
    add({ item: 'Cabinet hardware', product: `Pulls & knobs, ${r.hardwareFinish.name}`, qty: String(count), sku: HARDWARE_COST_EACH[r.hardwareFinish.id] ? `SAMPLE-HW-${r.hardwareFinish.id.toUpperCase()}` : '-' })
  }
  suppliable('flooringId', 'Flooring', r.flooring, `${n(m.flooringSqft)} sq ft`)
  suppliable('lightingId', 'Lighting', r.lighting, '1 package', r.lighting && `${r.lighting.name}: ${r.lighting.description}`)
  if (r.paint) add({ item: 'Wall paint', product: `${r.paint.brand} ${r.paint.name}`, sku: r.paint.code, qty: `${n(m.paintSqft)} sq ft` })
  return rows
}

/** The longest lead time in a list, to set expectations ("allow 8-10 weeks for cabinets"). */
export function longestLead(rows: SpecRow[]): SpecRow | undefined {
  const weeks = (s: string) => Math.max(0, ...(s.match(/\d+/g) ?? ['0']).map(Number))
  return rows.filter((r) => /week/.test(r.leadTime) && !/after/.test(r.leadTime)).sort((a, b) => weeks(b.leadTime) - weeks(a.leadTime))[0]
}
