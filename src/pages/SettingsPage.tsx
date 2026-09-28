import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ConfirmDialog, Field, NumberInput, SamplePricingBadge, TextInput } from '../components/ui'
import { TIER_LABELS, TIERS } from '../config/catalog'
import { DEFAULT_SETTINGS, type AppSettings, type PricingSettings } from '../config/defaultSettings'
import { useSettings } from '../lib/settings'

/** Stays unlocked until the app is closed/reloaded or "Lock" is tapped. */
let unlockedThisSession = false

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, loaded } = useSettings()
  const [unlocked, setUnlocked] = useState(unlockedThisSession)

  const lock = () => {
    unlockedThisSession = false
    setUnlocked(false)
  }

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
          <PinPad
            pin={settings.pin}
            onUnlock={() => {
              unlockedThisSession = true
              setUnlocked(true)
            }}
          />
        )}
      </div>
    </div>
  )
}

function PinPad({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    if (entry.length < pin.length) return
    if (entry === pin) onUnlock()
    else {
      setWrong(true)
      const t = window.setTimeout(() => {
        setEntry('')
        setWrong(false)
      }, 700)
      return () => window.clearTimeout(t)
    }
  }, [entry, pin, onUnlock])

  const press = (d: string) => !wrong && setEntry((e) => (e.length < pin.length ? e + d : e))
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-12">
      <h2 className="text-2xl font-bold">Enter PIN</h2>
      <p className="mt-1 text-center text-neutral-500">Pricing and margins are for staff only.</p>
      <div className={`my-8 flex gap-4 ${wrong ? 'animate-pulse' : ''}`} aria-live="polite">
        {Array.from({ length: pin.length }).map((_, i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-2 ${
              wrong ? 'border-red-600 bg-red-600' : i < entry.length ? 'border-accent bg-accent' : 'border-neutral-300'
            }`}
          />
        ))}
      </div>
      {wrong && <p className="-mt-4 mb-4 font-semibold text-red-600">Incorrect PIN</p>}
      <div className="grid w-full grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              aria-label={k === '⌫' ? 'Delete' : k}
              onClick={() => (k === '⌫' ? setEntry((e) => e.slice(0, -1)) : press(k))}
              className="h-18 rounded-2xl bg-neutral-100 text-3xl font-semibold active:bg-neutral-200"
            >
              {k}
            </button>
          ),
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
      { key: 'plumbingReconnect', label: 'Plumbing reconnect', suffix: '$' },
      { key: 'plumbingRelocate', label: 'Plumbing relocate (add)', suffix: '$' },
      { key: 'electricalReconnect', label: 'Electrical reconnect', suffix: '$' },
      { key: 'electricalUpdates', label: 'Electrical updates (add)', suffix: '$' },
      { key: 'paintPerSqft', label: 'Wall paint', suffix: '$/sqft' },
      { key: 'permits', label: 'Permits', suffix: '$' },
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

      {(['flooringPerSqft', 'lighting'] as const).map((key) => (
        <section key={key} className="space-y-4">
          <h3 className="text-xl font-bold">{key === 'flooringPerSqft' ? 'Flooring (installed, per sq ft)' : 'Lighting package'}</h3>
          <div className="grid gap-5 md:grid-cols-3">
            {TIERS.map((t) => (
              <Field key={t} label={TIER_LABELS[t]}>
                <NumberInput
                  value={draft.pricing[key][t]}
                  onChange={(n) => setPricing({ [key]: { ...draft.pricing[key], [t]: n } })}
                  suffix={key === 'flooringPerSqft' ? '$/sqft' : '$'}
                  step={0.1}
                />
              </Field>
            ))}
          </div>
        </section>
      ))}

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
