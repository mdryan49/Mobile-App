import { APPLIANCES, FAUCET_FINISH_UPCHARGE, HARDWARE_COST_EACH, isEmptySelection, resolveSelection, type Selection, type SupplyField } from '../config/catalog'
import type { PricingSettings } from '../config/defaultSettings'
import type { BathMeasurements, Measurements, RoomType, SharedScope, WallChange, WallStructure } from '../types'

export type LineKey =
  | 'demo'
  | 'walls'
  | 'windows'
  | 'drywall'
  | 'appliances'
  | 'accessories'
  | 'floorRemoval'
  | 'projectFee'
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
  accessories: 'Cabinet accessories',
  hardware: 'Cabinet hardware',
  installation: 'Installation labor',
  countertops: 'Countertops (material, fabrication & install)',
  backsplash: 'Backsplash tile',
  sinkFaucet: 'Sink & faucet',
  vanity: 'Vanity',
  vanityTop: 'Vanity top & sinks',
  shower: 'Shower / tub',
  glass: 'Shower glass',
  toilet: 'Toilet',
  fixtures: 'Faucets, trim & accessories',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  ventilation: 'Exhaust fan',
  windows: 'Windows',
  drywall: 'Drywall & texture',
  appliances: 'Appliance installation',
  floorRemoval: 'Flooring removal',
  flooring: 'Flooring',
  heatedFloor: 'Heated floor',
  paint: 'Wall paint',
  lighting: 'Lighting',
  bathLighting: 'Mirror & vanity lighting',
  permits: 'Permits',
  projectFee: 'Project fees',
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
export function calculateEstimate(m: Measurements, sel: Selection, s: PricingSettings, walls: WallChange[] = [], firstRoom = true): Estimate {
  const r = resolveSelection(sel)
  const islandLf = m.hasIsland ? m.islandLengthFt : 0
  const totalCabLf = m.baseCabinetLf + m.wallCabinetLf + islandLf
  const newCabinets = !!r.cabinetLine
  const hardwareCount = r.hardwareFinish ? Math.ceil(totalCabLf * s.hardwarePerLf) : 0
  const touchesPlumbing = newCabinets || !!r.countertop || inDesign(sel, 'sinkFaucetId') || m.movePlumbing
  const touchesElectrical = newCabinets || !!r.countertop || !!r.islandCountertop || m.electricalUpdates

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
  // Two-tone: the island can have its own color (null = same as perimeter)
  const islandFinish = m.hasIsland ? r.islandFinish ?? r.cabinetFinish : undefined
  const islandUpcharge = 1 + (islandFinish?.upcharge ?? 0)
  const twoTone = !!(islandFinish && r.cabinetFinish && islandFinish.id !== r.cabinetFinish.id) || !!(islandFinish && !r.cabinetFinish)
  const colors = twoTone ? `${r.cabinetFinish?.name ?? 'current color'} perimeter, ${islandFinish!.name} island` : r.cabinetFinish?.name
  if (r.cabinetLine) {
    const perimeter = (m.baseCabinetLf * r.cabinetLine.baseCostPerLf + m.wallCabinetLf * r.cabinetLine.wallCostPerLf) * upcharge
    const island = islandLf * r.cabinetLine.baseCostPerLf * islandUpcharge
    const cost = (perimeter + island) * (r.doorStyle?.priceMultiplier ?? 1)
    const style = [r.doorStyle?.name, colors].filter(Boolean).join(', ')
    add('cabinets', cost, `${r.cabinetLine.name}${style ? ` ${style}` : ''} · ${fmtNum(totalCabLf)} lf`)
  } else if (r.cabinetFinish || islandFinish) {
    const perimeterLf = m.baseCabinetLf + m.wallCabinetLf
    const cost = (r.cabinetFinish ? perimeterLf * upcharge : 0) + (islandFinish ? islandLf * islandUpcharge : 0)
    add('cabinets', cost * s.cabinetRefinishPerLf, `Refinish existing: ${colors} · ${fmtNum(r.cabinetFinish ? totalCabLf : islandLf)} lf`)
  }

  if (r.accessories.length) add('accessories', r.accessories.reduce((n, a) => n + a.cost, 0), r.accessories.map((a) => a.name).join(', '))
  if (m.appliances?.length) {
    const names = APPLIANCES.filter((a) => m.appliances.includes(a.id)).map((a) => a.name.toLowerCase())
    add('appliances', m.appliances.length * s.applianceInstallEach, `Install ${names.join(', ')}`)
  }
  if (r.hardwareFinish) add('hardware', hardwareCount * (HARDWARE_COST_EACH[r.hardwareFinish.id] ?? 8), `${hardwareCount} pulls, ${r.hardwareFinish.name}`)

  add(
    'installation',
    (newCabinets ? totalCabLf * s.cabinetInstallPerLf : 0) + hardwareCount * s.hardwareInstallEach,
    newCabinets ? `Cabinets ${fmtNum(totalCabLf)} lf${hardwareCount ? ' + hardware' : ''}` : 'Hardware install',
  )

  // Island top can be a different material; its area is length x width, the rest is perimeter
  const islandTop = m.hasIsland ? r.islandCountertop ?? r.countertop : undefined
  const islandSqft = m.hasIsland ? Math.min(m.countertopSqft, m.islandLengthFt * m.islandWidthFt) : 0
  const perimeterSqft = Math.max(0, m.countertopSqft - islandSqft)
  if (r.countertop || islandTop) {
    const split = islandTop && r.countertop && islandTop.id !== r.countertop.id
    const cost = (r.countertop ? perimeterSqft * r.countertop.installedCostPerSqft : 0) + (islandTop ? islandSqft * islandTop.installedCostPerSqft : 0)
    const detail = split
      ? `${r.countertop!.brand} ${r.countertop!.name} perimeter ${fmtNum(perimeterSqft)} sq ft + ${islandTop!.brand} ${islandTop!.name} island ${fmtNum(islandSqft)} sq ft`
      : r.countertop
        ? `${r.countertop.brand} ${r.countertop.name} · ${fmtNum(r.countertop && islandTop ? m.countertopSqft : perimeterSqft)} sq ft`
        : `${islandTop!.brand} ${islandTop!.name} island only · ${fmtNum(islandSqft)} sq ft`
    add('countertops', cost, detail)
  }
  const tile = supplied(sel, 'backsplashId', r.backsplash?.name, m.backsplashSqft * (r.backsplash?.materialCostPerSqft ?? 0), m.backsplashSqft * s.tileInstallPerSqft)
  if (tile) add('backsplash', tile.cost, `${tile.label} · ${fmtNum(m.backsplashSqft)} sq ft installed`)
  const sink = supplied(
    sel,
    'sinkFaucetId',
    r.sinkFaucet && `${r.sinkFaucet.brand} ${r.sinkFaucet.sink} + ${r.sinkFaucet.faucet}${r.faucetFinish ? `, ${r.faucetFinish.name}` : ''}`,
    (r.sinkFaucet?.cost ?? 0) + (r.faucetFinish ? FAUCET_FINISH_UPCHARGE[r.faucetFinish.id] ?? 0 : 0),
    s.sinkFaucetInstall,
  )
  if (sink) add('sinkFaucet', sink.cost, sink.label)

  if (touchesPlumbing) add('plumbing', s.plumbingReconnect + (m.movePlumbing ? s.plumbingRelocate : 0), m.movePlumbing ? 'Relocate & reconnect' : 'Reconnect in place')
  if (touchesElectrical) add('electrical', s.electricalReconnect + (m.electricalUpdates ? s.electricalUpdates : 0), m.electricalUpdates ? 'Code updates, outlets & circuits' : 'Reconnect appliances')

  const floorInstall = m.flooringSqft * s.flooringInstallPerSqft
  const floor = supplied(sel, 'flooringId', r.flooring?.name, Math.max(0, m.flooringSqft * (r.flooring?.installedCostPerSqft ?? 0) - floorInstall), floorInstall)
  if (floor) add('flooring', floor.cost, `${floor.label} · ${fmtNum(m.flooringSqft)} sq ft installed`)
  if (r.paint) add('paint', m.paintSqft * s.paintPerSqft, `${r.paint.name} · ${fmtNum(m.paintSqft)} sq ft`)
  const light = supplied(sel, 'lightingId', r.lighting && `${r.lighting.name}: ${r.lighting.description}`, Math.max(0, (r.lighting?.cost ?? 0) - s.lightingInstallOnly), s.lightingInstallOnly)
  if (light) add('lighting', light.cost, light.label)
  if (m.permits) add('permits', s.permits, 'Building permits & inspections')
  sharedScope(add, m, s, m.flooringSqft, inDesign(sel, 'flooringId'), firstRoom)

  return finalize(raw, s, sel, walls)
}

