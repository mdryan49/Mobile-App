import { useEffect, useState } from 'react'
import { setStaffUnlocked } from '../lib/pinLock'
import { useSettings } from '../lib/settings'

export function PinPad({ onUnlock, subtitle = 'Pricing and margins are for staff only.' }: { onUnlock?: () => void; subtitle?: string }) {
  const { settings } = useSettings()
  const pin = settings.pin
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    if (entry.length < pin.length) return
    if (entry === pin) {
      setStaffUnlocked(true)
      onUnlock?.()
      return
    }
    setWrong(true)
    const t = window.setTimeout(() => {
      setEntry('')
      setWrong(false)
    }, 700)
    return () => window.clearTimeout(t)
  }, [entry, pin, onUnlock])

  const press = (d: string) => !wrong && setEntry((e) => (e.length < pin.length ? e + d : e))
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-10">
      <h2 className="text-2xl font-bold">Enter PIN</h2>
      <p className="mt-1 text-center text-neutral-500">{subtitle}</p>
      <div className="my-8 flex gap-4" aria-live="polite">
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

export function PinModal({ open, onClose, onUnlock }: { open: boolean; onClose: () => void; onUnlock: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-3 right-3 h-12 w-12 rounded-full text-2xl text-neutral-500 active:bg-neutral-100" aria-label="Close">
          ×
        </button>
        <PinPad onUnlock={onUnlock} subtitle="Staff view shows every line item." />
      </div>
    </div>
  )
}
