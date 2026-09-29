import { useState } from 'react'
import { PinPad } from '../components/PinPad'
import { setStaffUnlocked, useStaffUnlocked } from '../lib/pinLock'
import { useNavigate } from 'react-router-dom'
import { Button, ConfirmDialog, Field, Logo, NumberInput, SamplePricingBadge, TextInput } from '../components/ui'
import { DEFAULT_SETTINGS, type AppSettings, type CompanySettings, type PricingSettings } from '../config/defaultSettings'
import { useSettings } from '../lib/settings'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { loaded } = useSettings()
  const unlocked = useStaffUnlocked()
  const lock = () => setStaffUnlocked(false)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b-2 border-neutral-100 px-4 py-3 safe-top">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← Consultations
        </Button>
        <h1 className="text-lg font-bold">Settings</h1>
        {unlocked ? (
          <Button variant="secondary" onClick={lock}>
            🔒 Lock
          </Button>
        ) : (
          <span className="w-24" />
        )}
      </header>
      <div className="flex-1 overflow-y-auto">
        {!loaded ? null : unlocked ? (
          <SettingsForm />
        ) : (
          <PinPad />
        )}
      </div>
    </div>
  )
}

type NumKey = { [K in keyof PricingSettings]: PricingSettings[K] extends number ? K : never }[keyof PricingSettings]

const SECTIONS: { title: string; fields: { key: NumKey; label: string; suffix: string; hint?: string }[] }[] = [
  {
    title: 'Margins & range',
    fields: [
      { key: 'markupPct', label: 'Company markup', suffix: '%', hint: 'Built into every line. Never shown to homeowners.' },
      { key: 'contingencyPct', label: 'Contingency', suffix: '%', hint: 'Shown as its own line' },
      { key: 'rangePct', label: 'Price range', suffix: '± %', hint: 'Totals shown as low–high' },
    ],
  },
  {
    title: 'Demolition',
    fields: [
      { key: 'demoFullGut', label: 'Full gut', suffix: '$' },
      { key: 'demoCabinetsCounters', label: 'Cabinets & counters', suffix: '$' },
      { key: 'demoRefresh', label: 'Refresh', suffix: '$' },
      { key: 'haulAway', label: 'Haul-away / dumpster', suffix: '$' },
    ],
  },
  {
    title: 'Cabinet labor',
    fields: [
      { key: 'cabinetInstallPerLf', label: 'Cabinet install', suffix: '$/lf' },
      { key: 'cabinetRefinishPerLf', label: 'Cabinet refinish (refresh scope)', suffix: '$/lf' },
      { key: 'hardwareInstallEach', label: 'Hardware install', suffix: '$/ea' },
      { key: 'hardwarePerLf', label: 'Pulls per linear foot', suffix: 'ea/lf' },
    ],
  },
  {
    title: 'Tile, fixtures & trades',
    fields: [
      { key: 'tileInstallPerSqft', label: 'Tile install', suffix: '$/sqft' },
      { key: 'sinkFaucetInstall', label: 'Sink & faucet install', suffix: '$' },
      { key: 'flooringInstallPerSqft', label: 'Flooring install only', suffix: '$/sqft', hint: 'Allowance or customer-supplied flooring' },
      { key: 'lightingInstallOnly', label: 'Lighting install only (kitchen)', suffix: '$' },
      { key: 'bathLightInstallOnly', label: 'Mirror & light install only (bath)', suffix: '$' },
      { key: 'plumbingReconnect', label: 'Plumbing reconnect', suffix: '$' },
      { key: 'plumbingRelocate', label: 'Plumbing relocate (add)', suffix: '$' },
      { key: 'electricalReconnect', label: 'Electrical reconnect', suffix: '$' },
      { key: 'electricalUpdates', label: 'Electrical updates (add)', suffix: '$' },
      { key: 'paintPerSqft', label: 'Wall paint', suffix: '$/sqft' },
      { key: 'permits', label: 'Permits', suffix: '$' },
      { key: 'projectFee', label: 'Project fee', suffix: '$', hint: 'Once per consultation' },
    ],
  },
  {
    title: 'Construction',
    fields: [
      { key: 'windowAllowance', label: 'Window allowance (each)', suffix: '$', hint: 'Dual-pane window, client choice' },
      { key: 'windowInstall', label: 'Window install (each)', suffix: '$', hint: 'Nail-fin install, flashing, trim' },
      { key: 'drywallPerSqft', label: 'Drywall & texture', suffix: '$/sqft' },
      { key: 'floorRemovalPerSqft', label: 'Flooring removal', suffix: '$/sqft' },
      { key: 'applianceInstallEach', label: 'Appliance install (each)', suffix: '$', hint: 'Customer-provided or reinstalled' },
    ],
  },
  {
    title: 'Wall removal',
    fields: [
      { key: 'wallNonBearingBase', label: 'Non-load-bearing: per wall', suffix: '$', hint: 'Demo, patch floor & ceiling, drywall' },
      { key: 'wallNonBearingPerLf', label: 'Non-load-bearing: per foot', suffix: '$/lf' },
      { key: 'wallLoadBearingBase', label: 'Load-bearing: per wall', suffix: '$', hint: 'Engineer, permit, temporary shoring' },
      { key: 'wallLoadBearingPerLf', label: 'Load-bearing: per foot', suffix: '$/lf', hint: 'Beam & posts. Unverified walls use this rate.' },
    ],
  },
  {
    title: 'Bath labor',
    fields: [
      { key: 'bathDemoFullGut', label: 'Bath demo: full gut', suffix: '$' },
      { key: 'bathDemoPartial', label: 'Bath demo: partial', suffix: '$' },
      { key: 'bathPlumbingRoughIn', label: 'Bath plumbing rough-in', suffix: '$' },
      { key: 'vanityInstall', label: 'Vanity install', suffix: '$' },
      { key: 'toiletInstall', label: 'Toilet install', suffix: '$' },
      { key: 'showerWaterproofPerSqft', label: 'Shower waterproofing', suffix: '$/sqft' },
      { key: 'bathFixtureTrim', label: 'Faucets, trim & accessories', suffix: '$' },
      { key: 'glassInstall', label: 'Shower glass install', suffix: '$' },
      { key: 'exhaustFan', label: 'Exhaust fan', suffix: '$' },
      { key: 'heatedFloorPerSqft', label: 'Heated floor', suffix: '$/sqft' },
    ],
  },
]

