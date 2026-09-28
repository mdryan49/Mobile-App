import { emptyProject, putPhoto, saveProject } from './db'
import { compressImage } from './image'
import { newId } from './id'
import type { Project } from '../types'

/**
 * DEMO MODE
 * Drop your own photos into /public/demo as kitchen-1.jpg, kitchen-2.jpg, kitchen-3.jpg
 * and they'll be used automatically. Until then, the illustrated .svg placeholders load.
 * Photo #1 is the hero.
 */
const DEMO_PHOTO_COUNT = 3

async function fetchDemoPhoto(n: number): Promise<Blob> {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'svg']) {
    try {
      const res = await fetch(`/demo/kitchen-${n}.${ext}`)
      const type = res.headers.get('content-type') ?? ''
      // Guard against the SPA fallback returning index.html for missing files
      if (res.ok && type.startsWith('image/')) return await res.blob()
    } catch {
      /* try the next extension */
    }
  }
  throw new Error(`Demo photo ${n} is missing from /public/demo`)
}

export async function createDemoProject(): Promise<Project> {
  const p = emptyProject()
  p.isDemo = true
  p.customer = {
    name: 'Jordan & Casey Sample',
    address: '123 Maple Street, Anytown, USA 00000',
    phone: '(555) 555-0142',
    email: 'jordan.sample@example.com',
    notes:
      'Demo consultation. Homeowners want a brighter kitchen, more counter space, and an island for homework and entertaining. Budget-conscious but open to upgrades.',
  }
  for (let i = 1; i <= DEMO_PHOTO_COUNT; i++) {
    const { blob, width, height } = await compressImage(await fetchDemoPhoto(i))
    const id = newId()
    await putPhoto(p.id, id, blob)
    p.photos.push({ id, width, height, addedAt: Date.now() })
  }
  p.heroPhotoId = p.photos[0]?.id ?? null
  await saveProject(p)
  return p
}
