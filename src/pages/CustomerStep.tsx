import { Field, TextArea, TextInput } from '../components/ui'
import type { Customer } from '../types'
import { useProjectContext } from './ProjectLayout'

export default function CustomerStep() {
  const { project, update } = useProjectContext()
  const c = project.customer
  const set = (key: keyof Customer) => (e: { target: { value: string } }) =>
    update((p) => ({ ...p, customer: { ...p.customer, [key]: e.target.value } }))

  return (
    <section>
      <h1 className="text-3xl font-bold">Customer info</h1>
      <p className="mt-1 text-neutral-600">Everything saves automatically as you type.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Name">
            <TextInput value={c.name} onChange={set('name')} placeholder="Homeowner name(s)" autoComplete="off" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Address">
            <TextInput value={c.address} onChange={set('address')} placeholder="Street, city, state, ZIP" autoComplete="off" />
          </Field>
        </div>
        <Field label="Phone">
          <TextInput type="tel" inputMode="tel" value={c.phone} onChange={set('phone')} placeholder="(555) 555-5555" autoComplete="off" />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            inputMode="email"
            autoCapitalize="none"
            value={c.email}
            onChange={set('email')}
            placeholder="name@email.com"
            autoComplete="off"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes">
            <TextArea value={c.notes} onChange={set('notes')} placeholder="Goals, must-haves, budget, timeline, how they use the kitchen…" />
          </Field>
        </div>
      </div>
    </section>
  )
}
