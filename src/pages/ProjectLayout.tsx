import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Button, Logo } from '../components/ui'
import { STEPS } from '../config/steps'
import { useProject } from '../hooks/useProject'
import { scopeToRoom, updateRoom } from '../lib/project'
import { registerProjectUpdater } from '../lib/renderJobs'
import type { Project, StoredProject } from '../types'

export interface ProjectContext {
  /** The consultation seen from the room being worked on */
  project: Project
  /** Change the current room (and shared fields like the customer) */
  update: (fn: (p: Project) => Project) => void
  /** The whole consultation, all rooms */
  stored: StoredProject
  updateStored: (fn: (p: StoredProject) => StoredProject) => void
  setRoom: (roomId: string) => void
}

/** Steps that belong to one room (the others cover the whole consultation). */
const ROOM_STEPS = new Set(['photos', 'scope', 'design', 'estimate', 'renderings'])

export const useProjectContext = () => useOutletContext<ProjectContext>()

export default function ProjectLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { project: stored, notFound, update: updateStored, saveState } = useProject(id)
  const [roomId, setRoomId] = useState<string | null>(null)
  const activeRoomId = stored?.rooms.some((r) => r.id === roomId) ? roomId! : stored?.rooms[0]?.id
  const project = useMemo(() => (stored ? scopeToRoom(stored, activeRoomId) : null), [stored, activeRoomId])
  const update = useCallback(
    (fn: (p: Project) => Project) => {
      if (activeRoomId) updateStored((s) => updateRoom(s, activeRoomId, fn))
    },
    [updateStored, activeRoomId],
  )

  // Let background renders merge into this consultation's live, autosaved state
  useEffect(() => (id ? registerProjectUpdater(id, updateStored) : undefined), [id, updateStored])

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xl font-semibold">That consultation wasn't found on this iPad.</p>
        <Button onClick={() => navigate('/')}>Back to consultations</Button>
      </div>
    )
  }
  if (!project || !stored) return <div className="p-6 text-neutral-500">Loading…</div>

  const currentIdx = Math.max(0, STEPS.findIndex((s) => location.pathname.endsWith(`/${s.path}`)))
  const prev = STEPS[currentIdx - 1]
  const next = STEPS[currentIdx + 1]
  const showRooms = stored.rooms.length > 1 && ROOM_STEPS.has(STEPS[currentIdx].path)

  return (
    <div className="flex h-full flex-col">
      <header className="border-b-2 border-neutral-100 bg-white safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex min-h-12 items-center gap-2 rounded-xl pr-3 font-semibold text-accent active:bg-neutral-100"
            aria-label="All consultations"
          >
            <Logo className="h-9 w-9" />
            <span className="hidden sm:inline">All consultations</span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-lg font-bold">{project.customer.name || 'New consultation'}</div>
            {stored.rooms.length === 1 && <div className="text-sm text-neutral-500">{project.roomName}</div>}
          </div>
          <SaveIndicator state={saveState} />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Consultation steps">
          {STEPS.map((s, i) => (
            <NavLink
              key={s.path}
              to={s.path}
              replace
              className={({ isActive }) =>
                `flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap ${
                  isActive ? 'bg-accent text-white' : 'text-neutral-600 active:bg-neutral-100'
                }`
              }
            >
              <span className="text-xs opacity-70">{i + 1}</span>
              {s.short}
            </NavLink>
          ))}
        </nav>
      </header>

      {showRooms && (
        <div className="flex items-center justify-center gap-2 border-b-2 border-neutral-100 bg-neutral-50 px-4 py-2" role="tablist" aria-label="Room">
          {stored.rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === activeRoomId}
              onClick={() => setRoomId(r.id)}
              className={`min-h-11 min-w-32 rounded-full px-5 font-semibold ${r.id === activeRoomId ? 'bg-black text-white' : 'bg-white text-neutral-700 active:bg-neutral-100'}`}
            >
              {r.type === 'kitchen' ? '🍳' : '🛁'} {r.name}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Outlet context={{ project, update, stored, updateStored, setRoom: setRoomId } satisfies ProjectContext} />
        </div>
      </main>

      <footer className="flex items-center justify-between gap-3 border-t-2 border-neutral-100 bg-white px-4 py-3 safe-bottom">
        <Button variant="secondary" onClick={() => prev && navigate(prev.path, { replace: true })} disabled={!prev} className="min-w-32">
          ← {prev?.short ?? 'Back'}
        </Button>
        <span className="text-sm text-neutral-500">
          Step {currentIdx + 1} of {STEPS.length}
        </span>
        <Button onClick={() => (next ? navigate(next.path, { replace: true }) : navigate('/'))} className="min-w-32">
          {next ? `${next.short} →` : 'Done ✓'}
        </Button>
      </footer>
    </div>
  )
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  const text = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Save failed, retrying' }[state]
  return (
    <span className={`w-28 text-right text-sm ${state === 'error' ? 'text-red-600' : 'text-neutral-400'}`} aria-live="polite">
      {text}
    </span>
  )
}
