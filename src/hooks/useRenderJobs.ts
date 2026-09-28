import { useSyncExternalStore } from 'react'
import { getJobsSnapshot, subscribeJobs } from '../lib/renderJobs'

export const useRenderJobs = () => useSyncExternalStore(subscribeJobs, getJobsSnapshot)
