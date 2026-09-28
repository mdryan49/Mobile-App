import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Project, StoredPhoto } from '../types'
import { newId } from './id'
import { normalizeProject } from './project'

interface ConsultDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: number } }
  photos: { key: string; value: StoredPhoto; indexes: { projectId: string } }
  settings: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<ConsultDB>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<ConsultDB>('kitchen-consult', 1, {
      upgrade(d) {
        const projects = d.createObjectStore('projects', { keyPath: 'id' })
        projects.createIndex('updatedAt', 'updatedAt')
        const photos = d.createObjectStore('photos', { keyPath: 'id' })
        photos.createIndex('projectId', 'projectId')
        d.createObjectStore('settings')
      },
    })
  }
  return dbPromise
}

/** Ask the browser not to evict our data (important on iPad Safari). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

// ---------- Projects ----------

export async function listProjects(): Promise<Project[]> {
  const all = (await (await db()).getAll('projects')).map(normalizeProject)
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<Project | undefined> {
  const p = await (await db()).get('projects', id)
  return p && normalizeProject(p)
}

export async function saveProject(p: Project): Promise<void> {
  await (await db()).put('projects', p)
}

export async function deleteProject(id: string): Promise<void> {
  const d = await db()
  const tx = d.transaction(['projects', 'photos'], 'readwrite')
  const photoKeys = await tx.objectStore('photos').index('projectId').getAllKeys(id)
  await Promise.all([
    ...photoKeys.map((k) => tx.objectStore('photos').delete(k)),
    tx.objectStore('projects').delete(id),
  ])
  await tx.done
}

/** Deep copy of a project, including its photo blobs, under new IDs. */
export async function duplicateProject(id: string): Promise<Project | undefined> {
  const d = await db()
  const src = await d.get('projects', id)
  if (!src) return undefined
  const now = Date.now()
  const copy: Project = structuredClone(src)
  copy.id = newId()
  copy.createdAt = now
  copy.updatedAt = now
  copy.isDemo = false
  copy.customer.name = `${src.customer.name || 'Untitled'} (copy)`

  const idMap = new Map<string, string>()
  copy.photos = src.photos.map((ph) => {
    const nid = newId()
    idMap.set(ph.id, nid)
    return { ...ph, id: nid }
  })
  copy.heroPhotoId = src.heroPhotoId ? idMap.get(src.heroPhotoId) ?? null : null

  const tx = d.transaction(['projects', 'photos'], 'readwrite')
  for (const [oldId, nid] of idMap) {
    const photo = await tx.objectStore('photos').get(oldId)
    if (photo) await tx.objectStore('photos').put({ id: nid, projectId: copy.id, blob: photo.blob })
  }
  await tx.objectStore('projects').put(copy)
  await tx.done
  return copy
}

// ---------- Photos ----------

export async function putPhoto(projectId: string, id: string, blob: Blob): Promise<void> {
  await (await db()).put('photos', { id, projectId, blob })
}

export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  return (await (await db()).get('photos', id))?.blob
}

export async function deletePhoto(id: string): Promise<void> {
  await (await db()).delete('photos', id)
}

// ---------- Settings (key/value) ----------

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('settings', key)) as T | undefined
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await (await db()).put('settings', value, key)
}
