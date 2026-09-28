import { FAUCET_FINISH_UPCHARGE, HARDWARE_COST_EACH, resolveSelection, type Selection } from '../config/catalog'
import type { PricingSettings } from '../config/defaultSettings'
import type { Measurements, WallChange, WallStructure } from '../types'

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

  const raw: { key: LineKey; cost: number; detail: string }[] = []
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

  const jobCost = raw.reduce((sum, l) => sum + l.cost, 0)
  add('contingency', jobCost * (s.contingencyPct / 100), `${s.contingencyPct}% for surprises behind the walls`)

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

export const roundTo = (n: number, step: number) => Math.round(n / step) * step

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const moneyRange = (low: number, high: number) => `${money(low)} – ${money(high)}`

// ---------------- Homeowner view: grouped categories ----------------

export type GroupKey = 'cabinetry' | 'surfaces' | 'fixtures' | 'walls' | 'site' | 'finishes' | 'contingency'

export const GROUPS: { key: GroupKey; label: string; lines: LineKey[] }[] = [
  { key: 'cabinetry', label: 'Cabinetry & installation', lines: ['cabinets', 'hardware', 'installation'] },
  { key: 'surfaces', label: 'Countertops & backsplash', lines: ['countertops', 'backsplash'] },
  { key: 'fixtures', label: 'Sink, faucet & lighting', lines: ['sinkFaucet', 'lighting'] },
  { key: 'walls', label: 'Wall removal', lines: ['walls'] },
  { key: 'site', label: 'Demolition, trades & permits', lines: ['demo', 'plumbing', 'electrical', 'permits'] },
  { key: 'finishes', label: 'Flooring & paint', lines: ['flooring', 'paint'] },
  { key: 'contingency', label: 'Contingency', lines: ['contingency'] },
]

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
export function groupEstimate(est: Estimate, sel: Selection): EstimateGroup[] {
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
    site: cap(GROUPS.find((g) => g.key === 'site')!.lines.filter(has).map((k) => SITE_WORDS[k]).join(', ')),
    finishes: join([r.flooring && r.flooring.name, r.paint && `${r.paint.name} walls`]),
    contingency: byKey.get('contingency')?.detail ?? '',
  }

  return GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    amount: g.lines.reduce((sum, k) => sum + (byKey.get(k)?.amount ?? 0), 0),
    detail: details[g.key],
  })).filter((g) => g.amount > 0)
}
