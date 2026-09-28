import { TIERS, type Selection, type Tier } from '../config/catalog'
import type { LookKey, Project, RenderVersion } from '../types'

/** Good / Better / Best, plus Custom Mix once the salesperson starts one. */
export function availableLooks(p: Project): LookKey[] {
  return p.custom ? [...TIERS, 'custom'] : [...TIERS]
}

export function lookSelection(p: Project, look: LookKey): Selection {
  return look === 'custom' ? p.custom!.selection : p.selections[look]
}

/** Tier whose labor rates (flooring, lighting) price this look. */
export function lookPricingTier(p: Project, look: LookKey): Tier {
  return look === 'custom' ? p.custom!.baseTier : look
}

export function rendersFor(p: Project, look: LookKey): RenderVersion[] {
  return p.renders.filter((r) => r.look === look).sort((a, b) => a.createdAt - b.createdAt)
}

export function activeVersion(p: Project, look: LookKey): RenderVersion | undefined {
  const id = p.activeRender[look]
  return id ? p.renders.find((r) => r.id === id) : undefined
}