type RawLine = { key: LineKey; cost: number; detail: string }

/**
 * Price one suppliable item as materials + install:
 * we supply it (catalog materials), an allowance (budget replaces materials), or customer-supplied (install only).
 * Returns null when the item isn't part of the design.
 */
function supplied(sel: Selection, field: SupplyField, name: string | undefined, material: number, install: number): { cost: number; label: string } | null {
  const choice = sel.supply?.[field]
  if (!name && !choice) return null
  if (choice?.mode === 'owner') return { cost: install, label: `${name ?? "Customer's choice"} (customer-supplied, install only)` }
  if (choice?.mode === 'allowance') return { cost: choice.amount + install, label: `${name ?? "Client's choice"} (allowance ${money(choice.amount)})` }
  return { cost: material + install, label: name! }
}

/** Part of the design, whether as a product, an allowance or customer-supplied. */
const inDesign = (sel: Selection, field: SupplyField) => !!sel[field] || !!sel.supply?.[field]

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
    empty: isEmptySelection(sel) && walls.length === 0,
  }
}

/** Tile allowance per sq ft when a tiled shower is chosen before the tile is. */
export const TILE_ALLOWANCE_PER_SQFT = 10

/** Windows, drywall, flooring removal and the project fee: the same for every option of a room. */
function sharedScope(add: (k: LineKey, c: number, d: string) => void, sc: SharedScope, s: PricingSettings, floorSqft: number, newFloor: boolean, firstRoom: boolean) {
  if (sc.windowCount > 0) {
    add('windows', sc.windowCount * (s.windowAllowance + s.windowInstall), `${sc.windowCount} dual-pane window${sc.windowCount > 1 ? 's' : ''} (allowance ${money(s.windowAllowance)} each), installed & flashed`)
  }
  if (sc.drywallSqft > 0) add('drywall', sc.drywallSqft * s.drywallPerSqft, `${fmtNum(sc.drywallSqft)} sq ft new/patched drywall, textured`)
  if (sc.removeFlooring && newFloor) add('floorRemoval', floorSqft * s.floorRemovalPerSqft, `Remove & dispose of existing floor · ${fmtNum(floorSqft)} sq ft`)
  if (firstRoom) add('projectFee', s.projectFee, 'Project administration')
}

