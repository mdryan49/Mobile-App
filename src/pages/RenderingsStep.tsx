import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BeforeAfter } from '../components/BeforeAfter'
import { LookMaterials } from '../components/LookMaterials'
import { RenderError, RenderingOverlay } from '../components/RenderStatus'
import { Button, Toggle } from '../components/ui'
import { VersionStrip } from '../components/VersionStrip'
import { TIER_LABELS, TIERS } from '../config/catalog'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useRenderJobs } from '../hooks/useRenderJobs'
import { getPhotoBlob } from '../lib/db'
import { activeVersion, availableLooks, lookSelection, rendersFor, withActive } from '../lib/looks'
import { CHANGE_LABELS, changesPrompt, fullRenderPrompt, nearestAspectRatio, pendingChanges } from '../lib/prompt'
import { jobKey, startRender, type JobState } from '../lib/renderJobs'
import { useSettings } from '../lib/settings'
import type { LookKey, PhotoRef, Project } from '../types'
import { useProjectContext } from './ProjectLayout'

export default function RenderingsStep() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const jobs = useRenderJobs()
  const [look, setLook] = useState<LookKey>('better')
  const [photoSel, setPhotoSel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const looks = availableLooks(project)
  const current: LookKey = looks.includes(look) ? look : 'better'
  // Default to the hero photo; fall back if the chosen photo was removed
  const photo = project.photos.find((p) => p.id === photoSel) ?? project.photos.find((p) => p.id === project.heroPhotoId)
  const photoUrl = usePhotoUrl(photo?.id)
  const active = photo ? activeVersion(project, current, photo.id) : undefined
  const activeUrl = usePhotoUrl(active?.id)
  const job = photo ? jobs.get(jobKey(project.id, current, photo.id)) : undefined
  const selection = lookSelection(project, current)
  const pending = active ? pendingChanges(active.selection, selection) : []

  if (!photo) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Renderings</h1>
        <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-lg text-neutral-600">Add kitchen photos and pick a hero photo first.</p>
          <Button className="mt-4" onClick={() => navigate('../photos', { relative: 'path', replace: true })}>
            Go to photos
          </Button>
        </div>
      </section>
    )
  }

  const ph = photo
  const common = (l: LookKey) => ({
    projectId: project.id,
    look: l,
    photoId: ph.id,
    aspectRatio: nearestAspectRatio(ph.width, ph.height),
    selection: lookSelection(project, l),
    accessCode: settings.renderAccessCode || undefined,
  })

  /** Full restyle from the original photo. */
  async function render(l: LookKey) {
    setError(null)
    const source = await getPhotoBlob(ph.id)
    if (!source) return setError('This photo could not be loaded. Re-add it on the Photos step.')
    void startRender({
      ...common(l),
      source,
      prompt: fullRenderPrompt(lookSelection(project, l), project.declutter),
      label: rendersFor(project, l, ph.id).length ? 'Fresh render' : 'Initial render',
    })
  }

  /** Edit the current rendering with only what changed (Custom Mix edits made on another photo). */
  async function applyPending() {
    if (!active) return
    const source = await getPhotoBlob(active.id)
    if (!source) return render(current)
    void startRender({
      ...common(current),
      source,
      prompt: changesPrompt(selection, pending),
      label: pending.map((c) => CHANGE_LABELS[c]).join(' + '),
      parentId: active.id,
    })
  }

  const renderAll = () => TIERS.forEach((t) => void render(t))
  const anyRunning = TIERS.some((t) => jobs.get(jobKey(project.id, t, ph.id))?.status === 'running')
  const isHero = ph.id === project.heroPhotoId

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Renderings</h1>
          <p className="mt-1 text-neutral-600">Pick a photo, then a look. Each rendering takes about 10–20 seconds.</p>
        </div>
        <Button onClick={renderAll} disabled={anyRunning}>
          ✨ Render all 3 looks{project.photos.length > 1 ? ' of this photo' : ''}
        </Button>
      </div>

      {project.photos.length > 1 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase">Photo</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {project.photos.map((p) => (
              <PhotoChoice key={p.id} photo={p} project={project} selected={p.id === ph.id} onClick={() => setPhotoSel(p.id)} />
            ))}
          </ul>
        </div>
      )}

      <div className={`mt-6 grid gap-3 ${looks.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`} role="tablist">
        {looks.map((l) => (
          <LookTab
            key={l}
            label={TIER_LABELS[l]}
            active={l === current}
            done={!!activeVersion(project, l, ph.id)}
            job={jobs.get(jobKey(project.id, l, ph.id))}
            onClick={() => setLook(l)}
          />
        ))}
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {job?.status === 'running' ? (
            <RenderingOverlay imageUrl={activeUrl ?? photoUrl} startedAt={job.startedAt} />
          ) : activeUrl && photoUrl ? (
            <BeforeAfter before={photoUrl} after={activeUrl} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              {photoUrl && <img src={photoUrl} alt="Kitchen before" className="block w-full" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 p-6 text-center">
                <p className="text-xl font-semibold">
                  See {isHero ? 'their kitchen' : 'this view'} in the {TIER_LABELS[current]} look
                </p>
                <Button onClick={() => render(current)}>✨ Render {TIER_LABELS[current]}</Button>
              </div>
            </div>
          )}
          {job?.status === 'error' && <RenderError job={job} projectId={project.id} look={current} photoId={ph.id} />}

          {pending.length > 0 && job?.status !== 'running' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent bg-accent/5 p-4">
              <p>
                <strong>Not in this picture yet:</strong> {pending.map((c) => CHANGE_LABELS[c]).join(', ')}
              </p>
              <Button onClick={applyPending}>↻ Update this picture</Button>
            </div>
          )}

          <VersionStrip
            versions={rendersFor(project, current, ph.id)}
            activeId={active?.id}
            onSelect={(v) =>
              update((p) => ({
                ...p,
                activeRender: withActive(p, current, ph.id, v.id),
                // Custom Mix: picking a version also restores its materials & price
                ...(current === 'custom' && p.custom ? { custom: { ...p.custom, selection: structuredClone(v.selection) } } : {}),
              }))
            }
          />
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border-2 border-neutral-100 p-5">
            <h2 className="mb-4 text-lg font-bold">{TIER_LABELS[current]} look</h2>
            <LookMaterials selection={selection} />
          </div>
          {activeUrl && job?.status !== 'running' && (
            <Button variant="secondary" className="w-full" onClick={() => render(current)}>
              ↻ Fresh render from photo
            </Button>
          )}
          <Toggle
            label="Tidy countertops"
            hint="AI removes clutter from counters"
            checked={project.declutter}
            onChange={(declutter) => update((p) => ({ ...p, declutter }))}
          />
        </aside>
      </div>
    </section>
  )
}

