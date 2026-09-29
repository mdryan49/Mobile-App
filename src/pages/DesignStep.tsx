import { useMemo, useState } from 'react'
import { BeforeAfter } from '../components/BeforeAfter'
import { RenderError, RenderingOverlay } from '../components/RenderStatus'
import { Swatch } from '../components/Swatch'
import { Button, ConfirmDialog, Field, NumberInput, SamplePricingBadge, TextInput, Toggle } from '../components/ui'
import { VersionStrip } from '../components/VersionStrip'
import {
  BACKSPLASHES,
  CABINET_FINISHES,
  CABINET_LINES,
  COUNTERTOPS,
  DOOR_STYLES,
  FAUCET_FINISH_IDS,
  BATH_FIXTURE_FINISH_IDS,
  BATH_LIGHTING,
  FLOORING,
  HARDWARE_FINISH_IDS,
  LIGHTING,
  offeredIn,
  SHOWER_GLASS,
  SHOWER_SYSTEMS,
  TOILETS,
  VANITIES,
  CABINET_ACCESSORIES,
  DEFAULT_ALLOWANCE,
  METAL_FINISHES,
  PAINT_COLORS,
  SUPPLY_FIELDS,
  type Selection,
  type SupplyChoice,
  type SupplyField,
  SINK_FAUCETS,
  type ProductField,
  type Swatch as SwatchT,
} from '../config/catalog'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { useRenderJobs } from '../hooks/useRenderJobs'
import { deletePhoto } from '../lib/db'
import { estimateFor, money, moneyRange } from '../lib/estimate'
import { activeVersion, lookWalls, rendersFor, withActive } from '../lib/looks'
import { MAX_DESIGNS, newDesign } from '../lib/project'
import { CHANGE_LABELS } from '../lib/prompt'
import { planRender, renderDesign } from '../lib/renderActions'
import { jobKey } from '../lib/renderJobs'
import { useSettings } from '../lib/settings'
import type { Design } from '../types'
import { useProjectContext } from './ProjectLayout'

interface Option {
  id: string
  name: string
  sub?: string
  swatch?: SwatchT
}

interface Category {
  /** 'accessoryIds' is a pick-several list; everything else is pick-one */
  field: ProductField | 'accessoryIds'
  label: string
  /** What "nothing chosen" means for this category */
  keepLabel: string
  keepHint: string
  options: Option[]
  /** Only shown when the kitchen has an island */
  islandOnly?: boolean
}

const isSupplyField = (f: Category['field']): f is SupplyField => (SUPPLY_FIELDS as string[]).includes(f)

const countertopOption = (c: (typeof COUNTERTOPS)[number]): Option => ({ id: c.id, name: c.name, sub: `${c.brand} ${c.material.toLowerCase()} · ${c.supplier}`, swatch: c.swatch })
const tileOption = (b: (typeof BACKSPLASHES)[number]): Option => ({ id: b.id, name: b.name, sub: `${b.style} · ${b.supplier}`, swatch: b.swatch })
const floorOption = (f: (typeof FLOORING)[number]): Option => ({ id: f.id, name: f.name, sub: `${f.brand} · ${f.supplier}`, swatch: f.swatch })

const metal = (ids: string[]): Option[] =>
  METAL_FINISHES.filter((m) => ids.includes(m.id)).map((m) => ({ id: m.id, name: m.name, swatch: m.swatch }))

