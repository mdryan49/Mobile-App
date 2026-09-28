import type { PhotoRef, Project } from '../types'
import { getPhotoBlob } from './db'
import { activeVersion, getDesign, lookWalls, rendersFor } from './looks'
import { CHANGE_LABELS, changeIsAddition, changesPrompt, fullRenderPrompt, hasChanges, nearestAspectRatio, pendingChanges, type ChangeKey } from './prompt'
import { startRender } from './renderJobs'
import { annotateWalls } from './wallMask'

export interface RenderPlan {
  /** What the picture is missing compared with the design */
  pending: ChangeKey[]
  /** The pending changes can be applied as a quick edit of the current rendering */
  canEdit: boolean
  /** The design has nothing to show yet */
  nothingChosen: boolean
}

/** Walls of this design option that were marked on this particular photo. */
export const wallsOnPhoto = (p: Project, look: string, photoId: string) => lookWalls(p, look).filter((w) => w.photoId === photoId)

export function planRender(p: Project, look: string, photoId: string): RenderPlan {
  const design = getDesign(p, look)
  if (!design) return { pending: [], canEdit: false, nothingChosen: true }
  const walls = wallsOnPhoto(p, look, photoId)
  const active = activeVersion(p, look, photoId)
  const pending = active ? pendingChanges(active.selection, design.selection, !!active.wallsRemoved, walls.length > 0) : []
  // Walls and "back to keep existing" can't be edited onto a rendering; they need the original photo
  const canEdit = pending.length > 0 && pending.every((c) => c !== 'walls' && changeIsAddition(design.selection, c))
  return { pending, canEdit, nothingChosen: !hasChanges(design.selection, walls) }
}

/**
 * Render one design option on one photo.
 * `fresh` restyles the original photo; otherwise pending changes are edited onto the current rendering when possible.
 */
export async function renderDesign(p: Project, look: string, photo: PhotoRef, opts: { fresh?: boolean; accessCode?: string } = {}): Promise<string | null> {
  const design = getDesign(p, look)
  if (!design) return 'That design option no longer exists.'
  const walls = wallsOnPhoto(p, look, photo.id)
  const plan = planRender(p, look, photo.id)
  if (plan.nothingChosen) return 'Pick at least one product (or mark a wall) for this option first.'
  const active = activeVersion(p, look, photo.id)
  const common = {
    projectId: p.id,
    look,
    photoId: photo.id,
    aspectRatio: nearestAspectRatio(photo.width, photo.height),
    selection: design.selection,
    wallsRemoved: walls.length > 0,
    accessCode: opts.accessCode,
  }

  if (!opts.fresh && active && plan.canEdit) {
    const source = await getPhotoBlob(active.id)
    if (source) {
      void startRender({
        ...common,
        source,
        prompt: changesPrompt(design.selection, plan.pending, walls),
        label: plan.pending.map((c) => CHANGE_LABELS[c]).join(' + '),
        parentId: active.id,
      })
      return null
    }
  }

  const source = await getPhotoBlob(photo.id)
  if (!source) return 'This photo could not be loaded. Re-add it on the Photos step.'
  void startRender({
    ...common,
    source,
    references: walls.length ? [await annotateWalls(source, walls)] : undefined,
    prompt: fullRenderPrompt(design.selection, p.declutter, walls),
    label: rendersFor(p, look, photo.id).length ? 'Fresh render' : 'Initial render',
  })
  return null
}
