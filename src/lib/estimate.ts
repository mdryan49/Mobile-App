import { FAUCET_FINISH_UPCHARGE, HARDWARE_COST_EACH, resolveSelection, type Selection, type Tier } from '../config/catalog'
import type { PricingSettings } from '../config/defaultSettings'
import type { Measurements } from '../types'

export type LineKey =
  | 'demo'
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
  /** INTERNAL ONLY: company cost before markup, for the Settings screen */
  internalCost: number
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Pure pricing function. Markup is applied to every line so it never
 * appears as its own line in front of the homeowner.
 */
export function calculateEstimate(
  m: Measurements,
  sel: Selection,
  tier: Tier,
  s: PricingSettings,
): Estimate {
  const r = resolveSelection(sel)
  const islandLf = m.hasIsland ? m.islandLengthFt : 0
  const totalCabLf = m.baseCabinetLf + m.wallCabinetLf + islandLf
  const refresh = m.demoScope === 'refresh'
  const hardwareCount = Math.ceil(totalCabLf * s.hardwarePerLf)

  const raw: { key: LineKey; cost: number; detail: string }[] = []
  const add = (key: LineKey, cost: number, detail: string) => raw.push({ key, cost, detail })

  // Demolition
  const demoCost =
    m.demoScope === 'full-gut' ? s.demoFullGut : m.demoScope === 'cabinets-counters' ? s.demoCabinetsCounters : s.demoRefresh
  const demoLabel = { 'full-gut': 'Full gut', 'cabinets-counters': 'Cabinets & counters', refresh: 'Refresh (counters & backsplash)' }[
    m.demoScope
  ]
  add('demo', demoCost + s.haulAway, demoLabel)

  // Cabinets
  if (refresh) {
    add('cabinets', totalCabLf * s.cabinetRefinishPerLf * (1 + r.cabinetFinish.upcharge), `Refinish existing, ${r.cabinetFinish.name} · ${fmtNum(totalCabLf)} lf`)
  } else {
    const baseCost = (m.baseCabinetLf + islandLf) * r.cabinetLine.baseCostPerLf
    const wallCost = m.wallCabinetLf * r.cabinetLine.wallCostPerLf
    const cost = (baseCost + wallCost) * r.doorStyle.priceMultiplier * (1 + r.cabinetFinish.upcharge)
    add('cabinets', cost, `${r.cabinetLine.name} ${r.doorStyle.name}, ${r.cabinetFinish.name} · ${fmtNum(totalCabLf)} lf`)
  }

  add('hardware', hardwareCount * (HARDWARE_COST_EACH[r.hardwareFinish.id] ?? 8), `${hardwareCount} pulls, ${r.hardwareFinish.name}`)

  add(
    'installation',
    (refresh ? 0 : totalCabLf * s.cabinetInstallPerLf) + hardwareCount * s.hardwareInstallEach,
    refresh ? 'Hardware install' : `Cabinets ${fmtNum(totalCabLf)} lf + hardware`,
  )

  add('countertops', m.countertopSqft * r.countertop.installedCostPerSqft, `${r.countertop.brand} ${r.countertop.name} · ${fmtNum(m.countertopSqft)} sq ft`)

  add(
    'backsplash',
    m.backsplashSqft * (r.backsplash.materialCostPerSqft + s.tileInstallPerSqft),
    `${r.backsplash.name} · ${fmtNum(m.backsplashSqft)} sq ft installed`,
  )

  add(
    'sinkFaucet',
    r.sinkFaucet.cost + (FAUCET_FINISH_UPCHARGE[r.faucetFinish.id] ?? 0) + s.sinkFaucetInstall,
    `Kohler ${r.sinkFaucet.sink} + ${r.sinkFaucet.faucet}, ${r.faucetFinish.name}`,
  )

  add(
    'plumbing',
    s.plumbingReconnect + (m.movePlumbing ? s.plumbingRelocate : 0),
    m.movePlumbing ? 'Relocate & reconnect' : 'Reconnect in place',
  )
  add(
    'electrical',
    s.electricalReconnect + (m.electricalUpdates ? s.electricalUpdates : 0),
    m.electricalUpdates ? 'Code updates, outlets & circuits' : 'Reconnect appliances',
  )

  if (m.newFlooring) add('flooring', m.flooringSqft * s.flooringPerSqft[tier], `${fmtNum(m.flooringSqft)} sq ft installed`)
  if (m.paintWalls) add('paint', m.paintSqft * s.paintPerSqft, `${r.paint.name} · ${fmtNum(m.paintSqft)} sq ft`)
  if (m.newLighting) add('lighting', s.lighting[tier], 'Recessed, pendant & under-cabinet')
  if (m.permits) add('permits', s.permits, 'Building permits & inspections')

  const jobCost = raw.reduce((sum, l) => sum + l.cost, 0)
  add('contingency', jobCost * (s.contingencyPct / 100), `${s.contingencyPct}% for surprises behind the walls`)

  const mult = 1 + s.markupPct / 100
  const lines: EstimateLine[] = raw.map((l) => ({
    key: l.key,
    label: LINE_LABELS[l.key],
    amount: roundTo(l.cost * mult, 10),
    detail: l.detail,
  }))
  const total = lines.reduce((sum, l) => sum + l.amount, 0)
  const range = s.rangePct / 100
  return {
    lines,
    total,
    low: roundTo(total * (1 - range), 100),
    high: roundTo(total * (1 + range), 100),
    internalCost: jobCost * (1 + s.contingencyPct / 100),
  }
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const moneyRange = (low: number, high: number) => `${money(low)} – ${money(high)}`