/** Kitchen pickers, in the order a salesperson walks a kitchen. Only products available for kitchens appear. */
const KITCHEN_CATEGORIES: Category[] = [
  {
    field: 'cabinetLineId', label: 'Cabinets', keepLabel: 'Keep existing cabinets', keepHint: 'No new boxes (pick a color to refinish)',
    options: CABINET_LINES.filter(offeredIn('kitchen')).map((c) => ({ id: c.id, name: `${c.name}`, sub: `${c.description} · ${c.supplier}`, swatch: c.swatch })),
  },
  {
    field: 'doorStyleId', label: 'Door style', keepLabel: 'Keep current style', keepHint: 'Same doors as today',
    options: DOOR_STYLES.map((d) => ({ id: d.id, name: d.name, sub: d.description })),
  },
  {
    field: 'cabinetFinishId', label: 'Cabinet color', keepLabel: 'Keep current color', keepHint: 'No paint or new color',
    options: CABINET_FINISHES.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch })),
  },
  {
    field: 'islandCabinetFinishId', label: 'Island color', keepLabel: 'Same as perimeter', keepHint: 'Island matches the other cabinets', islandOnly: true,
    options: CABINET_FINISHES.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch })),
  },
  {
    field: 'accessoryIds', label: 'Accessories', keepLabel: '', keepHint: '',
    options: CABINET_ACCESSORIES.filter(offeredIn('kitchen')).map((a) => ({ id: a.id, name: a.name, sub: a.description })),
  },
  {
    field: 'countertopId', label: 'Countertop', keepLabel: 'Keep existing', keepHint: 'Current countertops stay',
    options: COUNTERTOPS.filter(offeredIn('kitchen')).map(countertopOption),
  },
  {
    field: 'islandCountertopId', label: 'Island top', keepLabel: 'Same as perimeter', keepHint: 'Island top matches the counters', islandOnly: true,
    options: COUNTERTOPS.filter(offeredIn('kitchen')).map(countertopOption),
  },
  {
    field: 'backsplashId', label: 'Backsplash', keepLabel: 'Keep existing', keepHint: 'Current backsplash stays',
    options: BACKSPLASHES.filter(offeredIn('kitchen')).map(tileOption),
  },
  {
    field: 'sinkFaucetId', label: 'Sink & faucet', keepLabel: 'Keep existing', keepHint: 'Current sink & faucet stay',
    options: SINK_FAUCETS.filter(offeredIn('kitchen')).map((s) => ({ id: s.id, name: `${s.brand} ${s.name}`, sub: `${s.sink} · ${s.supplier}`, swatch: s.swatch })),
  },
  { field: 'faucetFinishId', label: 'Faucet finish', keepLabel: 'Keep current', keepHint: 'Same finish as today', options: metal(FAUCET_FINISH_IDS) },
  { field: 'hardwareFinishId', label: 'Hardware', keepLabel: 'Keep existing', keepHint: 'Current pulls stay', options: metal(HARDWARE_FINISH_IDS) },
  {
    field: 'paintId', label: 'Wall paint', keepLabel: 'No painting', keepHint: 'Walls stay as they are',
    options: PAINT_COLORS.map((p) => ({ id: p.id, name: p.name, sub: `${p.brand} ${p.code}`, swatch: p.swatch })),
  },
  {
    field: 'flooringId', label: 'Flooring', keepLabel: 'Keep existing', keepHint: 'Current floor stays',
    options: FLOORING.filter(offeredIn('kitchen')).map(floorOption),
  },
  {
    field: 'lightingId', label: 'Lighting', keepLabel: 'No new lighting', keepHint: 'Current fixtures stay',
    options: LIGHTING.filter(offeredIn('kitchen')).map((l) => ({ id: l.id, name: l.name, sub: l.description })),
  },
]

