import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BeforeAfter } from '../components/BeforeAfter'
import { LookMaterials } from '../components/LookMaterials'
import { Button, Toggle } from '../components/ui'
import { TIER_LABELS, TIERS, type Tier } from '../config/catalog'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useRenderJobs } from '../hooks/useRenderJobs'
import { getPhotoBlob } from '../lib/db'
import { fullRenderPrompt, nearestAspectRatio } from '../lib/prompt'
import { dismissJob, jobKey, startRender, type JobState } from '../lib/renderJobs'
import { useSettings } from '../lib/settings'
import { useProjectContext } from './ProjectLayout'

export default function RenderingsStep() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const jobs = useRenderJobs()
  const [look, setLook] = useState<Tier>('better')
  const [error, setError] = useState<string | null>(null)

  const hero = project.photos.find((p) => p.id === project.heroPhotoId)
  const heroUrl = usePhotoUrl(hero?.id)
  const activeId = project.activeRender[look]
  const activeUrl = usePhotoUrl(activeId)
  const job = jobs.get(jobKey(project.id, look))

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

  async function render(tier: Tier) {
    setError(null)
    const source = await getPhotoBlob(hero!.id)
    if (!source) {
      setError('The hero photo could not be loaded. Re-add it on the Photos step.')
      return
    }
    const hasRender = project.renders.some((r) => r.look === tier)
    void startRender({
      projectId: project.id,
      look: tier,
      source,
      prompt: fullRenderPrompt(project.selections[tier], project.declutter),
      aspectRatio: nearestAspectRatio(hero!.width, hero!.height),
      selection: project.selections[tier],
      label: hasRender ? 'Re-render' : 'Initial render',
      accessCode: settings.renderAccessCode || undefined,
    })
  }

  const renderAll = () => TIERS.forEach((t) => void render(t))
  const anyRunning = TIERS.some((t) => jobs.get(jobKey(project.id, t))?.status === 'running')

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Renderings</h1>
          <p className="mt-1 text-neutral-600">Their kitchen, three new looks. Each takes about 10–20 seconds.</p>
        </div>
        <Button onClick={renderAll} disabled={anyRunning}>
          ✨ Render all 3 looks
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3" role="tablist">
        {TIERS.map((t) => (
          <LookTab
            key={t}
            tier={t}
            active={t === look}
            done={!!project.activeRender[t]}
            job={jobs.get(jobKey(project.id, t))}
            onClick={() => setLook(t)}
          />
        ))}
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {job?.status === 'running' ? (
            <Rendering heroUrl={heroUrl} startedAt={job.startedAt} />
          ) : activeUrl && heroUrl ? (
            <BeforeAfter before={heroUrl} after={activeUrl} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              {heroUrl && <img src={heroUrl} alt="Kitchen before" className="block w-full" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 p-6 text-center">
                <p className="text-xl font-semibold">See their kitchen in the {TIER_LABELS[look]} look</p>
                <Button onClick={() => render(look)}>✨ Render {TIER_LABELS[look]}</Button>
              </div>
            </div>
          )}

          {job?.status === 'error' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="text-red-800">
                <strong>Rendering didn't finish.</strong> {job.error} Nothing was lost.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => dismissJob(project.id, look)}>
                  Dismiss
                </Button>
                <Button onClick={() => void startRender(job.request)}>Retry</Button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border-2 border-neutral-100 p-5">
            <h2 className="mb-4 text-lg font-bold">{TIER_LABELS[look]} look</h2>
            <LookMaterials selection={project.selections[look]} />
          </div>
          {activeUrl && job?.status !== 'running' && (
            <Button variant="secondary" className="w-full" onClick={() => render(look)}>
              ↻ Re-render {TIER_LABELS[look]}
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

function LookTab({ tier, active, done, job, onClick }: { tier: Tier; active: boolean; done: boolean; job?: JobState; onClick: () => void }) {
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
      <span className={`block text-lg font-bold uppercase ${active ? 'text-accent' : ''}`}>{TIER_LABELS[tier]}</span>
      <span className="flex items-center gap-2 text-sm text-neutral-600">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {status}
      </span>
    </button>
  )
}

function Rendering({ heroUrl, startedAt }: { heroUrl: string | null; startedAt: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [])
  const secs = Math.floor((now - startedAt) / 1000)
  const msg = secs < 8 ? 'Studying the room…' : secs < 16 ? 'Installing new finishes…' : secs < 30 ? 'Adding final details…' : 'Almost there. Hang tight…'
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {heroUrl && <img src={heroUrl} alt="" className="block w-full blur-sm brightness-90" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/40">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white border-t-accent" />
        <p className="rounded-full bg-white/90 px-5 py-2 text-lg font-semibold">{msg}</p>
        <p className="rounded-full bg-white/80 px-3 py-1 text-sm tabular-nums">{secs}s</p>
      </div>
    </div>
  )
}
