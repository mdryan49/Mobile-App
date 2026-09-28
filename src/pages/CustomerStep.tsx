import { useState } from 'react'
import { ConfirmDialog, Field, TextArea, TextInput } from '../components/ui'
import { deletePhoto } from '../lib/db'
import { newRoom, ROOM_LABELS } from '../lib/project'
import type { RoomType } from '../types'
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
          <RoomsPicker />
        </div>
        <div className="md:col-span-2">
          <Field label="Notes">
            <TextArea value={c.notes} onChange={set('notes')} placeholder="Goals, must-haves, budget, timeline, how they use the kitchen…" />
          </Field>
        </div>
      </div>
    </section>
  )
}

/** Kitchen, bath or both. Removing a room that has work in it asks first. */
function RoomsPicker() {
  const { stored, updateStored } = useProjectContext()
  const [confirmRemove, setConfirmRemove] = useState<RoomType | null>(null)
  const has = (t: RoomType) => stored.rooms.some((r) => r.type === t)

  function toggle(t: RoomType) {
    if (!has(t)) return updateStored((s) => ({ ...s, rooms: [...s.rooms, newRoom(t)].sort((a, b) => (a.type === 'kitchen' ? -1 : b.type === 'kitchen' ? 1 : 0)) }))
    if (stored.rooms.length === 1) return // a consultation needs at least one room
    const room = stored.rooms.find((r) => r.type === t)!
    if (room.photos.length || room.renders.length) setConfirmRemove(t)
    else remove(t)
  }

  async function remove(t: RoomType) {
    setConfirmRemove(null)
    const room = stored.rooms.find((r) => r.type === t)
    updateStored((s) => ({ ...s, rooms: s.rooms.filter((r) => r.type !== t) }))
    if (room) await Promise.all([...room.photos.map((p) => p.id), ...room.renders.map((r) => r.id)].map(deletePhoto))
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold tracking-wide text-neutral-600 uppercase">Remodeling</span>
      <div className="flex flex-wrap gap-3">
        {(['kitchen', 'bath'] as RoomType[]).map((t) => {
          const on = has(t)
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t)}
              disabled={on && stored.rooms.length === 1}
              className={`flex min-h-14 min-w-40 items-center gap-3 rounded-xl border-2 px-4 text-lg font-semibold ${on ? 'border-accent bg-accent/5 text-accent' : 'border-neutral-200 text-neutral-600'} disabled:opacity-100`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded border-2 text-sm ${on ? 'border-accent bg-accent text-white' : 'border-neutral-300'}`}>{on ? '✓' : ''}</span>
              {t === 'kitchen' ? '🍳' : '🛁'} {ROOM_LABELS[t]}
            </button>
          )
        })}
      </div>
      <ConfirmDialog
        open={!!confirmRemove}
        title={`Remove the ${confirmRemove ? ROOM_LABELS[confirmRemove].toLowerCase() : ''}?`}
        message="Its photos, design options and renderings will be deleted from this consultation."
        confirmLabel="Remove"
        danger
        onConfirm={() => confirmRemove && remove(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  )
}