/** Bath pickers. Vanity color & door style reuse the cabinet finishes; vanity top reuses countertops; shower walls reuse tile. */
const BATH_CATEGORIES: Category[] = [
  {
    field: 'vanityId', label: 'Vanity', keepLabel: 'Keep existing vanity', keepHint: 'Pick a color to refinish it',
    options: VANITIES.filter(offeredIn('bath')).map((v) => ({ id: v.id, name: v.name, sub: `${v.mount === 'floating' ? 'Floating' : 'Floor-standing'}, ${v.sinks} sink${v.sinks > 1 ? 's' : ''} · ${v.supplier}` })),
  },
  {
    field: 'cabinetFinishId', label: 'Vanity color', keepLabel: 'Keep current color', keepHint: 'No paint or new color',
    options: CABINET_FINISHES.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch })),
  },
  {
    field: 'doorStyleId', label: 'Door style', keepLabel: 'Keep current style', keepHint: 'Same doors as today',
    options: DOOR_STYLES.map((d) => ({ id: d.id, name: d.name, sub: d.description })),
  },
  {
    field: 'countertopId', label: 'Vanity top', keepLabel: 'Keep existing top', keepHint: 'Current top & sink stay',
    options: COUNTERTOPS.filter(offeredIn('bath')).map(countertopOption),
  },
  {
    field: 'showerId', label: 'Shower / tub', keepLabel: 'Keep existing tub/shower', keepHint: 'Pick a tile to re-tile the walls',
    options: SHOWER_SYSTEMS.filter(offeredIn('bath')).map((x) => ({ id: x.id, name: x.name, sub: `${x.tiled ? 'Tiled walls' : 'No tile'}${x.glass ? ' · needs glass' : ''} · ${x.supplier}` })),
  },
  {
    field: 'backsplashId', label: 'Shower tile', keepLabel: 'Keep existing tile', keepHint: 'Tiled showers use a tile allowance until picked',
    options: BACKSPLASHES.filter(offeredIn('bath')).map(tileOption),
  },
  {
    field: 'glassId', label: 'Glass', keepLabel: 'Keep existing / curtain', keepHint: 'No new glass',
    options: SHOWER_GLASS.filter(offeredIn('bath')).map((g) => ({ id: g.id, name: g.name, sub: g.supplier, swatch: g.swatch })),
  },
  {
    field: 'toiletId', label: 'Toilet', keepLabel: 'Keep existing', keepHint: 'Current toilet stays',
    options: TOILETS.filter(offeredIn('bath')).map((t) => ({ id: t.id, name: t.name, sub: `${t.brand} · ${t.supplier}` })),
  },
  { field: 'faucetFinishId', label: 'Fixture finish', keepLabel: 'Keep existing fixtures', keepHint: 'Faucets & trim stay', options: metal(BATH_FIXTURE_FINISH_IDS) },
  { field: 'hardwareFinishId', label: 'Hardware', keepLabel: 'Keep existing', keepHint: 'Current pulls stay', options: metal(HARDWARE_FINISH_IDS) },
  {
    field: 'paintId', label: 'Wall paint', keepLabel: 'No painting', keepHint: 'Walls stay as they are',
    options: PAINT_COLORS.map((p) => ({ id: p.id, name: p.name, sub: `${p.brand} ${p.code}`, swatch: p.swatch })),
  },
  {
    field: 'flooringId', label: 'Flooring', keepLabel: 'Keep existing', keepHint: 'Current floor stays',
    options: FLOORING.filter(offeredIn('bath')).map(floorOption),
  },
  {
    field: 'bathLightId', label: 'Mirror & lighting', keepLabel: 'Keep existing', keepHint: 'Current mirror & lights stay',
    options: BATH_LIGHTING.filter(offeredIn('bath')).map((l) => ({ id: l.id, name: l.name, sub: l.supplier })),
  },
]

