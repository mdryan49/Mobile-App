import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BeforeAfter } from '../components/BeforeAfter'
import { RenderError, RenderingOverlay } from '../components/RenderStatus'
import { Swatch } from '../components/Swatch'
import { Button, ConfirmDialog, SamplePricingBadge } from '../components/ui'
import { VersionStrip } from '../components/VersionStrip'
import {
  BACKSPLASHES,
  CABINET_FINISHES,
  CABINET_LINES,
  COUNTERTOPS,
  DOOR_STYLES,
  FAUCET_FINISH_IDS,
  HARDWARE_FINISH_IDS,
  METAL_FINISHES,
  PAINT_COLORS,
  SINK_FAUCETS,
  TIER_LABELS,
  TIERS,
  type Selection,
  type Swatch as SwatchT,
  type Tier,
} from '../config/catalog'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useRenderJobs } from '../hooks/useRenderJobs'
import { deletePhoto, getPhotoBlob, putPhoto } from '../lib/db'
import { calculateEstimate, money, moneyRange } from '../lib/estimate'
import { newId } from '../lib/id'
import { activeVersion, renderKey, rendersFor, withActive } from '../lib/looks'
import { CHANGE_LABELS, changesPrompt, fullRenderPrompt, nearestAspectRatio, pendingChanges } from '../lib/prompt'
import { jobKey, startRender } from '../lib/renderJobs'
import { useSettings } from '../lib/settings'
import type { Project } from '../types'
import { useProjectContext } from './ProjectLayout'

interface Option {
  id: string
  name: string
  sub?: string
  swatch?: SwatchT
  tier?: Tier
}

interface Category {
  field: keyof Selection
  label: string
  options: Option[]
}

const metal = (ids: string[]): Option[] =>
  METAL_FINISHES.filter((m) => ids.includes(m.id)).map((m) => ({ id: m.id, name: m.name, swatch: m.swatch }))

const CATEGORIES: Category[] = [
  { field: 'cabinetFinishId', label: 'Cabinet color', options: CABINET_FINISHES.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch })) },
  { field: 'doorStyleId', label: 'Door style', options: DOOR_STYLES.map((d) => ({ id: d.id, name: d.name, sub: d.description })) },
  { field: 'cabinetLineId', label: 'Cabinet line', options: CABINET_LINES.map((c) => ({ id: c.id, name: c.name, sub: c.description, tier: c.tier })) },
  { field: 'countertopId', label: 'Countertop', options: COUNTERTOPS.map((c) => ({ id: c.id, name: c.name, sub: `${c.brand} ${c.material.toLowerCase()}`, swatch: c.swatch, tier: c.tier })) },
  { field: 'backsplashId', label: 'Backsplash', options: BACKSPLASHES.map((b) => ({ id: b.id, name: b.name, sub: b.style, swatch: b.swatch, tier: b.tier })) },
  { field: 'hardwareFinishId', label: 'Hardware', options: metal(HARDWARE_FINISH_IDS) },
  { field: 'faucetFinishId', label: 'Faucet finish', options: metal(FAUCET_FINISH_IDS) },
  { field: 'sinkFaucetId', label: 'Sink & faucet', options: SINK_FAUCETS.map((s) => ({ id: s.id, name: `Kohler ${s.name}`, sub: `${s.sink}`, swatch: s.swatch, tier: s.tier })) },
  { field: 'paintId', label: 'Wall paint', options: PAINT_COLORS.map((p) => ({ id: p.id, name: p.name, sub: `${p.brand} ${p.code}`, swatch: p.swatch })) },
]

export default function MixStep() {
  const { project } = useProjectContext()
  return project.custom ? <MixEditor /> : <StartCustom />
}

