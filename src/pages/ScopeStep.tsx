import { useState } from 'react'
import { WallEditor, newWall } from '../components/WallEditor'
import { Button, ChoiceGroup, Field, NumberInput, Toggle } from '../components/ui'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { money, wallCost, WALL_LABELS } from '../lib/estimate'
import { newId } from '../lib/id'
import { useSettings } from '../lib/settings'
import { applySuggestions, suggestedBacksplashSqft, suggestedCountertopSqft } from '../lib/project'
import type { DemoScope, Layout, Measurements, WallChange } from '../types'
import { useProjectContext } from './ProjectLayout'

const LAYOUTS: { value: Layout; label: string; hint: string }[] = [
  { value: 'l-shape', label: 'L-shape', hint: 'Two walls' },
  { value: 'u-shape', label: 'U-shape', hint: 'Three walls' },
  { value: 'galley', label: 'Galley', hint: 'Two parallel walls' },
  { value: 'single-wall', label: 'Single wall', hint: 'One run' },
]

const DEMO_SCOPES: { value: DemoScope; label: string; hint: string }[] = [
  { value: 'full-gut', label: 'Full gut', hint: 'Down to studs & subfloor' },
  { value: 'cabinets-counters', label: 'Cabinets & counters', hint: 'Replace cabinets, tops, backsplash' },
  { value: 'refresh', label: 'Refresh', hint: 'Keep boxes, refinish, new tops' },
]

export default function ScopeStep() {
  const { project, update } = useProjectContext()
  const m = project.measurements

  const set = (patch: Partial<Measurements>) =>
    update((p) => ({ ...p, measurements: applySuggestions({ ...p.measurements, ...patch }) }))

  const counterSuggestion = suggestedCountertopSqft(m)
  const backsplashSuggestion = suggestedBacksplashSqft(m)

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Measurements & scope</h1>
        <p className="mt-1 text-neutral-600">Rough numbers are fine. The estimate is shown as a range.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Layout</h2>
        <ChoiceGroup options={LAYOUTS} value={m.layout} onChange={(layout) => set({ layout })} />
        <Toggle label="Island" hint="Adds island cabinets and countertop" checked={m.hasIsland} onChange={(hasIsland) => set({ hasIsland })} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Cabinets & surfaces</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Base cabinets" hint="Lower cabinets, not counting the island">
            <NumberInput value={m.baseCabinetLf} onChange={(baseCabinetLf) => set({ baseCabinetLf })} suffix="lin ft" />
          </Field>
          <Field label="Wall cabinets" hint="Upper cabinets">
            <NumberInput value={m.wallCabinetLf} onChange={(wallCabinetLf) => set({ wallCabinetLf })} suffix="lin ft" />
          </Field>
          {m.hasIsland && (
            <>
              <Field label="Island length">
                <NumberInput value={m.islandLengthFt} onChange={(islandLengthFt) => set({ islandLengthFt })} suffix="ft" step={0.5} />
              </Field>
              <Field label="Island width">
                <NumberInput value={m.islandWidthFt} onChange={(islandWidthFt) => set({ islandWidthFt })} suffix="ft" step={0.5} />
              </Field>
            </>
          )}
          <SuggestedField
            label="Countertop"
            value={m.countertopSqft}
            manual={m.countertopManual}
            suggestion={counterSuggestion}
            onChange={(countertopSqft) => set({ countertopSqft, countertopManual: true })}
            onReset={() => set({ countertopManual: false })}
            explain="base cabinets × 26 in. deep + island"
          />
          <SuggestedField
            label="Backsplash"
            value={m.backsplashSqft}
            manual={m.backsplashManual}
            suggestion={backsplashSuggestion}
            onChange={(backsplashSqft) => set({ backsplashSqft, backsplashManual: true })}
            onReset={() => set({ backsplashManual: false })}
            explain="base cabinets × 18 in. high"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Demolition</h2>
        <ChoiceGroup options={DEMO_SCOPES} value={m.demoScope} onChange={(demoScope) => set({ demoScope })} columns={3} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Areas</h2>
        <p className="-mt-2 text-neutral-600">Only priced in design options that include new flooring or paint.</p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Flooring area">
            <NumberInput value={m.flooringSqft} onChange={(flooringSqft) => set({ flooringSqft })} suffix="sq ft" />
          </Field>
          <Field label="Wall paint area" hint="Wall length × height, minus cabinets & windows">
            <NumberInput value={m.paintSqft} onChange={(paintSqft) => set({ paintSqft })} suffix="sq ft" />
          </Field>
        </div>
      </div>

      <WallsSection />

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Additional work</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Move plumbing" hint="Relocate sink or dishwasher" checked={m.movePlumbing} onChange={(movePlumbing) => set({ movePlumbing })} />
          <Toggle label="Electrical updates" hint="New circuits, outlets, code updates" checked={m.electricalUpdates} onChange={(electricalUpdates) => set({ electricalUpdates })} />
          <Toggle label="Permits" hint="Pull permits & schedule inspections" checked={m.permits} onChange={(permits) => set({ permits })} />
        </div>
      </div>
    </section>
  )
}