export default function DesignStep() {
  const { project, update } = useProjectContext()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Design | null>(null)
  const design = project.designs.find((d) => d.id === selectedId) ?? project.designs[0]

  function addDesign(from?: Design) {
    const d = newDesign(project.designs, from)
    update((p) => ({ ...p, designs: [...p.designs, d] }))
    setSelectedId(d.id)
  }

  async function removeDesign(d: Design) {
    setConfirmDelete(null)
    const ids = project.renders.filter((r) => r.look === d.id).map((r) => r.id)
    update((p) => ({
      ...p,
      designs: p.designs.filter((x) => x.id !== d.id),
      renders: p.renders.filter((r) => r.look !== d.id),
      activeRender: Object.fromEntries(Object.entries(p.activeRender).filter(([k]) => !k.startsWith(`${d.id}@`))),
      recommended: p.recommended === d.id ? null : p.recommended,
    }))
    setSelectedId(null)
    await Promise.all(ids.map(deletePhoto))
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Design options</h1>
          <p className="mt-1 text-neutral-600">Build up to {MAX_DESIGNS} options from your suppliers' products. Anything you don't pick stays as it is.</p>
        </div>
        <SamplePricingBadge />
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {project.designs.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === design.id}
            onClick={() => setSelectedId(d.id)}
            className={`min-h-12 max-w-72 truncate rounded-xl border-2 px-4 font-semibold ${d.id === design.id ? 'border-accent bg-accent text-white' : 'border-neutral-200 active:bg-neutral-50'}`}
          >
            {d.name}
          </button>
        ))}
        {project.designs.length < MAX_DESIGNS && (
          <button type="button" onClick={() => addDesign()} className="min-h-12 rounded-xl border-2 border-dashed border-accent px-4 font-semibold text-accent active:bg-accent/5">
            + Add option
          </button>
        )}
      </div>

      <DesignEditor
        key={design.id}
        design={design}
        canDelete={project.designs.length > 1}
        canDuplicate={project.designs.length < MAX_DESIGNS}
        onDuplicate={() => addDesign(design)}
        onDelete={() => setConfirmDelete(design)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.name}?`}
        message="This removes the option and its renderings. Other options are not affected."
        confirmLabel="Delete option"
        danger
        onConfirm={() => confirmDelete && removeDesign(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </section>
  )
}

function DesignEditor({
  design,
  canDelete,
  canDuplicate,
  onDuplicate,
  onDelete,
}: {
  design: Design
  canDelete: boolean
  canDuplicate: boolean
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const jobs = useRenderJobs()
  const [catIdx, setCatIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const sel = design.selection
  const m = project.measurements
  const pricing = settings.pricing
  const walls = lookWalls(project, design.id)
  const est = estimateFor(project, sel, pricing, walls)

  const hero = project.photos.find((p) => p.id === project.heroPhotoId)
  const heroUrl = usePhotoUrl(hero?.id)
  const active = hero ? activeVersion(project, design.id, hero.id) : undefined
  const activeUrl = usePhotoUrl(active?.id)
  const job = hero ? jobs.get(jobKey(project.id, design.id, hero.id)) : undefined
  const plan = hero ? planRender(project, design.id, hero.id) : null
  const categories = (project.roomType === 'bath' ? BATH_CATEGORIES : KITCHEN_CATEGORIES).filter((c) => !c.islandOnly || m.hasIsland)
  const cat = categories[Math.min(catIdx, categories.length - 1)]
  const multi = cat.field === 'accessoryIds'
  const supply = isSupplyField(cat.field) ? sel.supply?.[cat.field] : undefined

  /** The selection with one option picked (pick-one) or toggled (pick-several). */
  const withOption = (c: Category, id: string | null): Selection => {
    if (c.field === 'accessoryIds') {
      const has = id !== null && sel.accessoryIds.includes(id)
      return { ...sel, accessoryIds: has ? sel.accessoryIds.filter((x) => x !== id) : id ? [...sel.accessoryIds, id] : [] }
    }
    return { ...sel, [c.field]: id }
  }

  // Price difference of every choice vs. the current one, so you can say "that's +$1,200"
  const deltas = useMemo(() => {
    const out = new Map<string | null, number>()
    for (const id of [null, ...cat.options.map((o) => o.id)]) {
      out.set(id, estimateFor(project, withOption(cat, id), pricing, walls).total - est.total)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, m, sel, pricing, walls, est.total])

  const patch = (p: Partial<Design>) => update((pr) => ({ ...pr, designs: pr.designs.map((d) => (d.id === design.id ? { ...d, ...p } : d)) }))
  const choose = (c: Category, id: string | null) => patch({ selection: withOption(c, id) })
  const setSupply = (field: SupplyField, choice: SupplyChoice | null) => {
    const next = { ...sel.supply }
    if (choice) next[field] = choice
    else delete next[field]
    patch({ selection: { ...sel, supply: next } })
  }
  const isChosen = (c: Category) =>
    c.field === 'accessoryIds' ? sel.accessoryIds.length > 0 : !!sel[c.field] || (isSupplyField(c.field) && !!sel.supply?.[c.field])
  const chosenCount = categories.filter(isChosen).length

  async function render(fresh = false) {
    if (!hero) return
    setError(await renderDesign(project, design.id, hero, { fresh, accessCode: settings.renderAccessCode || undefined }))
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-64 flex-1">
          <label className="mb-1 block text-sm font-semibold tracking-wide text-neutral-500 uppercase" htmlFor="design-name">
            Option name
          </label>
          <TextInput id="design-name" value={design.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Option A: Classic White" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-accent tabular-nums">{est.empty ? '-' : moneyRange(est.low, est.high)}</div>
          <div className="text-sm text-neutral-600">
            {chosenCount} of {categories.length} categories chosen
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {canDuplicate && (
          <Button variant="secondary" onClick={onDuplicate}>
            Duplicate option
          </Button>
        )}
        {canDelete && (
          <Button variant="secondary" onClick={onDelete} className="text-red-600">
            Delete option
          </Button>
        )}
      </div>

      {project.walls.length > 0 && (
        <div className="mt-4">
          <Toggle
            label={`Remove the marked wall${project.walls.length === 1 ? '' : 's'} in this option`}
            hint="Adds the wall removal price and opens the wall up in renderings"
            checked={design.removeWalls}
            onChange={(removeWalls) => patch({ removeWalls })}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          {!hero ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-10 text-center text-neutral-500">Add a hero photo to see renderings.</div>
          ) : job?.status === 'running' ? (
            <RenderingOverlay imageUrl={activeUrl ?? heroUrl} startedAt={job.startedAt} />
          ) : activeUrl && heroUrl ? (
            <div className="relative">
              <BeforeAfter before={heroUrl} after={activeUrl} />
              {active?.wallsRemoved && <ConceptBadge />}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              {heroUrl && <img src={heroUrl} alt="Kitchen before" className="block w-full" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 p-6 text-center">
                {plan?.nothingChosen ? (
                  <p className="max-w-sm text-lg font-semibold">Pick products on the right, then render this option in their {project.roomType === 'bath' ? 'bathroom' : 'kitchen'}.</p>
                ) : (
                  <Button onClick={() => render(true)}>✨ Render this option</Button>
                )}
              </div>
            </div>
          )}

          {hero && job?.status === 'error' && <RenderError job={job} projectId={project.id} look={design.id} photoId={hero.id} />}
          {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}

          {plan && plan.pending.length > 0 && job?.status !== 'running' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent bg-accent/5 p-4">
              <p>
                <strong>Not in the picture yet:</strong> {plan.pending.map((c) => CHANGE_LABELS[c]).join(', ')}
                {!plan.canEdit && <span className="block text-sm text-neutral-600">Needs a fresh render from the photo.</span>}
              </p>
              <Button onClick={() => render(!plan.canEdit)}>↻ Update picture</Button>
            </div>
          )}

          {hero && (
            <VersionStrip
              versions={rendersFor(project, design.id, hero.id)}
              activeId={active?.id}
              priceFor={(v) => {
                const e = estimateFor(project, v.selection, pricing, v.wallsRemoved ? project.walls : [])
                return moneyRange(e.low, e.high)
              }}
              onSelect={(v) =>
                update((p) => ({
                  ...p,
                  activeRender: withActive(p, design.id, hero.id, v.id),
                  designs: p.designs.map((d) => (d.id === design.id ? { ...d, selection: structuredClone(v.selection) } : d)),
                }))
              }
            />
          )}
          {activeUrl && job?.status !== 'running' && (
            <Button variant="ghost" className="mt-2" onClick={() => render(true)}>
              ↻ Fresh render from photo
            </Button>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border-2 border-neutral-100">
          <div className="flex gap-2 overflow-x-auto border-b-2 border-neutral-100 p-3">
            {categories.map((c, i) => (
              <button
                key={c.field}
                type="button"
                onClick={() => setCatIdx(i)}
                className={`relative min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap ${
                  i === catIdx ? 'bg-accent text-white' : 'bg-neutral-100 text-neutral-700 active:bg-neutral-200'
                }`}
              >
                {c.label}
                {isChosen(c) && <span className={`ml-1.5 inline-block h-2 w-2 rounded-full align-middle ${i === catIdx ? 'bg-white' : 'bg-accent'}`} />}
              </button>
            ))}
          </div>
          {isSupplyField(cat.field) && <SupplyPicker field={cat.field} value={supply} onChange={(c) => setSupply(cat.field as SupplyField, c)} />}
          {multi && <p className="px-4 pt-3 text-sm text-neutral-600">Tap to add or remove. Pick as many as you like.</p>}
          <ul className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 lg:grid-cols-2">
            {!multi && (
              <li>
                <OptionCard
                  name={supply ? (supply.mode === 'allowance' ? "Client's choice" : 'Customer picks it') : cat.keepLabel}
                  sub={supply ? 'Product not chosen yet' : cat.keepHint}
                  selected={sel[cat.field as ProductField] === null}
                  delta={deltas.get(null) ?? 0}
                  onClick={() => choose(cat, null)}
                  keep
                />
              </li>
            )}
            {cat.options.map((o) => {
              const selected = multi ? sel.accessoryIds.includes(o.id) : sel[cat.field as ProductField] === o.id
              return (
                <li key={o.id}>
                  <OptionCard
                    name={o.name}
                    sub={o.sub}
                    swatch={o.swatch}
                    selected={selected}
                    delta={deltas.get(o.id) ?? 0}
                    onClick={() => choose(cat, o.id)}
                    toggle={multi}
                  />
                </li>
              )
            })}
          </ul>
          {cat.options.length === 0 && <p className="px-4 pb-4 text-sm text-neutral-500">No available products in this category. Add them to the catalog file.</p>}
        </div>
      </div>
    </div>
  )
}

function OptionCard({
  name,
  sub,
  swatch,
  selected,
  delta,
  onClick,
  keep,
  toggle,
}: {
  name: string
  sub?: string
  swatch?: SwatchT
  selected: boolean
  delta: number
  onClick: () => void
  keep?: boolean
  /** Pick-several card: shows the price of adding/removing it */
  toggle?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-full w-full flex-col rounded-xl border-2 p-2 text-left ${selected ? 'border-accent bg-accent/5' : 'border-neutral-200 active:bg-neutral-50'} ${keep ? 'border-dashed' : ''}`}
    >
      {swatch ? <Swatch swatch={swatch} className="mb-2 h-14 w-full" /> : keep ? <span className="mb-2 flex h-14 w-full items-center justify-center rounded-lg bg-neutral-50 text-2xl text-neutral-300">↺</span> : null}
      <span className="leading-tight font-semibold">{name}</span>
      {sub && <span className="text-[13px] leading-snug text-neutral-500">{sub}</span>}
      <span className="mt-auto pt-1.5 text-right text-[13px] font-semibold tabular-nums">
        <span className={selected ? 'text-accent' : delta > 0 ? 'text-neutral-700' : delta < 0 ? 'text-green-700' : 'text-neutral-400'}>
          {selected && !toggle ? '✓ Selected' : delta === 0 ? 'No change' : `${selected ? '✓ Added · ' : ''}${delta > 0 ? '+' : '−'}${money(Math.abs(delta))}`}
        </span>
      </span>
    </button>
  )
}

