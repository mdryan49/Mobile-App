import { FAUCET_FINISH_UPCHARGE, HARDWARE_COST_EACH, resolveSelection, type Selection } from '../config/catalog'
import type { PricingSettings } from '../config/defaultSettings'
import type { BathMeasurements, Measurements, RoomType, WallChange, WallStructure } from '../types'

export type LineKey =
  | 'demo'
  | 'walls'
  | 'cabinets'
  | 'hardware'
  | 'installation'
  | 'countertops'
  | 'backsplash'
  | 'sinkFaucet'
  | 'plumbing'
  | 'electrical'
  | 'flooring'
  | 'paint'
  | 'lighting'
  | 'permits'
  | 'vanity'
  | 'vanityTop'
  | 'shower'
  | 'glass'
  | 'toilet'
  | 'fixtures'
  | 'bathLighting'
  | 'ventilation'
  | 'heatedFloor'
  | 'contingency'

export const LINE_LABELS: Record<LineKey, string> = {
  demo: 'Demolition & haul-away',
  walls: 'Wall removal',
  cabinets: 'Cabinets',
  hardware: 'Cabinet hardware',
  installation: 'Installation labor',
  countertops: 'Countertops (material, fabrication & install)',
  backsplash: 'Backsplash tile',
  sinkFaucet: 'Sink & faucet',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  flooring: 'Flooring',
  paint: 'Wall paint',
  lighting: 'Lighting',
  permits: 'Permits',
  vanity: 'Vanity',
  vanityTop: 'Vanity top & sinks',
  shower: 'Shower / tub',
  glass: 'Shower glass',
  toilet: 'Toilet',
  fixtures: 'Faucets, trim & accessories',
  bathLighting: 'Mirror & vanity lighting',
  ventilation: 'Exhaust fan',
  heatedFloor: 'Heated floor',
  contingency: 'Contingency',
}

export interface EstimateLine {
  key: LineKey
  label: string
  /** Customer-facing price (markup already included) */
  amount: number
  /** Short explanation, e.g. "20 lf base + 15 lf wall" */
  detail: string
}

