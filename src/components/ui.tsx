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
