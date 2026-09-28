import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BRAND } from '../config/brand'
import { Button, ConfirmDialog, Logo, TextInput } from '../components/ui'
import { deleteProject, duplicateProject, listProjects, saveProject } from '../lib/db'
import { emptyProject, ROOM_LABELS } from '../lib/project'
import { createDemoProject } from '../lib/demo'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import type { RoomType, StoredProject } from '../types'

export default function HomePage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<StoredProject[] | null>(null)
  const [query, setQuery] = useState('')
  const [toDelete, setToDelete] = useState<StoredProject | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => listProjects().then(setProjects)
  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!projects) return []
    return q ? projects.filter((p) => p.customer.name.toLowerCase().includes(q)) : projects
  }, [projects, query])

  const [choosingType, setChoosingType] = useState(false)

  async function newConsultation(types: RoomType[]) {
    const p = emptyProject(types)
    await saveProject(p)
    navigate(`/project/${p.id}/customer`)
  }

  async function loadDemo() {
    setBusy('demo')
    setError(null)
    try {
      const p = await createDemoProject()
      navigate(`/project/${p.id}/customer`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the demo.')
    } finally {
      setBusy(null)
    }
  }

  async function duplicate(id: string) {
    setBusy(id)
    await duplicateProject(id)
    await refresh()
    setBusy(null)
  }

  async function confirmDelete() {
    if (!toDelete) return
    await deleteProject(toDelete.id)
    setToDelete(null)
    await refresh()
  }

  return (
    <div className="mx-auto min-h-full max-w-5xl px-6 pb-16 safe-top">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <div className="text-2xl leading-tight font-bold">{BRAND.name}</div>
            <div className="text-sm text-neutral-500">{BRAND.tagline} · Consultations</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            Settings
          </Button>
          <Button variant="secondary" onClick={loadDemo} disabled={busy === 'demo'}>
            {busy === 'demo' ? 'Loading…' : 'Demo mode'}
          </Button>
          <Button onClick={() => setChoosingType(true)}>+ New consultation</Button>
        </div>
      </header>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}

      <TextInput
        type="search"
        placeholder="Search by customer name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search consultations"
      />

      <div className="mt-6">
        {projects === null ? (
          <p className="text-neutral-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={projects.length > 0} onNew={() => setChoosingType(true)} onDemo={loadDemo} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                busy={busy === p.id}
                onDuplicate={() => duplicate(p.id)}
                onDelete={() => setToDelete(p)}
              />
            ))}
          </ul>
        )}
      </div>

      {choosingType && <ProjectTypeDialog onChoose={newConsultation} onCancel={() => setChoosingType(false)} />}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete consultation?"
        message={`This permanently removes ${toDelete?.customer.name || 'this consultation'} and all of its photos from this iPad.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function ProjectCard({
  project,
  busy,
  onDuplicate,
  onDelete,
}: {
  project: StoredProject
  busy: boolean
  onDuplicate: () => void
  onDelete: () => void
}) {
  const room = project.rooms.find((r) => r.photos.length) ?? project.rooms[0]
  const thumb = usePhotoUrl(room?.heroPhotoId ?? room?.photos[0]?.id)
  const photoCount = project.rooms.reduce((n, r) => n + r.photos.length, 0)
  const date = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <li className="overflow-hidden rounded-2xl border-2 border-neutral-100 bg-white">
      <Link to={`/project/${project.id}/customer`} className="flex gap-4 p-4 active:bg-neutral-50">
        <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold">{project.customer.name || 'Untitled consultation'}</h3>
            {project.isDemo && (
              <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent uppercase">Demo</span>
            )}
          </div>
          <p className="truncate text-neutral-600">{project.customer.address || 'No address yet'}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {project.rooms.map((r) => ROOM_LABELS[r.type]).join(' + ')} · {photoCount} photo{photoCount === 1 ? '' : 's'} · Updated {date}
          </p>
        </div>
      </Link>
      <div className="flex border-t-2 border-neutral-100">
        <button className="min-h-12 flex-1 font-semibold text-accent active:bg-neutral-50" onClick={onDuplicate} disabled={busy}>
          {busy ? 'Duplicating…' : 'Duplicate'}
        </button>
        <button className="min-h-12 flex-1 border-l-2 border-neutral-100 font-semibold text-red-600 active:bg-neutral-50" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  )
}

function EmptyState({ hasAny, onNew, onDemo }: { hasAny: boolean; onNew: () => void; onDemo: () => void }) {
  if (hasAny) return <p className="py-12 text-center text-neutral-500">No consultations match that name.</p>
  return (
    <div className="rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-16 text-center">
      <h2 className="text-2xl font-bold">No consultations yet</h2>
      <p className="mt-2 text-neutral-600">Start one at the kitchen table, or load the demo to see the full flow.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={onDemo}>
          Load demo
        </Button>
        <Button onClick={onNew}>+ New consultation</Button>
      </div>
    </div>
  )
}

const PROJECT_TYPES: { types: RoomType[]; label: string; icon: string }[] = [
  { types: ['kitchen'], label: 'Kitchen', icon: '🍳' },
  { types: ['bath'], label: 'Bath', icon: '🛁' },
  { types: ['kitchen', 'bath'], label: 'Both', icon: '🍳🛁' },
]

function ProjectTypeDialog({ onChoose, onCancel }: { onChoose: (types: RoomType[]) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="New consultation" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold">What are we remodeling?</h2>
        <p className="mt-1 text-neutral-600">You can add or remove a room later on the Customer step.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {PROJECT_TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => onChoose(t.types)}
              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-neutral-200 text-lg font-bold active:border-accent active:bg-accent/5"
            >
              <span className="text-3xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-5 text-right">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
