import { useMemo, useState } from 'react'
import { PinModal } from '../components/PinPad'
import { useStaffUnlocked } from '../lib/pinLock'
import { useNavigate } from 'react-router-dom'
import { Swatch } from '../components/Swatch'
import { Button, SamplePricingBadge } from '../components/ui'
import { TIER_LABELS, TIERS, resolveSelection, type Tier } from '../config/catalog'
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

  const estimates = useMemo(
    () =>
      Object.fromEntries(
        TIERS.map((t) => [t, calculateEstimate(m, project.selections[t], t, settings.pricing)]),
      ) as Record<Tier, Estimate>,
    [m, project.selections, settings.pricing],
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
  const lineKeys = estimates.good.lines.map((l) => l.key)
  const amountOf = (t: Tier, k: LineKey) => estimates[t].lines.find((l) => l.key === k)
  const groups = Object.fromEntries(TIERS.map((t) => [t, groupEstimate(estimates[t], project.selections[t])])) as Record<Tier, EstimateGroup[]>
  const groupKeys = GROUPS.map((g) => g.key).filter((k) => groups.good.some((g) => g.key === k))
  const groupOf = (t: Tier, k: GroupKey) => groups[t].find((g) => g.key === k)

  const rows: { key: string; label: string; cell: (t: Tier) => { amount: number; detail: string } | undefined }[] = detailed
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
          <p className="mt-1 text-neutral-600">Three ways to get the kitchen you want. Final price confirmed after a site measure.</p>
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
            <col className="w-[28%]" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th className="p-4 align-bottom text-sm font-semibold text-neutral-500 uppercase">Package</th>
              {TIERS.map((t) => (
                <th key={t} className={`p-4 align-top ${t === 'better' ? 'bg-accent/5' : ''}`}>
                  <TierHeader tier={t} estimate={estimates[t]} selection={project.selections[t]} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-neutral-100">
                <td className="p-4 align-top font-semibold">{row.label}</td>
                {TIERS.map((t) => {
                  const line = row.cell(t)
                  return (
                    <td key={t} className={`p-4 align-top ${t === 'better' ? 'bg-accent/5' : ''}`}>
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
              {TIERS.map((t) => (
                <td key={t} className={`p-4 ${t === 'better' ? 'bg-accent/5' : ''}`}>
                  <div className="text-xl leading-tight font-bold text-accent tabular-nums">
                    {moneyRange(estimates[t].low, estimates[t].high)}
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

function TierHeader({ tier, estimate, selection }: { tier: Tier; estimate: Estimate; selection: Parameters<typeof resolveSelection>[0] }) {
  const r = resolveSelection(selection)
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-wide uppercase">{TIER_LABELS[tier]}</span>
        {tier === 'better' && <span className="rounded bg-accent px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white uppercase">Most popular</span>}
      </div>
      <div className="mt-2 flex gap-1.5">
        <Swatch swatch={r.cabinetFinish.swatch} className="h-8 w-8" />
        <Swatch swatch={r.countertop.swatch} className="h-8 w-8" />
        <Swatch swatch={r.backsplash.swatch} className="h-8 w-8" />
        <Swatch swatch={r.hardwareFinish.swatch} className="h-8 w-8" />
      </div>
      <div className="mt-2 text-[13px] leading-snug font-normal text-neutral-600">
        {r.cabinetLine.name} {r.doorStyle.name.toLowerCase()} in {r.cabinetFinish.name.toLowerCase()}, {r.countertop.brand}{' '}
        {r.countertop.name}
      </div>
      <div className="mt-2 text-lg font-bold text-accent tabular-nums">{moneyRange(estimate.low, estimate.high)}</div>
    </div>
  )
}