function SettingsForm() {
  const { settings, save } = useSettings()
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [status, setStatus] = useState<'idle' | 'saved'>('idle')
  const [confirmReset, setConfirmReset] = useState(false)
  const [newPin, setNewPin] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const setPricing = (patch: Partial<PricingSettings>) => {
    setStatus('idle')
    setDraft((d) => ({ ...d, pricing: { ...d.pricing, ...patch } }))
  }
  const setSales = (key: keyof AppSettings['salesperson'], value: string) => {
    setStatus('idle')
    setDraft((d) => ({ ...d, salesperson: { ...d.salesperson, [key]: value } }))
  }

  const pinValid = /^\d{4}$/.test(newPin)

  async function onSave() {
    const next = pinValid ? { ...draft, pin: newPin } : draft
    await save(next)
    setDraft(next)
    setNewPin('')
    setStatus('saved')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-6 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Pricing & settings</h2>
          <p className="mt-1 text-neutral-600">Saved on this iPad. Product prices live in the catalog file.</p>
        </div>
        <SamplePricingBadge />
      </div>

      <CompanySection
        company={draft.company}
        onChange={(company) => {
          setStatus('idle')
          setDraft((d) => ({ ...d, company }))
        }}
      />

      <section className="space-y-4">
        <h3 className="text-xl font-bold">Salesperson (printed on proposals)</h3>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Name">
            <TextInput value={draft.salesperson.name} onChange={(e) => setSales('name', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Phone">
            <TextInput type="tel" inputMode="tel" value={draft.salesperson.phone} onChange={(e) => setSales('phone', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Email">
            <TextInput type="email" inputMode="email" autoCapitalize="none" value={draft.salesperson.email} onChange={(e) => setSales('email', e.target.value)} autoComplete="off" />
          </Field>
        </div>
      </section>

      {SECTIONS.map((sec) => (
        <section key={sec.title} className="space-y-4">
          <h3 className="text-xl font-bold">{sec.title}</h3>
          <div className="grid gap-5 md:grid-cols-2">
            {sec.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <NumberInput value={draft.pricing[f.key]} onChange={(n) => setPricing({ [f.key]: n })} suffix={f.suffix} step={0.1} />
              </Field>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <h3 className="text-xl font-bold">AI renderings</h3>
        <div className="max-w-md">
          <Field label="Render access code" hint="Must match RENDER_ACCESS_CODE in Netlify. Keeps strangers from using your AI credits.">
            <TextInput
              value={draft.renderAccessCode}
              onChange={(e) => {
                setStatus('idle')
                setDraft((d) => ({ ...d, renderAccessCode: e.target.value.trim() }))
              }}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold">Change PIN</h3>
        <div className="max-w-xs">
          <Field label="New 4-digit PIN" hint={newPin && !pinValid ? 'Must be exactly 4 digits' : 'Leave blank to keep the current PIN'}>
            <TextInput
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={newPin}
              onChange={(e) => {
                setStatus('idle')
                setNewPin(e.target.value.replace(/\D/g, ''))
              }}
              autoComplete="off"
            />
          </Field>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t-2 border-neutral-100 bg-white px-4 py-3 safe-bottom">
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>
          Reset to defaults
        </Button>
        <span className="text-sm text-neutral-500" aria-live="polite">
          {status === 'saved' && !dirty ? 'Saved' : dirty || pinValid ? 'Unsaved changes' : ''}
        </span>
        <Button onClick={onSave} disabled={!dirty && !pinValid} className="min-w-32">
          Save
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset pricing to defaults?"
        message="All labor rates, markup, contingency and range go back to the sample defaults. Salesperson info and PIN are kept."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          setDraft((d) => ({ ...d, pricing: structuredClone(DEFAULT_SETTINGS.pricing) }))
          setStatus('idle')
          setConfirmReset(false)
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}

const MAX_LOGO_BYTES = 400_000

/** License number and logo: entered here on the iPad, printed on every proposal. */
function CompanySection({ company, onChange }: { company: CompanySettings; onChange: (c: CompanySettings) => void }) {
  const [error, setError] = useState<string | null>(null)

  async function pickLogo(file: File | undefined) {
    setError(null)
    if (!file) return
    try {
      // Shrink to a sensible header size and keep transparency (PNG)
      const url = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('That file is not an image.'))
        i.src = url
      })
      const scale = Math.min(1, 600 / img.naturalWidth, 240 / img.naturalHeight)
      const c = document.createElement('canvas')
      c.width = Math.round(img.naturalWidth * scale)
      c.height = Math.round(img.naturalHeight * scale)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      const dataUrl = c.toDataURL('image/png')
      if (dataUrl.length > MAX_LOGO_BYTES) throw new Error('That logo is too detailed. Try a simpler PNG or JPEG.')
      onChange({ ...company, logoDataUrl: dataUrl })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not use that image.')
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="text-xl font-bold">Company (printed on proposals)</h3>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Contractor license #" hint='e.g. "CSLB #123456". Leave blank to hide.'>
          <TextInput value={company.licenseNumber} onChange={(e) => onChange({ ...company, licenseNumber: e.target.value })} autoComplete="off" />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-semibold tracking-wide text-neutral-600 uppercase">Logo</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-16 min-w-32 items-center justify-center rounded-xl border-2 border-neutral-200 bg-white px-3">
              {company.logoDataUrl ? <img src={company.logoDataUrl} alt="Company logo" className="max-h-12 max-w-48" /> : <span className="flex items-center gap-2 font-bold"><Logo className="h-9 w-9" /> Built-in</span>}
            </div>
            <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-neutral-200 px-4 font-semibold active:bg-neutral-100">
              Upload logo
              <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => void pickLogo(e.target.files?.[0])} />
            </label>
            {company.logoDataUrl && (
              <Button variant="ghost" onClick={() => onChange({ ...company, logoDataUrl: '' })}>
                Use built-in
              </Button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <p className="mt-1 text-sm text-neutral-500">PNG with a transparent background looks best in print.</p>
        </div>
      </div>
    </section>
  )
}
