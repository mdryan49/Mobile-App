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
import { availableLooks, lookSelection, rendersFor } from '../lib/looks'
import { fullRenderPrompt, nearestAspectRatio } from '../lib/prompt'
import { jobKey, startRender, type JobState } from '../lib/renderJobs'
import { useSettings } from '../lib/settings'
import type { LookKey } from '../types'
import { useProjectContext } from './ProjectLayout'

export default function RenderingsStep() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const jobs = useRenderJobs()
  const [look, setLook] = useState<LookKey>('better')
  const [error, setError] = useState<string | null>(null)

  const looks = availableLooks(project)
  const current: LookKey = looks.includes(look) ? look : 'better'
  const hero = project.photos.find((p) => p.id === project.heroPhotoId)
  const heroUrl = usePhotoUrl(hero?.id)
  const activeId = project.activeRender[current]
  const activeUrl = usePhotoUrl(activeId)
  const job = jobs.get(jobKey(project.id, current))

  if (!hero) {
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

  async function render(l: LookKey) {
    setError(null)
    const source = await getPhotoBlob(hero!.id)
    if (!source) {
      setError('The hero photo could not be loaded. Re-add it on the Photos step.')
      return
    }
    const selection = lookSelection(project, l)
    void startRender({
      projectId: project.id,
      look: l,
      source,
      prompt: fullRenderPrompt(selection, project.declutter),
      aspectRatio: nearestAspectRatio(hero!.width, hero!.height),
      selection,
      label: rendersFor(project, l).length ? 'Fresh render' : 'Initial render',
      accessCode: settings.renderAccessCode || undefined,
    })
  }

  const renderAll = () => TIERS.forEach((t) => void render(t))
  const anyRunning = TIERS.some((t) => jobs.get(jobKey(project.id, t))?.status === 'running')
  const versions = rendersFor(project, current)

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Renderings</h1>
          <p className="mt-1 text-neutral-600">Their kitchen, new looks. Each takes about 10–20 seconds.</p>
        </div>
        <Button onClick={renderAll} disabled={anyRunning}>
          ✨ Render all 3 looks
        </Button>
      </div>

      <div className={`mt-6 grid gap-3 ${looks.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`} role="tablist">
        {looks.map((l) => (
          <LookTab
            key={l}
            label={TIER_LABELS[l]}
            active={l === current}
            done={!!project.activeRender[l]}
            job={jobs.get(jobKey(project.id, l))}
            onClick={() => setLook(l)}
          />
        ))}
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {job?.status === 'running' ? (
            <RenderingOverlay imageUrl={activeUrl ?? heroUrl} startedAt={job.startedAt} />
          ) : activeUrl && heroUrl ? (
            <BeforeAfter before={heroUrl} after={activeUrl} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              {heroUrl && <img src={heroUrl} alt="Kitchen before" className="block w-full" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 p-6 text-center">
                <p className="text-xl font-semibold">See their kitchen in the {TIER_LABELS[current]} look</p>
                <Button onClick={() => render(current)}>✨ Render {TIER_LABELS[current]}</Button>
              </div>
            </div>
          )}
          {job?.status === 'error' && <RenderError job={job} projectId={project.id} look={current} />}
          <VersionStrip
            versions={versions}
            activeId={activeId}
            onSelect={(v) =>
              update((p) => ({
                ...p,
                activeRender: { ...p.activeRender, [current]: v.id },
                ...(current === 'custom' && p.custom ? { custom: { ...p.custom, selection: structuredClone(v.selection) } } : {}),
              }))
            }
          />
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border-2 border-neutral-100 p-5">
            <h2 className="mb-4 text-lg font-bold">{TIER_LABELS[current]} look</h2>
            <LookMaterials selection={lookSelection(project, current)} />
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