/** Full bath remodel. Anything not chosen is "keep existing" and costs nothing. */
export function calculateBathEstimate(b: BathMeasurements, sel: Selection, s: PricingSettings, walls: WallChange[] = [], firstRoom = true): Estimate {
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
  const style = [r.doorStyle?.name, r.cabinetFinish?.name].filter(Boolean).join(', ')
  const vanity = supplied(sel, 'vanityId', r.vanity && `${r.vanity.name}${style ? `, ${style}` : ''}`, (r.vanity?.cost ?? 0) * (r.doorStyle?.priceMultiplier ?? 1) * upcharge, s.vanityInstall)
  if (vanity) {
    add('vanity', vanity.cost, `${vanity.label}, installed`)
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

  // Shower tile: a picked tile, an allowance, customer-supplied, or (if a tiled shower has no tile yet) the standard allowance rate
  const tileLabor = b.showerTileSqft * (s.tileInstallPerSqft + s.showerWaterproofPerSqft)
  const pickedTile = supplied(sel, 'backsplashId', r.backsplash?.name, b.showerTileSqft * (r.backsplash?.materialCostPerSqft ?? 0), tileLabor)
  const showerTile = pickedTile ?? { cost: b.showerTileSqft * TILE_ALLOWANCE_PER_SQFT + tileLabor, label: `tile allowance $${TILE_ALLOWANCE_PER_SQFT}/sq ft` }
  if (r.shower) {
    add(
      'shower',
      r.shower.cost + (r.shower.tiled ? showerTile.cost : 0),
      r.shower.tiled ? `${r.shower.name}, ${fmtNum(b.showerTileSqft)} sq ft ${showerTile.label}, waterproofed` : r.shower.name,
    )
  } else if (pickedTile) {
    add('shower', pickedTile.cost, `Re-tile existing shower walls: ${pickedTile.label}, ${fmtNum(b.showerTileSqft)} sq ft`)
  }
  const glass = supplied(sel, 'glassId', r.glass?.name, r.glass?.cost ?? 0, s.glassInstall)
  if (glass) add('glass', glass.cost, glass.label)
  const toilet = supplied(sel, 'toiletId', r.toilet && `${r.toilet.brand} ${r.toilet.name}`, r.toilet?.cost ?? 0, s.toiletInstall)
  if (toilet) add('toilet', toilet.cost, `${toilet.label}, installed`)
  if (r.faucetFinish) {
    add('fixtures', s.bathFixtureTrim + (FAUCET_FINISH_UPCHARGE[r.faucetFinish.id] ?? 0) * (sinks + 1), `Faucet${sinks > 1 ? 's' : ''}, shower trim & accessories in ${r.faucetFinish.name}`)
  }

  const touchesPlumbing = !!(inDesign(sel, 'vanityId') || r.shower || inDesign(sel, 'toiletId') || b.movePlumbing)
  if (touchesPlumbing) {
    add(
      'plumbing',
      (b.demoScope === 'full-gut' ? s.bathPlumbingRoughIn : s.plumbingReconnect) + (b.movePlumbing ? s.plumbingRelocate : 0),
      [b.demoScope === 'full-gut' ? 'New supply & drain rough-in' : 'Reconnect fixtures', b.movePlumbing && 'relocate fixtures'].filter(Boolean).join(', '),
    )
  }
  if (b.electricalUpdates) add('electrical', s.electricalUpdates, 'GFCI outlets, circuits & code updates')
  if (b.exhaustFan) add('ventilation', s.exhaustFan, 'Quiet vented exhaust fan')
  const bFloorInstall = b.floorSqft * s.flooringInstallPerSqft
  const bFloor = supplied(sel, 'flooringId', r.flooring?.name, Math.max(0, b.floorSqft * (r.flooring?.installedCostPerSqft ?? 0) - bFloorInstall), bFloorInstall)
  if (bFloor) add('flooring', bFloor.cost, `${bFloor.label} · ${fmtNum(b.floorSqft)} sq ft installed`)
  if (b.heatedFloor && bFloor) add('heatedFloor', b.floorSqft * s.heatedFloorPerSqft, `Radiant heat mat · ${fmtNum(b.floorSqft)} sq ft`)
  if (r.paint) add('paint', b.paintSqft * s.paintPerSqft, `${r.paint.name} · ${fmtNum(b.paintSqft)} sq ft (moisture-resistant)`)
  const bLight = supplied(sel, 'bathLightId', r.bathLight?.name, Math.max(0, (r.bathLight?.cost ?? 0) - s.bathLightInstallOnly), s.bathLightInstallOnly)
  if (bLight) add('bathLighting', bLight.cost, bLight.label)
  if (b.permits) add('permits', s.permits, 'Building permits & inspections')
  sharedScope(add, b, s, b.floorSqft, inDesign(sel, 'flooringId'), firstRoom)

  return finalize(raw, s, sel, walls)
}

/** Price one design option for whichever room the project view is scoped to. */
export function estimateFor(
  p: { roomType: RoomType; measurements: Measurements; bath: BathMeasurements; isFirstRoom?: boolean },
  sel: Selection,
  s: PricingSettings,
  walls: WallChange[] = [],
): Estimate {
  const first = p.isFirstRoom ?? true
  return p.roomType === 'bath' ? calculateBathEstimate(p.bath, sel, s, walls, first) : calculateEstimate(p.measurements, sel, s, walls, first)
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const moneyRange = (low: number, high: number) => `${money(low)} – ${money(high)}`

// ---------------- Homeowner view: grouped categories ----------------

export type GroupKey = 'cabinetry' | 'surfaces' | 'fixtures' | 'vanity' | 'shower' | 'bathFixtures' | 'walls' | 'construction' | 'site' | 'finishes' | 'contingency'

export const GROUPS: { key: GroupKey; label: string; lines: LineKey[] }[] = [
  { key: 'cabinetry', label: 'Cabinetry & installation', lines: ['cabinets', 'accessories', 'hardware', 'installation'] },
  { key: 'surfaces', label: 'Countertops & backsplash', lines: ['countertops', 'backsplash'] },
  { key: 'fixtures', label: 'Sink, faucet & lighting', lines: ['sinkFaucet', 'lighting'] },
  { key: 'walls', label: 'Wall removal', lines: ['walls'] },
  { key: 'construction', label: 'Construction & appliance install', lines: ['windows', 'drywall', 'appliances'] },
  { key: 'site', label: 'Demolition, trades & permits', lines: ['demo', 'plumbing', 'electrical', 'permits', 'projectFee'] },
  { key: 'finishes', label: 'Flooring & paint', lines: ['floorRemoval', 'flooring', 'paint'] },
  { key: 'contingency', label: 'Contingency', lines: ['contingency'] },
]

export const BATH_GROUPS: { key: GroupKey; label: string; lines: LineKey[] }[] = [
  { key: 'vanity', label: 'Vanity & top', lines: ['vanity', 'vanityTop', 'hardware'] },
  { key: 'shower', label: 'Shower / tub', lines: ['shower', 'glass'] },
  { key: 'bathFixtures', label: 'Toilet, fixtures & lighting', lines: ['toilet', 'fixtures', 'bathLighting'] },
  { key: 'walls', label: 'Wall removal', lines: ['walls'] },
  { key: 'construction', label: 'Windows & drywall', lines: ['windows', 'drywall'] },
  { key: 'site', label: 'Demolition, trades & permits', lines: ['demo', 'plumbing', 'electrical', 'ventilation', 'permits', 'projectFee'] },
  { key: 'finishes', label: 'Flooring & paint', lines: ['floorRemoval', 'flooring', 'heatedFloor', 'paint'] },
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
  projectFee: 'project fees',
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
    construction: join([byKey.get('windows') && byKey.get('windows')!.detail.split(' (')[0], has('drywall') && 'drywall & texture', has('appliances') && 'appliance install']),
    vanity: join([r.vanity?.name ?? byKey.get('vanity')?.detail, r.cabinetFinish?.name, r.countertop && `${r.countertop.brand} ${r.countertop.name} top`]),
    shower: join([byKey.get('shower')?.detail.split(',')[0], r.backsplash && `${r.backsplash.name} walls`, r.glass?.name]),
    bathFixtures: join([r.toilet && `${r.toilet.name} toilet`, r.faucetFinish && `${r.faucetFinish.name} fixtures`, r.bathLight?.name]),
    site: cap(groupsFor(room).find((g) => g.key === 'site')!.lines.filter(has).map((k) => SITE_WORDS[k] ?? LINE_LABELS[k].toLowerCase()).join(', ')),
    finishes: join([has('floorRemoval') && 'old floor removed', r.flooring && r.flooring.name, has('heatedFloor') && 'heated floor', r.paint && `${r.paint.name} walls`]),
    contingency: byKey.get('contingency')?.detail ?? '',
  }

  return groupsFor(room).map((g) => ({
    key: g.key,
    label: g.label,
    amount: g.lines.reduce((sum, k) => sum + (byKey.get(k)?.amount ?? 0), 0),
    detail: details[g.key],
  })).filter((g) => g.amount > 0)
}
