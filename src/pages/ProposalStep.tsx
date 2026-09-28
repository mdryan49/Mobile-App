import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, SamplePricingBadge } from '../components/ui'
import { TIER_LABELS } from '../config/catalog'
import { PROPOSAL } from '../config/proposal'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { calculateEstimate, moneyRange } from '../lib/estimate'
import { activeVersion, availableLooks, lookPricingTier, lookSelection } from '../lib/looks'
import type { ProposalResult } from '../lib/pdf'
import { useSettings } from '../lib/settings'
import type { PricingSettings } from '../config/defaultSettings'
import type { LookKey, Project } from '../types'
import { useProjectContext } from './ProjectLayout'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function ProposalStep() {
  const { project, update } = useProjectContext()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [pdf, setPdf] = useState<(ProposalResult & { url: string; builtAt: number }) | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const looks = availableLooks(project)
  const recommended: LookKey = project.recommended && looks.includes(project.recommended) ? project.recommended : looks.includes('custom') ? 'custom' : 'better'
  const missingRenders = looks.filter((l) => !activeVersion(project, l))
  const sp = settings.salesperson
  const missingSales = !sp.name || !sp.phone || !sp.email
  const stale = pdf && project.updatedAt > pdf.builtAt

  useEffect(() => () => {
    if (pdf) URL.revokeObjectURL(pdf.url)
  }, [pdf])

  if (project.measurements.baseCabinetLf <= 0) {
    return (
      <section>
        <h1 className="text-3xl font-bold">Proposal</h1>
        <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center">
          <p className="text-lg text-neutral-600">Enter measurements first so the proposal can be priced.</p>
          <Button className="mt-4" onClick={() => navigate('../scope', { relative: 'path', replace: true })}>
            Go to measurements
          </Button>
        </div>
      </section>
    )
  }

  async function create() {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const { buildProposalPdf, proposalNumber } = await import('../lib/pdf') // loaded on demand (jsPDF is large)
      // Keep one proposal number per consultation, even when regenerated
      const number = project.proposal?.number ?? proposalNumber(project)
      const result = await buildProposalPdf({ ...project, recommended }, settings, number)
      if (!project.proposal) update((p) => ({ ...p, proposal: { number, createdAt: Date.now() } }))
      setPdf({ ...result, url: URL.createObjectURL(result.blob), builtAt: Date.now() + 1000 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The PDF could not be created.')
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!pdf) return
    const a = document.createElement('a')
    a.href = pdf.url
    a.download = pdf.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function share() {
    if (!pdf) return
    const file = new File([pdf.blob], pdf.filename, { type: 'application/pdf' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${PROPOSAL.title} ${pdf.number}` })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Sharing failed. Try Download instead.')
      }
    } else {
      setNote("This browser can't open the share sheet. The PDF was downloaded instead.")
      download()
    }
  }

  function print() {
    if (!pdf) return
    if (isIOS()) {
      // iPad Safari can't print a PDF from inside a page; open it, then Share → Print
      window.open(pdf.url, '_blank')
      setNote('The PDF opened in a new tab. Tap the Share icon there, then Print.')
      return
    }
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.src = pdf.url
    frame.onload = () => {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
      window.setTimeout(() => frame.remove(), 60_000)
    }
    document.body.appendChild(frame)
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Proposal</h1>
          <p className="mt-1 text-neutral-600">A branded 4-page PDF they keep. Pick the look to feature, then create it.</p>
        </div>
        <SamplePricingBadge />
      </div>

      <div>
        <h2 className="mb-3 text-xl font-bold">Which look do you recommend?</h2>
        <div className={`grid gap-3 ${looks.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
          {looks.map((l) => (
            <RecommendCard key={l} project={project} pricing={settings.pricing} look={l} selected={l === recommended} onClick={() => update((p) => ({ ...p, recommended: l }))} />
          ))}
        </div>
        <p className="mt-2 text-sm text-neutral-500">The recommended look gets the cover page and is listed first.</p>
      </div>

      {(missingSales || missingRenders.length > 0) && (
        <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-amber-900">
          {missingSales && (
            <p>
              <strong>Your contact info is missing.</strong> Add your name, phone and email in{' '}
              <Link to="/settings" className="font-semibold text-accent underline">
                Settings
              </Link>{' '}
              so they print on the proposal.
            </p>
          )}
          {missingRenders.length > 0 && (
            <p>
              <strong>No rendering yet for {missingRenders.map((l) => TIER_LABELS[l]).join(', ')}.</strong> The PDF will show an empty frame there.{' '}
              <Link to="../renderings" relative="path" replace className="font-semibold text-accent underline">
                Render now
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border-2 border-neutral-100 p-6">
        {!pdf ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Create the proposal</h2>
              <p className="text-neutral-600">
                Cover, all options with renderings, investment summary, next steps and signature lines. Valid {PROPOSAL.validDays} days.
              </p>
            </div>
            <Button onClick={create} disabled={busy} className="min-w-48">
              {busy ? 'Creating PDF…' : '📄 Create proposal PDF'}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-13 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">PDF</div>
                <div>
                  <div className="font-bold">{pdf.filename}</div>
                  <div className="text-sm text-neutral-500">
                    Proposal {pdf.number} · 4 pages · {(pdf.blob.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              </div>
              <Button variant="secondary" onClick={create} disabled={busy}>
                {busy ? 'Updating…' : '↻ Recreate'}
              </Button>
            </div>
            {stale && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Something changed since this PDF was made. Tap Recreate to include it.</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              <Button onClick={share} className="min-h-14">
                Share
              </Button>
              <Button variant="secondary" onClick={download} className="min-h-14">
                Download
              </Button>
              <Button variant="secondary" onClick={print} className="min-h-14">
                Print
              </Button>
            </div>
          </div>
        )}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        {note && <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-neutral-800">{note}</p>}
      </div>
    </section>
  )

}

function RecommendCard({ project, pricing, look, selected, onClick }: { project: Project; pricing: PricingSettings; look: LookKey; selected: boolean; onClick: () => void }) {
  const url = usePhotoUrl(activeVersion(project, look)?.id ?? project.heroPhotoId)
  const est = calculateEstimate(project.measurements, lookSelection(project, look), lookPricingTier(project, look), pricing)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border-4 text-left ${selected ? 'border-accent' : 'border-neutral-100 active:border-neutral-200'}`}
    >
      <div className="relative aspect-video bg-neutral-100">
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        {selected && <span className="absolute top-2 left-2 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">★ Recommended</span>}
      </div>
      <div className="p-3">
        <div className="font-bold uppercase">{TIER_LABELS[look]}</div>
        <div className="text-sm font-semibold text-accent">{moneyRange(est.low, est.high)}</div>
      </div>
    </button>
  )
}