export interface Estimate {
  lines: EstimateLine[]
  /** Customer-facing total (markup included, never shown separately) */
  total: number
  low: number
  high: number
  /** INTERNAL ONLY: company cost before markup */
  internalCost: number
  /** Nothing new was chosen in this design yet */
  empty: boolean
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export const WALL_LABELS: Record<WallStructure, string> = {
  'non-bearing': 'Not load-bearing',
  'load-bearing': 'Load-bearing',
  unknown: 'Not verified yet',
}

/** Cost of removing one wall. Unverified walls are priced as load-bearing (the safe assumption). */
export function wallCost(w: WallChange, s: PricingSettings): number {
  return w.structure === 'non-bearing'
    ? s.wallNonBearingBase + w.lengthFt * s.wallNonBearingPerLf
    : s.wallLoadBearingBase + w.lengthFt * s.wallLoadBearingPerLf
}

/**
 * Pure pricing function for one design option. Anything the design doesn't choose
 * is "keep existing" and costs nothing. Markup is applied to every line so it never
 * appears as its own line in front of the homeowner.
 */
export function calculateEstimate(m: Measurements, sel: Selection, s: PricingSettings, walls: WallChange[] = []): Estimate {
  const r = resolveSelection(sel)
  const islandLf = m.hasIsland ? m.islandLengthFt : 0
  const totalCabLf = m.baseCabinetLf + m.wallCabinetLf + islandLf
  const newCabinets = !!r.cabinetLine
  const hardwareCount = r.hardwareFinish ? Math.ceil(totalCabLf * s.hardwarePerLf) : 0
  const touchesPlumbing = newCabinets || !!r.countertop || !!r.sinkFaucet || m.movePlumbing
  const touchesElectrical = newCabinets || !!r.countertop || m.electricalUpdates

  const raw: RawLine[] = []
  const add = (key: LineKey, cost: number, detail: string) => cost > 0 && raw.push({ key, cost, detail })

  const demoCost = { 'full-gut': s.demoFullGut, 'cabinets-counters': s.demoCabinetsCounters, refresh: s.demoRefresh }[m.demoScope]
  const demoLabel = { 'full-gut': 'Full gut', 'cabinets-counters': 'Cabinets & counters', refresh: 'Refresh (counters & backsplash)' }[m.demoScope]
  add('demo', demoCost + s.haulAway, demoLabel)

  if (walls.length) {
    const lf = walls.reduce((n, w) => n + w.lengthFt, 0)
    const unverified = walls.some((w) => w.structure === 'unknown')
    add(
      'walls',
      walls.reduce((n, w) => n + wallCost(w, s), 0),
      `${walls.length} wall${walls.length === 1 ? '' : 's'}, ${fmtNum(lf)} lin ft${unverified ? ' (priced as load-bearing until verified)' : ''}`,
    )
  }

  const upcharge = 1 + (r.cabinetFinish?.upcharge ?? 0)
  if (r.cabinetLine) {
    const baseCost = (m.baseCabinetLf + islandLf) * r.cabinetLine.baseCostPerLf
    const wallCostLf = m.wallCabinetLf * r.cabinetLine.wallCostPerLf
    const cost = (baseCost + wallCostLf) * (r.doorStyle?.priceMultiplier ?? 1) * upcharge
    const style = [r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
    add('cabinets', cost, `${r.cabinetLine.name}${style ? ` ${style}` : ''} · ${fmtNum(totalCabLf)} lf`)
  } else if (r.cabinetFinish) {
    add('cabinets', totalCabLf * s.cabinetRefinishPerLf * upcharge, `Refinish existing in ${r.cabinetFinish.name} · ${fmtNum(totalCabLf)} lf`)
  }

  if (r.hardwareFinish) add('hardware', hardwareCount * (HARDWARE_COST_EACH[r.hardwareFinish.id] ?? 8), `${hardwareCount} pulls, ${r.hardwareFinish.name}`)

  add(
    'installation',
    (newCabinets ? totalCabLf * s.cabinetInstallPerLf : 0) + hardwareCount * s.hardwareInstallEach,
    newCabinets ? `Cabinets ${fmtNum(totalCabLf)} lf${hardwareCount ? ' + hardware' : ''}` : 'Hardware install',
  )

  if (r.countertop) add('countertops', m.countertopSqft * r.countertop.installedCostPerSqft, `${r.countertop.brand} ${r.countertop.name} · ${fmtNum(m.countertopSqft)} sq ft`)
  if (r.backsplash) add('backsplash', m.backsplashSqft * (r.backsplash.materialCostPerSqft + s.tileInstallPerSqft), `${r.backsplash.name} · ${fmtNum(m.backsplashSqft)} sq ft installed`)
  if (r.sinkFaucet) {
    add(
      'sinkFaucet',
      r.sinkFaucet.cost + (r.faucetFinish ? FAUCET_FINISH_UPCHARGE[r.faucetFinish.id] ?? 0 : 0) + s.sinkFaucetInstall,
      `${r.sinkFaucet.brand} ${r.sinkFaucet.sink} + ${r.sinkFaucet.faucet}${r.faucetFinish ? `, ${r.faucetFinish.name}` : ''}`,
    )
  }

  if (touchesPlumbing) add('plumbing', s.plumbingReconnect + (m.movePlumbing ? s.plumbingRelocate : 0), m.movePlumbing ? 'Relocate & reconnect' : 'Reconnect in place')
  if (touchesElectrical) add('electrical', s.electricalReconnect + (m.electricalUpdates ? s.electricalUpdates : 0), m.electricalUpdates ? 'Code updates, outlets & circuits' : 'Reconnect appliances')

  if (r.flooring) add('flooring', m.flooringSqft * r.flooring.installedCostPerSqft, `${r.flooring.name} · ${fmtNum(m.flooringSqft)} sq ft installed`)
  if (r.paint) add('paint', m.paintSqft * s.paintPerSqft, `${r.paint.name} · ${fmtNum(m.paintSqft)} sq ft`)
  if (r.lighting) add('lighting', r.lighting.cost, `${r.lighting.name}: ${r.lighting.description}`)
  if (m.permits) add('permits', s.permits, 'Building permits & inspections')

  return finalize(raw, s, sel, walls)
}

type RawLine = { key: LineKey; cost: number; detail: string }

/** Contingency, markup (folded into every line) and the ± range. Shared by kitchens and baths. */
function finalize(raw: RawLine[], s: PricingSettings, sel: Selection, walls: WallChange[]): Estimate {
  const jobCost = raw.reduce((sum, l) => sum + l.cost, 0)
  if (jobCost > 0) raw.push({ key: 'contingency', cost: jobCost * (s.contingencyPct / 100), detail: `${s.contingencyPct}% for surprises behind the walls` })

  const mult = 1 + s.markupPct / 100
  const lines: EstimateLine[] = raw.map((l) => ({ key: l.key, label: LINE_LABELS[l.key], amount: roundTo(l.cost * mult, 10), detail: l.detail }))
  const total = lines.reduce((sum, l) => sum + l.amount, 0)
  const range = s.rangePct / 100
  return {
    lines,
    total,
    low: roundTo(total * (1 - range), 100),
    high: roundTo(total * (1 + range), 100),
    internalCost: jobCost * (1 + s.contingencyPct / 100),
    empty: Object.values(sel).every((v) => v === null) && walls.length === 0,
  }
}

/** Tile allowance per sq ft when a tiled shower is chosen before the tile is. */
export const TILE_ALLOWANCE_PER_SQFT = 10

/** Full bath remodel. Anything not chosen is "keep existing" and costs nothing. */
export function calculateBathEstimate(b: BathMeasurements, sel: Selection, s: PricingSettings, walls: WallChange[] = []): Estimate {
  const r = resolveSelection(sel)
  const raw: RawLine[] = []
  const add = (key: LineKey, cost: number, detail: string) => cost > 0 && raw.push({ key, cost, detail })
  const widthIn = r.vanity?.widthIn ?? b.vanityWidthIn
  const sinks = r.vanity?.sinks ?? (widthIn >= 60 ? 2 : 1)

  add('demo', (b.demoScope === 'full-gut' ? s.bathDemoFullGut : s.bathDemoPartial) + s.haulAway, b.demoScope === 'full-gut' ? 'Full gut to studs' : 'Partial demolition')
  if (walls.length) {
    const lf = walls.reduce((n, w) => n + w.lengthFt, 0)
    add('walls', walls.reduce((n, w) => n + wallCost(w, s), 0), `${walls.length} wall${walls.length === 1 ? '' : 's'}, ${fmtNum(lf)} lin ft`)
  }

  const upcharge = 1 + (r.cabinetFinish?.upcharge ?? 0)
  if (r.vanity) {
    const style = [r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
    add('vanity', r.vanity.cost * (r.doorStyle?.priceMultiplier ?? 1) * upcharge + s.vanityInstall, `${r.vanity.name}${style ? `, ${style}` : ''}, installed`)
  } else if (r.cabinetFinish) {
    add('vanity', (widthIn / 12) * s.cabinetRefinishPerLf * upcharge, `Refinish existing vanity in ${r.cabinetFinish.name}`)
  }
  if (r.countertop) {
    const sqft = Math.max(3, (widthIn / 12) * (22 / 12))
    add('vanityTop', sqft * r.countertop.installedCostPerSqft + sinks * 200, `${r.countertop.brand} ${r.countertop.name}, ${sinks} undermount sink${sinks > 1 ? 's' : ''}`)
  }
  if (r.hardwareFinish) {
    const pulls = Math.max(2, Math.ceil((widthIn / 12) * 1.5))
    add('hardware', pulls * ((HARDWARE_COST_EACH[r.hardwareFinish.id] ?? 8) + s.hardwareInstallEach), `${pulls} pulls, ${r.hardwareFinish.name}`)
  }

  const tileRate = (r.backsplash ? r.backsplash.materialCostPerSqft : TILE_ALLOWANCE_PER_SQFT) + s.tileInstallPerSqft + s.showerWaterproofPerSqft
  const tileNote = r.backsplash ? r.backsplash.name : `tile allowance $${TILE_ALLOWANCE_PER_SQFT}/sq ft`
  if (r.shower) {
    add(
      'shower',
      r.shower.cost + (r.shower.tiled ? b.showerTileSqft * tileRate : 0),
      r.shower.tiled ? `${r.shower.name}, ${fmtNum(b.showerTileSqft)} sq ft ${tileNote}, waterproofed` : r.shower.name,
    )
  } else if (r.backsplash) {
    add('shower', b.showerTileSqft * tileRate, `Re-tile existing shower walls: ${r.backsplash.name}, ${fmtNum(b.showerTileSqft)} sq ft`)
  }
  if (r.glass) add('glass', r.glass.cost + s.glassInstall, r.glass.name)
  if (r.toilet) add('toilet', r.toilet.cost + s.toiletInstall, `${r.toilet.brand} ${r.toilet.name}, installed`)
  if (r.faucetFinish) {
    add('fixtures', s.bathFixtureTrim + (FAUCET_FINISH_UPCHARGE[r.faucetFinish.id] ?? 0) * (sinks + 1), `Faucet${sinks > 1 ? 's' : ''}, shower trim & accessories in ${r.faucetFinish.name}`)
  }

  const touchesPlumbing = !!(r.vanity || r.shower || r.toilet || b.movePlumbing)
  if (touchesPlumbing) {
    add(
      'plumbing',
      (b.demoScope === 'full-gut' ? s.bathPlumbingRoughIn : s.plumbingReconnect) + (b.movePlumbing ? s.plumbingRelocate : 0),
      [b.demoScope === 'full-gut' ? 'New supply & drain rough-in' : 'Reconnect fixtures', b.movePlumbing && 'relocate fixtures'].filter(Boolean).join(', '),
    )
  }
  if (b.electricalUpdates) add('electrical', s.electricalUpdates, 'GFCI outlets, circuits & code updates')
  if (b.exhaustFan) add('ventilation', s.exhaustFan, 'Quiet vented exhaust fan')
  if (r.flooring) add('flooring', b.floorSqft * r.flooring.installedCostPerSqft, `${r.flooring.name} · ${fmtNum(b.floorSqft)} sq ft installed`)
  if (b.heatedFloor && r.flooring) add('heatedFloor', b.floorSqft * s.heatedFloorPerSqft, `Radiant heat mat · ${fmtNum(b.floorSqft)} sq ft`)
  if (r.paint) add('paint', b.paintSqft * s.paintPerSqft, `${r.paint.name} · ${fmtNum(b.paintSqft)} sq ft (moisture-resistant)`)
  if (r.bathLight) add('bathLighting', r.bathLight.cost, r.bathLight.name)
  if (b.permits) add('permits', s.permits, 'Building permits & inspections')

  return finalize(raw, s, sel, walls)
}

/** Price one design option for whichever room the project view is scoped to. */
export function estimateFor(
  p: { roomType: RoomType; measurements: Measurements; bath: BathMeasurements },
  sel: Selection,
  s: PricingSettings,
  walls: WallChange[] = [],
): Estimate {
  return p.roomType === 'bath' ? calculateBathEstimate(p.bath, sel, s, walls) : calculateEstimate(p.measurements, sel, s, walls)
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const moneyRange = (low: number, high: number) => `${money(low)} – ${money(high)}`

// ---------------- Homeowner view: grouped categories ----------------

export type GroupKey = 'cabinetry' | 'surfaces' | 'fixtures' | 'vanity' | 'shower' | 'bathFixtures' | 'walls' | 'site' | 'finishes' | 'contingency'

export const GROUPS: { key: GroupKey; label: string; lines: LineKey[] }[] = [
  { key: 'cabinetry', label: 'Cabinetry & installation', lines: ['cabinets', 'hardware', 'installation'] },
  { key: 'surfaces', label: 'Countertops & backsplash', lines: ['countertops', 'backsplash'] },
  { key: 'fixtures', label: 'Sink, faucet & lighting', lines: ['sinkFaucet', 'lighting'] },
  { key: 'walls', label: 'Wall removal', lines: ['walls'] },
  { key: 'site', label: 'Demolition, trades & permits', lines: ['demo', 'plumbing', 'electrical', 'permits'] },
  { key: 'finishes', label: 'Flooring & paint', lines: ['flooring', 'paint'] },
  { key: 'contingency', label: 'Contingency', lines: ['contingency'] },
]

export const BATH_GROUPS: { key: GroupKey; label: string; lines: LineKey[] }[] = [
  { key: 'vanity', label: 'Vanity & top', lines: ['vanity', 'vanityTop', 'hardware'] },
  { key: 'shower', label: 'Shower / tub', lines: ['shower', 'glass'] },
  { key: 'bathFixtures', label: 'Toilet, fixtures & lighting', lines: ['toilet', 'fixtures', 'bathLighting'] },
  { key: 'walls', label: 'Wall removal', lines: ['walls'] },
  { key: 'site', label: 'Demolition, trades & permits', lines: ['demo', 'plumbing', 'electrical', 'ventilation', 'permits'] },
  { key: 'finishes', label: 'Flooring & paint', lines: ['flooring', 'heatedFloor', 'paint'] },
  { key: 'contingency', label: 'Contingency', lines: ['contingency'] },
]

export const groupsFor = (room: RoomType) => (room === 'bath' ? BATH_GROUPS : GROUPS)

export interface EstimateGroup {
  key: GroupKey
  label: string
  amount: number
  detail: string
}

const SITE_WORDS: Partial<Record<LineKey, string>> = {
  demo: 'demolition & haul-away',
  plumbing: 'plumbing',
  electrical: 'electrical',
  permits: 'permits',
}

/** Rolls line items up into homeowner-friendly categories (empty groups are dropped). */
export function groupEstimate(est: Estimate, sel: Selection, room: RoomType = 'kitchen'): EstimateGroup[] {
  const r = resolveSelection(sel)
  const byKey = new Map(est.lines.map((l) => [l.key, l]))
  const has = (k: LineKey) => byKey.has(k)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const join = (parts: (string | false | undefined)[]) => parts.filter(Boolean).join(', ')

  const details: Record<GroupKey, string> = {
    cabinetry: join([byKey.get('cabinets')?.detail, has('hardware') && r.hardwareFinish && `${r.hardwareFinish.name} hardware`]),
    surfaces: join([r.countertop && `${r.countertop.brand} ${r.countertop.name} counters`, r.backsplash && `${r.backsplash.name} backsplash`]),
    fixtures: join([r.sinkFaucet && `${r.sinkFaucet.brand} ${r.sinkFaucet.name}${r.faucetFinish ? `, ${r.faucetFinish.name}` : ''}`, r.lighting?.name]),
    walls: byKey.get('walls')?.detail ?? '',
    vanity: join([r.vanity?.name ?? byKey.get('vanity')?.detail, r.cabinetFinish?.name, r.countertop && `${r.countertop.brand} ${r.countertop.name} top`]),
    shower: join([byKey.get('shower')?.detail.split(',')[0], r.backsplash && `${r.backsplash.name} walls`, r.glass?.name]),
    bathFixtures: join([r.toilet && `${r.toilet.name} toilet`, r.faucetFinish && `${r.faucetFinish.name} fixtures`, r.bathLight?.name]),
    site: cap(groupsFor(room).find((g) => g.key === 'site')!.lines.filter(has).map((k) => SITE_WORDS[k] ?? LINE_LABELS[k].toLowerCase()).join(', ')),
    finishes: join([r.flooring && r.flooring.name, has('heatedFloor') && 'heated floor', r.paint && `${r.paint.name} walls`]),
    contingency: byKey.get('contingency')?.detail ?? '',
  }

  return groupsFor(room).map((g) => ({
    key: g.key,
    label: g.label,
    amount: g.lines.reduce((sum, k) => sum + (byKey.get(k)?.amount ?? 0), 0),
    detail: details[g.key],
  })).filter((g) => g.amount > 0)
}