function PhotoChoice({ photo, project, selected, onClick }: { photo: PhotoRef; project: Project; selected: boolean; onClick: () => void }) {
  const url = usePhotoUrl(photo.id)
  const rendered = availableLooks(project).filter((l) => activeVersion(project, l, photo.id)).length
  const isHero = photo.id === project.heroPhotoId
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`relative w-36 overflow-hidden rounded-xl border-4 text-left ${selected ? 'border-accent' : 'border-transparent active:border-neutral-200'}`}
      >
        <div className="aspect-[4/3] bg-neutral-100">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>
        {isHero && <span className="absolute top-1.5 left-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">★ Hero</span>}
        <div className="bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
          {rendered ? `${rendered} look${rendered === 1 ? '' : 's'} rendered` : 'Not rendered'}
        </div>
      </button>
    </li>
  )
}

function LookTab({ label, active, done, job, onClick }: { label: string; active: boolean; done: boolean; job?: JobState; onClick: () => void }) {
  const status = job?.status === 'running' ? 'Rendering…' : job?.status === 'error' ? 'Needs retry' : done ? 'Ready' : 'Not rendered'
  const dot = job?.status === 'running' ? 'bg-amber-400 animate-pulse' : job?.status === 'error' ? 'bg-red-500' : done ? 'bg-green-500' : 'bg-neutral-300'
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-16 rounded-xl border-2 px-4 py-3 text-left ${active ? 'border-accent bg-accent/5' : 'border-neutral-200 active:bg-neutral-50'}`}
    >
      <span className={`block text-lg font-bold uppercase ${active ? 'text-accent' : ''}`}>{label}</span>
      <span className="flex items-center gap-2 text-sm text-neutral-600">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {status}
      </span>
    </button>
  )
}
