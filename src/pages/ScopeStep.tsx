import { ChoiceGroup, Field, NumberInput, Toggle } from '../components/ui'
import { applySuggestions, suggestedBacksplashSqft, suggestedCountertopSqft } from '../lib/project'
import type { DemoScope, Layout, Measurements } from '../types'
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
        <h2 className="text-xl font-bold">Additional work</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Move plumbing" hint="Relocate sink or dishwasher" checked={m.movePlumbing} onChange={(movePlumbing) => set({ movePlumbing })} />
          <Toggle label="Electrical updates" hint="New circuits, outlets, code updates" checked={m.electricalUpdates} onChange={(electricalUpdates) => set({ electricalUpdates })} />
          <Toggle label="New lighting" hint="Recessed, pendants, under-cabinet" checked={m.newLighting} onChange={(newLighting) => set({ newLighting })} />
          <Toggle label="Permits" hint="Pull permits & schedule inspections" checked={m.permits} onChange={(permits) => set({ permits })} />
          <div className="space-y-3">
            <Toggle label="New flooring" checked={m.newFlooring} onChange={(newFlooring) => set({ newFlooring })} />
            {m.newFlooring && (
              <Field label="Flooring area">
                <NumberInput value={m.flooringSqft} onChange={(flooringSqft) => set({ flooringSqft })} suffix="sq ft" />
              </Field>
            )}
          </div>
          <div className="space-y-3">
            <Toggle label="Paint walls" checked={m.paintWalls} onChange={(paintWalls) => set({ paintWalls })} />
            {m.paintWalls && (
              <Field label="Wall area" hint="Wall length × height, minus cabinets & windows">
                <NumberInput value={m.paintSqft} onChange={(paintSqft) => set({ paintSqft })} suffix="sq ft" />
              </Field>
            )}
          </div>
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