function SuggestedField({
  label,
  value,
  manual,
  suggestion,
  onChange,
  onReset,
  explain,
}: {
  label: string
  value: number
  manual: boolean
  suggestion: number
  onChange: (n: number) => void
  onReset: () => void
  explain: string
}) {
  return (
    <Field label={`${label} area`}>
      <NumberInput value={value} onChange={onChange} suffix="sq ft" />
      <span className="mt-1 flex min-h-8 flex-wrap items-center gap-2 text-sm text-neutral-500">
        {manual && value !== suggestion ? (
          <>
            Edited. Suggested is {suggestion} sq ft.
            <button type="button" className="font-semibold text-accent" onClick={onReset}>
              Use suggestion
            </button>
          </>
        ) : (
          <>Auto: {explain}. Tap to edit.</>
        )}
      </span>
    </Field>
  )
}

/** Walls to remove: each one is painted on a photo, priced, and sent to the AI. */
function WallsSection() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const [editing, setEditing] = useState<{ wall: WallChange; isNew: boolean } | null>(null)
  const photoOf = (id: string) => project.photos.find((p) => p.id === id)

  const save = (w: WallChange) => {
    update((p) => ({ ...p, walls: p.walls.some((x) => x.id === w.id) ? p.walls.map((x) => (x.id === w.id ? w : x)) : [...p.walls, w] }))
    setEditing(null)
  }
  const remove = (id: string) => {
    update((p) => ({ ...p, walls: p.walls.filter((x) => x.id !== id) }))
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Walls to remove</h2>
        <p className="text-neutral-600">Paint the wall on a photo. It's priced here and opened up in the renderings for options that include it.</p>
      </div>

      {project.walls.length > 0 && (
        <ul className="space-y-3">
          {project.walls.map((w, i) => (
            <WallRow
              key={w.id}
              wall={w}
              index={i}
              photoNumber={project.photos.findIndex((p) => p.id === w.photoId) + 1}
              price={money(wallCost(w, settings.pricing) * (1 + settings.pricing.markupPct / 100))}
              onEdit={() => setEditing({ wall: w, isNew: false })}
            />
          ))}
        </ul>
      )}

      {project.photos.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-neutral-200 p-6 text-center text-neutral-500">Add kitchen photos first, then mark the wall on one.</p>
      ) : (
        <div>
          <div className="mb-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase">Mark a wall on</div>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {project.photos.map((ph, i) => (
              <PhotoButton key={ph.id} photoId={ph.id} label={`Photo ${i + 1}${ph.id === project.heroPhotoId ? ' ★' : ''}`} onClick={() => setEditing({ wall: newWall(newId(), ph.id), isNew: true })} />
            ))}
          </ul>
        </div>
      )}

      {editing && photoOf(editing.wall.photoId) && (
        <WallEditor
          photo={photoOf(editing.wall.photoId)!}
          wall={editing.wall}
          onSave={save}
          onCancel={() => setEditing(null)}
          onDelete={editing.isNew ? undefined : () => remove(editing.wall.id)}
        />
      )}
    </div>
  )
}

function WallRow({ wall, index, photoNumber, price, onEdit }: { wall: WallChange; index: number; photoNumber: number; price: string; onEdit: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-neutral-200 p-4">
      <div>
        <div className="font-semibold">
          Wall {index + 1} · Photo {photoNumber} · {wall.lengthFt || '?'} ft
        </div>
        <div className={`text-sm ${wall.structure === 'non-bearing' ? 'text-neutral-600' : 'text-amber-800'}`}>
          {WALL_LABELS[wall.structure]}
          {wall.structure === 'unknown' ? ' (priced as load-bearing)' : ''} · about {price}
          {wall.note ? ` · "${wall.note}"` : ''}
        </div>
      </div>
      <Button variant="secondary" onClick={onEdit}>
        Edit
      </Button>
    </li>
  )
}

function PhotoButton({ photoId, label, onClick }: { photoId: string; label: string; onClick: () => void }) {
  const url = usePhotoUrl(photoId)
  return (
    <li className="shrink-0">
      <button type="button" onClick={onClick} className="w-36 overflow-hidden rounded-xl border-2 border-neutral-200 text-left active:border-accent">
        <div className="aspect-[4/3] bg-neutral-100">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="px-2 py-1.5 text-sm font-semibold">
          {label} <span className="text-accent">+ Mark wall</span>
        </div>
      </button>
    </li>
  )
}