export function ConceptBadge() {
  return (
    <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-black shadow">
      Concept only: wall removal subject to structural review
    </span>
  )
}

const SUPPLY_MODES: { key: 'we' | 'allowance' | 'owner'; label: string; hint: string }[] = [
  { key: 'we', label: 'We supply', hint: 'Priced from the catalog' },
  { key: 'allowance', label: 'Allowance', hint: 'Set budget, client picks later' },
  { key: 'owner', label: 'Customer supplies', hint: 'We install only' },
]

/** We supply it (default) / allowance budget / customer buys it and we install it. */
function SupplyPicker({ field, value, onChange }: { field: SupplyField; value?: SupplyChoice; onChange: (c: SupplyChoice | null) => void }) {
  const current = value?.mode ?? 'we'
  return (
    <div className="border-b-2 border-neutral-100 p-3">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Who supplies it">
        {SUPPLY_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={current === m.key}
            onClick={() => onChange(m.key === 'we' ? null : m.key === 'owner' ? { mode: 'owner' } : { mode: 'allowance', amount: value?.mode === 'allowance' ? value.amount : DEFAULT_ALLOWANCE[field] })}
            className={`min-h-14 rounded-xl border-2 px-2 py-1.5 text-left ${current === m.key ? 'border-accent bg-accent/5' : 'border-neutral-200 active:bg-neutral-50'}`}
          >
            <span className={`block text-[15px] leading-tight font-semibold ${current === m.key ? 'text-accent' : ''}`}>{m.label}</span>
            <span className="block text-xs leading-snug text-neutral-500">{m.hint}</span>
          </button>
        ))}
      </div>
      {value?.mode === 'allowance' && (
        <div className="mt-3">
          <Field label="Allowance (materials)" hint="Installation is priced separately, as usual">
            <NumberInput value={value.amount} onChange={(amount) => onChange({ mode: 'allowance', amount })} suffix="$" />
          </Field>
        </div>
      )}
    </div>
  )
}
