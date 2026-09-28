import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BeforeAfter } from '../components/BeforeAfter'
import { LookMaterials } from '../components/LookMaterials'
import { RenderError, RenderingOverlay } from '../components/RenderStatus'
import { Button, Toggle } from '../components/ui'
import { VersionStrip } from '../components/VersionStrip'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useRenderJobs } from '../hooks/useRenderJobs'
import { activeVersion, availableLooks, lookName, lookSelection, rendersFor, withActive } from '../lib/looks'
import { CHANGE_LABELS } from '../lib/prompt'
import { planRender, renderDesign, wallsOnPhoto } from '../lib/renderActions'
import { jobKey, type JobState } from '../lib/renderJobs'
import { ConceptBadge } from './DesignStep'
import { useSettings } from '../lib/settings'
import type { LookKey, PhotoRef, Project } from '../types'
import { useProjectContext } from './ProjectLayout'

export default function RenderingsStep() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const jobs = useRenderJobs()
  const [look, setLook] = useState<LookKey | null>(null)
  const [photoSel, setPhotoSel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const looks = availableLooks(project)
  const current: LookKey = look && looks.includes(look) ? look : looks[0]
  // Default to the hero photo; fall back if the chosen photo was removed
  const photo = project.photos.find((p) => p.id === photoSel) ?? project.photos.find((p) => p.id === project.heroPhotoId)
  const photoUrl = usePhotoUrl(photo?.id)
  const active = photo ? activeVersion(project, current, photo.id) : undefined
  const activeUrl = usePhotoUrl(active?.id)
  const job = photo ? jobs.get(jobKey(project.id, current, photo.id)) : undefined
  const selection = lookSelection(project, current)
  const plan = photo ? planRender(project, current, photo.id) : null
  const pending = plan?.pending ?? []

  if (!photo) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Renderings</h1>
        <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-lg text-neutral-600">Add {project.roomName.toLowerCase()} photos and pick a hero photo first.</p>
          <Button className="mt-4" onClick={() => navigate('../photos', { relative: 'path', replace: true })}>
            Go to photos
          </Button>
        </div>
      </section>
    )
  }

  const ph = photo
  const accessCode = settings.renderAccessCode || undefined

  async function render(l: LookKey, fresh = true) {
    setError(await renderDesign(project, l, ph, { fresh, accessCode }))
  }

  const renderable = looks.filter((l) => !planRender(project, l, ph.id).nothingChosen)
  const renderAll = () => renderable.forEach((l) => void render(l))
  const anyRunning = looks.some((l) => jobs.get(jobKey(project.id, l, ph.id))?.status === 'running')
  const wallsHere = wallsOnPhoto(project, current, ph.id)
  const isHero = ph.id === project.heroPhotoId

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Renderings</h1>
          <p className="mt-1 text-neutral-600">Pick a photo, then a design option. Each rendering takes about 10–20 seconds.</p>
        </div>
        {renderable.length > 1 && (
          <Button onClick={renderAll} disabled={anyRunning}>
            ✨ Render all {renderable.length} options{project.photos.length > 1 ? ' of this photo' : ''}
          </Button>
        )}
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

      <div className={`mt-6 grid gap-3 ${looks.length === 1 ? 'grid-cols-1' : looks.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`} role="tablist">
        {looks.map((l) => (
          <LookTab
            key={l}
            label={lookName(project, l)}
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
            <div className="relative">
              <BeforeAfter before={photoUrl} after={activeUrl} />
              {active?.wallsRemoved && <ConceptBadge />}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              {photoUrl && <img src={photoUrl} alt="Kitchen before" className="block w-full" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 p-6 text-center">
                {plan?.nothingChosen ? (
                  <p className="max-w-md text-xl font-semibold">Nothing is picked for {lookName(project, current)} yet. Choose products on the Design step.</p>
                ) : (
                  <>
                    <p className="text-xl font-semibold">
                      See {isHero ? `their ${project.roomType === 'bath' ? 'bathroom' : 'kitchen'}` : 'this view'} as {lookName(project, current)}
                    </p>
                    <Button onClick={() => render(current)}>✨ Render this option</Button>
                  </>
                )}
              </div>
            </div>
          )}
          {job?.status === 'error' && <RenderError job={job} projectId={project.id} look={current} photoId={ph.id} />}

          {pending.length > 0 && job?.status !== 'running' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent bg-accent/5 p-4">
              <p>
                <strong>Not in this picture yet:</strong> {pending.map((c) => CHANGE_LABELS[c]).join(', ')}
                {!plan?.canEdit && <span className="block text-sm text-neutral-600">Needs a fresh render from the photo.</span>}
              </p>
              <Button onClick={() => render(current, !plan?.canEdit)}>↻ Update this picture</Button>
            </div>
          )}

          <VersionStrip
            versions={rendersFor(project, current, ph.id)}
            activeId={active?.id}
            onSelect={(v) =>
              update((p) => ({
                ...p,
                activeRender: withActive(p, current, ph.id, v.id),
                // Picking a version also brings back its products & price
                designs: p.designs.map((d) => (d.id === current ? { ...d, selection: structuredClone(v.selection) } : d)),
              }))
            }
          />
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border-2 border-neutral-100 p-5">
            <h2 className="mb-4 text-lg font-bold">{lookName(project, current)}</h2>
            <LookMaterials selection={selection} room={project.roomType} />
          </div>
          {wallsHere.length > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              This option removes the wall marked on this photo. Renderings are <strong>concept only</strong> until a structural review.
            </p>
          )}
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
