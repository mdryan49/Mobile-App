import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white active:bg-accent-dark disabled:bg-neutral-300',
  secondary: 'bg-white text-black border-2 border-neutral-200 active:bg-neutral-100 disabled:text-neutral-400',
  ghost: 'bg-transparent text-accent active:bg-accent/10 disabled:text-neutral-400',
  danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-neutral-300',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[17px] font-semibold transition-colors select-none ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold tracking-wide text-neutral-600 uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-neutral-500">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-black placeholder:text-neutral-400 focus:border-accent focus:outline-none'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} min-h-13`} {...props} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} min-h-32 resize-y`} {...props} />
}

export function SamplePricingBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-900 uppercase ${className}`}>
      Sample pricing - for demonstration only
    </span>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-neutral-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="var(--brand-accent)" />
      <path d="M9 21 20 11l11 10v9a1 1 0 0 1-1 1h-6v-7h-8v7h-6a1 1 0 0 1-1-1z" fill="#fff" />
    </svg>
  )
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-left active:bg-neutral-50"
    >
      <span>
        <span className="block text-[17px] font-semibold">{label}</span>
        {hint && <span className="block text-sm text-neutral-500">{hint}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-neutral-300'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </span>
    </button>
  )
}

/** Numeric input that allows an empty field while typing and stores a number. */
export function NumberInput({
  value,
  onChange,
  suffix,
  step = 1,
  ...rest
}: {
  value: number
  onChange: (n: number) => void
  suffix?: string
  step?: number
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        className={`${inputCls} min-h-13 ${suffix ? 'pr-16' : ''}`}
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => {
          const n = parseFloat(e.target.value)
          onChange(Number.isFinite(n) && n >= 0 ? n : 0)
        }}
        {...rest}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neutral-500">{suffix}</span>
      )}
    </div>
  )
}

export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 4,
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T
  onChange: (v: T) => void
  columns?: 2 | 3 | 4
}) {
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' }[columns]
  return (
    <div className={`grid gap-3 ${cols}`} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-16 rounded-xl border-2 px-4 py-3 text-left ${
              active ? 'border-accent bg-accent/5 text-black' : 'border-neutral-200 bg-white active:bg-neutral-50'
            }`}
          >
            <span className={`block text-[17px] font-semibold ${active ? 'text-accent' : ''}`}>{o.label}</span>
            {o.hint && <span className="block text-sm text-neutral-500">{o.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