/** Pick which package the custom mix starts from. */
function StartCustom() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const m = project.measurements

  if (m.baseCabinetLf <= 0) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Mix & match</h1>
        <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-lg text-neutral-600">Enter measurements first so every change can be priced.</p>
          <Button className="mt-4" onClick={() => navigate('../scope', { relative: 'path', replace: true })}>
            Go to measurements
          </Button>
        </div>
      </section>
    )
  }

  async function start(tier: Tier) {
    // Copy this package's current rendering of every photo into the custom mix
    const copies: Project['renders'] = []
    for (const photo of project.photos) {
      const base = activeVersion(project, tier, photo.id)
      const blob = base && (await getPhotoBlob(base.id))
      if (!base || !blob) continue
      const copy = { ...base, id: newId(), look: 'custom' as const, createdAt: Date.now(), label: `Started from ${TIER_LABELS[tier]}`, parentId: base.id }
      await putPhoto(project.id, copy.id, blob)
      copies.push(copy)
    }
    update((p) => ({
      ...p,
      custom: { selection: structuredClone(p.selections[tier]), baseTier: tier },
      renders: [...p.renders, ...copies],
      activeRender: { ...p.activeRender, ...Object.fromEntries(copies.map((c) => [renderKey('custom', c.sourcePhotoId), c.id])) },
    }))
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">Mix & match</h1>
      <p className="mt-1 text-neutral-600">Start from the look they like best, then swap any finish. Prices update instantly.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const est = calculateEstimate(m, project.selections[t], t, settings.pricing)
          return <StartCard key={t} tier={t} renderId={activeVersion(project, t)?.id} range={moneyRange(est.low, est.high)} onStart={() => start(t)} />
        })}
      </div>
    </section>
  )
}

function StartCard({ tier, renderId, range, onStart }: { tier: Tier; renderId?: string; range: string; onStart: () => void }) {
  const url = usePhotoUrl(renderId)
  return (
    <button type="button" onClick={onStart} className="overflow-hidden rounded-2xl border-2 border-neutral-200 text-left active:border-accent">
      <div className="aspect-video bg-neutral-100">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-neutral-400">Not rendered yet</div>}
      </div>
      <div className="p-4">
        <div className="text-xl font-bold uppercase">{TIER_LABELS[tier]}</div>
        <div className="font-semibold text-accent">{range}</div>
        <div className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 font-semibold text-white">Start from {TIER_LABELS[tier]} →</div>
      </div>
    </button>
  )
}

