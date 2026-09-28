import type { Selection } from '../config/catalog'
import type { Design, LookKey, Project, RenderVersion } from '../types'

/** Design options, in order. (A "look" is a design option id.) */
export function availableLooks(p: Project): LookKey[] {
  return p.designs.map((d) => d.id)
}

export function getDesign(p: Project, look: LookKey): Design | undefined {
  return p.designs.find((d) => d.id === look)
}

export function lookName(p: Project, look: LookKey): string {
  return getDesign(p, look)?.name ?? 'Design'
}

export function lookSelection(p: Project, look: LookKey): Selection {
  return getDesign(p, look)!.selection
}

/** Walls removed in this design option (only if the option includes them). */
export function lookWalls(p: Project, look: LookKey) {
  return getDesign(p, look)?.removeWalls ? p.walls : []
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

/** Enough measurements to price this room? (Kitchen: cabinet run. Bath: floor area.) */
export function hasMeasurements(p: Project): boolean {
  return p.roomType === 'bath' ? p.bath.floorSqft > 0 : p.measurements.baseCabinetLf > 0
}
