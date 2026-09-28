import { useEffect, useState } from 'react'
import { dismissJob, startRender, type JobState } from '../lib/renderJobs'
import type { LookKey } from '../types'
import { Button } from './ui'

export function RenderingOverlay({ imageUrl, startedAt }: { imageUrl: string | null; startedAt: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [])
  const secs = Math.max(0, Math.floor((now - startedAt) / 1000))
  const msg = secs < 8 ? 'Studying the room…' : secs < 16 ? 'Installing new finishes…' : secs < 30 ? 'Adding final details…' : 'Almost there. Hang tight…'
  return (
    <div className="relative overflow-hidden rounded-2xl bg-neutral-100">
      {imageUrl ? <img src={imageUrl} alt="" className="block w-full blur-sm brightness-90" /> : <div className="aspect-video" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/40">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white border-t-accent" />
        <p className="rounded-full bg-white/90 px-5 py-2 text-lg font-semibold">{msg}</p>
        <p className="rounded-full bg-white/80 px-3 py-1 text-sm tabular-nums">{secs}s</p>
      </div>
    </div>
  )
}

export function RenderError({ job, projectId, look, photoId }: { job: JobState; projectId: string; look: LookKey; photoId: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
      <p className="text-red-800">
        <strong>Rendering didn't finish.</strong> {job.error} Nothing was lost.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => dismissJob(projectId, look, photoId)}>
          Dismiss
        </Button>
        <Button onClick={() => void startRender(job.request)}>Retry</Button>
      </div>
    </div>
  )
}