function MixEditor() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const jobs = useRenderJobs()
  const [catIdx, setCatIdx] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const custom = project.custom!
  const sel = custom.selection
  const m = project.measurements
  const pricing = settings.pricing

  const est = calculateEstimate(m, sel, custom.baseTier, pricing)
  const baseEst = calculateEstimate(m, project.selections[custom.baseTier], custom.baseTier, pricing)
  const vsBase = est.total - baseEst.total

  const hero = project.photos.find((p) => p.id === project.heroPhotoId)
  const heroUrl = usePhotoUrl(hero?.id)
  const active = activeVersion(project, 'custom')
  const activeUrl = usePhotoUrl(active?.id)
  const heroId = project.heroPhotoId ?? ''
  const job = jobs.get(jobKey(project.id, 'custom', heroId))
  const pending = active ? pendingChanges(active.selection, sel) : []
  const versions = rendersFor(project, 'custom')
  const cat = CATEGORIES[catIdx]

  // Price difference of every option vs. the current choice, so the salesperson can say "that's +$1,200"
  const deltas = useMemo(() => {
    const out = new Map<string, number>()
    for (const o of cat.options) {
      const alt = calculateEstimate(m, { ...sel, [cat.field]: o.id }, custom.baseTier, pricing)
      out.set(o.id, alt.total - est.total)
    }
    return out
  }, [cat, m, sel, custom.baseTier, pricing, est.total])

  const choose = (field: keyof Selection, id: string) =>
    update((p) => ({ ...p, custom: { ...p.custom!, selection: { ...p.custom!.selection, [field]: id } } }))

  async function rerender() {
    if (!hero) return
    const source = active ? await getPhotoBlob(active.id) : await getPhotoBlob(hero.id)
    if (!source) return
    void startRender({
      projectId: project.id,
      look: 'custom',
      photoId: hero.id,
      source,
      prompt: active ? changesPrompt(sel, pending) : fullRenderPrompt(sel, project.declutter),
      aspectRatio: nearestAspectRatio(active?.width ?? hero.width, active?.height ?? hero.height),
      selection: sel,
      label: active ? pending.map((c) => CHANGE_LABELS[c]).join(' + ') : 'Initial render',
      parentId: active?.id,
      accessCode: settings.renderAccessCode || undefined,
    })
  }

  async function resetCustom() {
    setConfirmReset(false)
    const ids = project.renders.filter((r) => r.look === 'custom').map((r) => r.id)
    update((p) => {
      const activeRender = Object.fromEntries(Object.entries(p.activeRender).filter(([k]) => !k.startsWith('custom@')))
      return { ...p, custom: null, renders: p.renders.filter((r) => r.look !== 'custom'), activeRender }
    })
    await Promise.all(ids.map(deletePhoto))
  }

  const priceOf = (s: Selection) => {
    const e = calculateEstimate(m, s, custom.baseTier, pricing)
    return moneyRange(e.low, e.high)
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Custom Mix</h1>
          <p className="mt-1 text-neutral-600">Started from {TIER_LABELS[custom.baseTier]}. Tap any finish to swap it.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-accent tabular-nums">{moneyRange(est.low, est.high)}</div>
          <div className="text-sm text-neutral-600">
            {vsBase === 0 ? `Same as ${TIER_LABELS[custom.baseTier]}` : `${vsBase > 0 ? '+' : '−'}${money(Math.abs(vsBase))} vs ${TIER_LABELS[custom.baseTier]}`}
          </div>
          <SamplePricingBadge className="mt-2" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {!hero ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-10 text-center text-neutral-500">Add a hero photo to see renderings.</div>
          ) : job?.status === 'running' ? (
            <RenderingOverlay imageUrl={activeUrl ?? heroUrl} startedAt={job.startedAt} />
          ) : activeUrl && heroUrl ? (
            <BeforeAfter before={heroUrl} after={activeUrl} />
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              {heroUrl && <img src={heroUrl} alt="Kitchen before" className="block w-full" />}
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Button onClick={rerender}>✨ Render this mix</Button>
              </div>
            </div>
          )}

          {job?.status === 'error' && <RenderError job={job} projectId={project.id} look="custom" photoId={heroId} />}

          {pending.length > 0 && job?.status !== 'running' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent bg-accent/5 p-4">
              <p>
                <strong>Not in the picture yet:</strong> {pending.map((c) => CHANGE_LABELS[c]).join(', ')}
              </p>
              <Button onClick={rerender}>↻ Re-render {pending.length === 1 ? 'this change' : `${pending.length} changes`}</Button>
            </div>
          )}

          <VersionStrip
            versions={versions}
            activeId={active?.id}
            priceFor={(v) => priceOf(v.selection)}
            onSelect={(v) =>
              update((p) => ({
                ...p,
                activeRender: withActive(p, 'custom', heroId, v.id),
                custom: { ...p.custom!, selection: structuredClone(v.selection) },
              }))
            }
          />

          <div className="mt-6">
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              Start over from a different package
            </Button>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border-2 border-neutral-100">
          <div className="flex gap-2 overflow-x-auto border-b-2 border-neutral-100 p-3">
            {CATEGORIES.map((c, i) => (
              <button
                key={c.field}
                type="button"
                onClick={() => setCatIdx(i)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap ${
                  i === catIdx ? 'bg-accent text-white' : 'bg-neutral-100 text-neutral-700 active:bg-neutral-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 lg:grid-cols-2">
            {cat.options.map((o) => {
              const selected = sel[cat.field] === o.id
              const delta = deltas.get(o.id) ?? 0
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => choose(cat.field, o.id)}
                    className={`flex h-full w-full flex-col rounded-xl border-2 p-2 text-left ${selected ? 'border-accent bg-accent/5' : 'border-neutral-200 active:bg-neutral-50'}`}
                  >
                    {o.swatch && <Swatch swatch={o.swatch} className="mb-2 h-16 w-full" />}
                    <span className="leading-tight font-semibold">{o.name}</span>
                    {o.sub && <span className="text-[13px] leading-snug text-neutral-500">{o.sub}</span>}
                    <span className="mt-auto flex items-center justify-between gap-1 pt-1.5 text-[13px]">
                      {o.tier ? <span className="font-semibold text-neutral-400 uppercase">{TIER_LABELS[o.tier]}</span> : <span />}
                      <span className={`font-semibold tabular-nums ${selected ? 'text-accent' : delta > 0 ? 'text-neutral-700' : delta < 0 ? 'text-green-700' : 'text-neutral-400'}`}>
                        {selected ? '✓ Selected' : delta === 0 ? 'No change' : `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Start the custom mix over?"
        message="This clears the custom mix and its renderings. Good, Better and Best are not affected."
        confirmLabel="Start over"
        danger
        onConfirm={resetCustom}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  )
}
