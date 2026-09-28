import { useSyncExternalStore } from 'react'

/** Staff unlock lasts until the app is closed/reloaded or someone taps Lock. */
let unlocked = false
const listeners = new Set<() => void>()

export function setStaffUnlocked(v: boolean) {
  unlocked = v
  listeners.forEach((l) => l())
}

export function useStaffUnlocked(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => unlocked,
  )
}
