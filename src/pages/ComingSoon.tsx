import { SamplePricingBadge } from '../components/ui'

export default function ComingSoon({ title, phase, pricing }: { title: string; phase: number; pricing?: boolean }) {
  return (
    <section>
      <h1 className="text-3xl font-bold">{title}</h1>
      {pricing && <SamplePricingBadge className="mt-3" />}
      <div className="mt-6 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center text-neutral-500">
        Coming in Phase {phase}.
      </div>
    </section>
  )
}
