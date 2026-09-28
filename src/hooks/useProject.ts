import { useCallback, useEffect, useRef, useState } from 'react'
import { getProject, saveProject } from '../lib/db'
import type { Project } from '../types'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Loads a project and autosaves every change (debounced). Pending changes are
 * flushed on unmount and when the app is backgrounded, so nothing is lost.
 */
export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const pending = useRef<Project | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const p = pending.current
    if (!p) return
    pending.current = null
    setSaveState('saving')
    try {
      await saveProject(p)
      setSaveState('saved')
    } catch {
      pending.current = p // keep it so the next flush retries
      setSaveState('error')
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setProject(null)
    setNotFound(false)
    getProject(id).then((p) => {
      if (cancelled) return
      if (p) setProject(p)
      else setNotFound(true)
    })
    return () => {
      cancelled = true
      void flush()
    }
  }, [id, flush])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [flush])

  const update = useCallback(
    (fn: (p: Project) => Project) => {
      setProject((prev) => {
        if (!prev) return prev
        const next = { ...fn(prev), updatedAt: Date.now() }
        pending.current = next
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => void flush(), 400)
        return next
      })
    },
    [flush],
  )

  return { project, notFound, update, saveState, flush }
}
