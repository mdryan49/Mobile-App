import type { Selection } from '../config/catalog'
import type { LookKey, Project, RenderVersion } from '../types'
import { getProject, putPhoto, saveProject } from './db'
import { newId } from './id'
import { compressImage } from './image'
import { renderKey } from './looks'

/**
 * Background render queue. Jobs keep running if the salesperson switches
 * screens, and results are saved even if they leave the consultation.
 */

export interface JobState {
  status: 'running' | 'error'
  startedAt: number
  error?: string
  /** Everything needed to retry with one tap */
  request: RenderRequest
}

export interface RenderRequest {
  projectId: string
  look: LookKey
  /** Kitchen photo being restyled (the source may be that photo or an earlier rendering of it) */
  photoId: string
  source: Blob
  /** Extra images sent after the source (e.g. the photo with the wall to remove marked in red) */
  references?: Blob[]
  /** This rendering shows walls removed */
  wallsRemoved?: boolean
  prompt: string
  aspectRatio: string
  selection: Selection
  label: string
  parentId?: string
  accessCode?: string
}

type Updater = (fn: (p: Project) => Project) => void

const jobs = new Map<string, JobState>()
const listeners = new Set<() => void>()
const updaters = new Map<string, Updater>()
let snapshot: ReadonlyMap<string, JobState> = new Map()

const emit = () => {
  snapshot = new Map(jobs)
  listeners.forEach((l) => l())
}

export const jobKey = (projectId: string, look: LookKey, photoId: string) => `${projectId}:${look}:${photoId}`

export function subscribeJobs(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export const getJobsSnapshot = () => snapshot

/** ProjectLayout registers its in-memory updater so results merge with unsaved edits. */
export function registerProjectUpdater(projectId: string, fn: Updater) {
  updaters.set(projectId, fn)
  return () => {
    if (updaters.get(projectId) === fn) updaters.delete(projectId)
  }
}

export function dismissJob(projectId: string, look: LookKey, photoId: string) {
  jobs.delete(jobKey(projectId, look, photoId))
  emit()
}

export async function startRender(req: RenderRequest): Promise<void> {
  const key = jobKey(req.projectId, req.look, req.photoId)
  if (jobs.get(key)?.status === 'running') return
  jobs.set(key, { status: 'running', startedAt: Date.now(), request: req })
  emit()
  try {
    const result = await callRenderApi([req.source, ...(req.references ?? [])], req.prompt, req.aspectRatio, req.accessCode)
    const { blob, width, height } = await compressImage(result, 1600, 0.88)
    const version: RenderVersion = {
      id: newId(),
      look: req.look,
      createdAt: Date.now(),
      selection: structuredClone(req.selection),
      label: req.label,
      sourcePhotoId: req.photoId,
      wallsRemoved: req.wallsRemoved,
      parentId: req.parentId,
      width,
      height,
    }
    await putPhoto(req.projectId, version.id, blob)
    await applyToProject(req.projectId, (p) => ({
      ...p,
      renders: [...p.renders, version],
      activeRender: { ...p.activeRender, [renderKey(req.look, req.photoId)]: version.id },
    }))
    jobs.delete(key)
  } catch (e) {
    jobs.set(key, {
      status: 'error',
      startedAt: Date.now(),
      error: e instanceof Error ? e.message : 'Something went wrong.',
      request: req,
    })
  }
  emit()
}

async function applyToProject(projectId: string, fn: (p: Project) => Project) {
  const live = updaters.get(projectId)
  if (live) return live(fn)
  const p = await getProject(projectId)
  if (p) await saveProject({ ...fn(p), updatedAt: Date.now() })
}

const TIMEOUT_MS = 120_000

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Could not read the photo.'))
    r.readAsDataURL(blob)
  })
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

async function callRenderApi(sources: Blob[], prompt: string, aspectRatio: string, accessCode?: string): Promise<Blob> {
  if (!navigator.onLine) throw new Error("This iPad is offline. Connect to Wi-Fi or a hotspot, then tap Retry.")
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch('/api/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(accessCode ? { 'x-access-code': accessCode } : {}) },
      body: JSON.stringify({
        images: await Promise.all(sources.map(async (b) => ({ data: await blobToBase64(b), mimeType: b.type || 'image/jpeg' }))),
        prompt,
        aspectRatio,
      }),
      signal: ctrl.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('The rendering took too long. Tap Retry.')
    throw new Error('Could not reach the rendering service. Check the connection and tap Retry.')
  } finally {
    window.clearTimeout(timer)
  }

  let data: { image?: string; mimeType?: string; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    // Non-JSON means the platform cut the request off (usually a timeout)
    if (res.status === 404) throw new Error('Rendering only works on the deployed site (the AI service is not running here).')
    throw new Error(
      res.status === 502 || res.status === 504
        ? 'The rendering took longer than the server allows. Tap Retry.'
        : `Rendering failed (error ${res.status}). Tap Retry.`,
    )
  }
  if (!res.ok || !data.image) throw new Error(data.error ?? `Rendering failed (error ${res.status}). Tap Retry.`)
  return base64ToBlob(data.image, data.mimeType ?? 'image/png')
}
