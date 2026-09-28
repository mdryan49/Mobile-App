import { useMemo, useState } from 'react'
import { PinModal } from '../components/PinPad'
import { useStaffUnlocked } from '../lib/pinLock'
import { useNavigate } from 'react-router-dom'
import { Swatch } from '../components/Swatch'
import { Button, SamplePricingBadge } from '../components/ui'
import type { Selection } from '../config/catalog'
import { availableLooks, lookName, lookSelection, lookWalls } from '../lib/looks'
import { materialRows } from '../lib/materials'
import type { LookKey } from '../types'
import { calculateEstimate, groupEstimate, GROUPS, LINE_LABELS, money, moneyRange, type Estimate, type EstimateGroup, type GroupKey, type LineKey } from '../lib/estimate'
import { useSettings } from '../lib/settings'
import { useProjectContext } from './ProjectLayout'

export default function EstimateStep() {
  const { project } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const staffUnlocked = useStaffUnlocked()
  const [staffView, setStaffView] = useState(false)
  const [askPin, setAskPin] = useState(false)
  const m = project.measurements

  const looks = availableLooks(project)
  const estimates = useMemo(
    () =>
      Object.fromEntries(
        availableLooks(project).map((l) => [l, calculateEstimate(m, lookSelection(project, l), settings.pricing, lookWalls(project, l))]),
      ) as Record<LookKey, Estimate>,
    [project, m, settings.pricing],
  )

  if (m.baseCabinetLf <= 0) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Estimate</h1>
        <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-lg text-neutral-600">Enter the cabinet measurements to see pricing.</p>
          <Button className="mt-4" onClick={() => navigate('../scope', { relative: 'path', replace: true })}>
            Go to measurements
          </Button>
        </div>
      </section>
    )
  }

  const detailed = staffView && staffUnlocked
  // Every line/category that appears in any option, in standard order
  const lineKeys = (Object.keys(LINE_LABELS) as LineKey[]).filter((k) => looks.some((t) => estimates[t].lines.some((l) => l.key === k)))
  const amountOf = (t: LookKey, k: LineKey) => estimates[t].lines.find((l) => l.key === k)
  const groups = Object.fromEntries(looks.map((t) => [t, groupEstimate(estimates[t], lookSelection(project, t))])) as Record<LookKey, EstimateGroup[]>
  const groupKeys = GROUPS.map((g) => g.key).filter((k) => looks.some((t) => groups[t].some((g) => g.key === k)))
  const highlight = (t: LookKey) => (t === project.recommended ? 'bg-accent/5' : '')
  const groupOf = (t: LookKey, k: GroupKey) => groups[t].find((g) => g.key === k)

  const rows: { key: string; label: string; cell: (t: LookKey) => { amount: number; detail: string } | undefined }[] = detailed
    ? lineKeys.map((k) => ({ key: k, label: LINE_LABELS[k], cell: (t) => amountOf(t, k) }))
    : groupKeys.map((k) => ({ key: k, label: GROUPS.find((g) => g.key === k)!.label, cell: (t) => groupOf(t, k) }))

  function toggleStaff() {
    if (staffView) setStaffView(false)
    else if (staffUnlocked) setStaffView(true)
    else setAskPin(true)
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your estimate</h1>
          <p className="mt-1 text-neutral-600">
            {looks.length === 1 ? 'Your design option, priced.' : `${looks.length} design options, side by side.`} Final price confirmed after a site measure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SamplePricingBadge />
          <Button variant="secondary" onClick={toggleStaff} className="min-h-11 text-[15px]">
            {detailed ? 'Homeowner view' : '🔒 Staff detail'}
          </Button>
        </div>
      </div>
      {detailed && (
        <div className="mt-4 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white">
          Staff detail: every line item. Tap <strong>Homeowner view</strong> before showing the customer.
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border-2 border-neutral-100">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className={looks.length === 1 ? 'w-[40%]' : 'w-[28%]'} />
            {looks.map((t) => (
              <col key={t} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="p-4 align-bottom text-sm font-semibold text-neutral-500 uppercase">Option</th>
              {looks.map((t) => (
                <th key={t} className={`p-4 align-top ${highlight(t)}`}>
                  <OptionHeader
                    name={lookName(project, t)}
                    recommended={t === project.recommended}
                    estimate={estimates[t]}
                    selection={lookSelection(project, t)}
                    onEdit={() => navigate('../design', { relative: 'path', replace: true })}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-neutral-100">
                <td className="p-4 align-top font-semibold">{row.label}</td>
                {looks.map((t) => {
                  const line = row.cell(t)
                  return (
                    <td key={t} className={`p-4 align-top ${highlight(t)}`}>
                      <div className="text-[17px] font-semibold tabular-nums">{line ? money(line.amount) : '—'}</div>
                      {line?.detail && <div className="mt-0.5 text-[13px] leading-snug text-neutral-500">{line.detail}</div>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td className="p-4 text-lg font-bold">Estimated investment</td>
              {looks.map((t) => (
                <td key={t} className={`p-4 ${highlight(t)}`}>
                  <div className="text-xl leading-tight font-bold text-accent tabular-nums">
                    {estimates[t].empty ? '-' : moneyRange(estimates[t].low, estimates[t].high)}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-sm text-neutral-500">
        Ranges are ±{settings.pricing.rangePct}%. Line items are shown for comparison and include all labor, materials and
        project management.
      </p>
      <PinModal
        open={askPin}
        onClose={() => setAskPin(false)}
        onUnlock={() => {
          setAskPin(false)
          setStaffView(true)
        }}
      />
    </section>
  )
}

function OptionHeader({
  name,
  recommended,
  estimate,
  selection,
  onEdit,
}: {
  name: string
  recommended: boolean
  estimate: Estimate
  selection: Selection
  onEdit: () => void
}) {
  const chosen = materialRows(selection, { hideKept: true })
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xl leading-tight font-bold">{name}</span>
        {recommended && <span className="rounded bg-accent px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white uppercase">Recommended</span>}
      </div>
      {chosen.length === 0 ? (
        <button type="button" onClick={onEdit} className="mt-2 text-left text-[15px] font-semibold text-accent">
          Nothing picked yet. Choose products →
        </button>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chosen.filter((r) => r.swatch).slice(0, 6).map((r) => (
              <Swatch key={r.label} swatch={r.swatch!} className="h-7 w-7" />
            ))}
          </div>
          <div className="mt-2 text-[13px] leading-snug font-normal text-neutral-600">
            {chosen.slice(0, 2).map((r) => r.text).join('; ')}
            {chosen.length > 2 ? ` + ${chosen.length - 2} more` : ''}
          </div>
          <div className="mt-2 text-lg font-bold text-accent tabular-nums">{moneyRange(estimate.low, estimate.high)}</div>
        </>
      )}
    </div>
  )
}
