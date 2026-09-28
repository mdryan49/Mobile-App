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

/** Key into project.activeRender. Every photo can have its own rendering per look. */
export const renderKey = (look: LookKey, photoId: string) => `${look}@${photoId}`

/** Renderings of one photo in one look (defaults to the hero photo), oldest first. */
export function rendersFor(p: Project, look: LookKey, photoId = p.heroPhotoId ?? ''): RenderVersion[] {
  return p.renders.filter((r) => r.look === look && r.sourcePhotoId === photoId).sort((a, b) => a.createdAt - b.createdAt)
}

/** The rendering currently shown for a look + photo (defaults to the hero photo). */
export function activeVersion(p: Project, look: LookKey, photoId = p.heroPhotoId ?? ''): RenderVersion | undefined {
  const id = p.activeRender[renderKey(look, photoId)]
  return id ? p.renders.find((r) => r.id === id) : undefined
}

export function withActive(p: Project, look: LookKey, photoId: string, renderId: string): Project['activeRender'] {
  return { ...p.activeRender, [renderKey(look, photoId)]: renderId }
}
