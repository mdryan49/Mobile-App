import { NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Button, Logo } from '../components/ui'
import { STEPS } from '../config/steps'
import { useProject } from '../hooks/useProject'
import type { Project } from '../types'

export interface ProjectContext {
  project: Project
  update: (fn: (p: Project) => Project) => void
}

export const useProjectContext = () => useOutletContext<ProjectContext>()

export default function ProjectLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { project, notFound, update, saveState } = useProject(id)

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xl font-semibold">That consultation wasn't found on this iPad.</p>
        <Button onClick={() => navigate('/')}>Back to consultations</Button>
      </div>
    )
  }
  if (!project) return <div className="p-6 text-neutral-500">Loading…</div>

  const currentIdx = Math.max(0, STEPS.findIndex((s) => location.pathname.endsWith(`/${s.path}`)))
  const prev = STEPS[currentIdx - 1]
  const next = STEPS[currentIdx + 1]

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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Outlet context={{ project, update } satisfies ProjectContext} />
        </div>
      </main>

      <footer className="flex items-center justify-between gap-3 border-t-2 border-neutral-100 bg-white px-4 py-3 safe-bottom">
        <Button variant="secondary" onClick={() => prev && navigate(prev.path, { replace: true })} disabled={!prev} className="min-w-32">
          ← {prev?.short ?? 'Back'}
        </Button>
        <span className="text-sm text-neutral-500">
          Step {currentIdx + 1} of {STEPS.length}
        </span>
        <Button onClick={() => next && navigate(next.path, { replace: true })} disabled={!next} className="min-w-32">
          {next?.short ?? 'Done'} →
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
