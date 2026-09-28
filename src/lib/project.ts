import { TIER_DEFAULTS } from '../config/catalog'
import type { Measurements, Project } from '../types'
import { newId } from './id'

export const DEFAULT_MEASUREMENTS: Measurements = {
  layout: 'l-shape',
  hasIsland: false,
  baseCabinetLf: 0,
  wallCabinetLf: 0,
  islandLengthFt: 0,
  islandWidthFt: 0,
  countertopSqft: 0,
  countertopManual: false,
  backsplashSqft: 0,
  backsplashManual: false,
  demoScope: 'cabinets-counters',
  movePlumbing: false,
  electricalUpdates: false,
  newFlooring: false,
  flooringSqft: 0,
  paintWalls: true,
  paintSqft: 0,
  newLighting: false,
  permits: true,
}

/** Standard counter depth is 25.5" plus overhang ≈ 26" → 26/12 sq ft per linear foot. */
export const COUNTER_SQFT_PER_LF = 26 / 12
/** Standard backsplash height is 18" between counter and upper cabinets. */
export const BACKSPLASH_SQFT_PER_LF = 18 / 12

export function suggestedCountertopSqft(m: Measurements): number {
  const island = m.hasIsland ? m.islandLengthFt * m.islandWidthFt : 0
  return Math.round(m.baseCabinetLf * COUNTER_SQFT_PER_LF + island)
}

export function suggestedBacksplashSqft(m: Measurements): number {
  return Math.round(m.baseCabinetLf * BACKSPLASH_SQFT_PER_LF)
}

/** Keep auto-suggested fields in sync unless the salesperson has overridden them. */
export function applySuggestions(m: Measurements): Measurements {
  return {
    ...m,
    countertopSqft: m.countertopManual ? m.countertopSqft : suggestedCountertopSqft(m),
    backsplashSqft: m.backsplashManual ? m.backsplashSqft : suggestedBacksplashSqft(m),
  }
}

export function emptyProject(): Project {
  const now = Date.now()
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    customer: { name: '', address: '', phone: '', email: '', notes: '' },
    photos: [],
    heroPhotoId: null,
    measurements: { ...DEFAULT_MEASUREMENTS },
    selections: structuredClone(TIER_DEFAULTS),
    renders: [],
    activeRender: {},
    custom: null,
    recommended: null,
    proposal: null,
    declutter: true,
  }
}

/** Upgrade projects saved by older versions of the app so every field exists. */
export function normalizeProject(p: Project): Project {
  return {
    ...p,
    measurements: { ...DEFAULT_MEASUREMENTS, ...p.measurements },
    selections: {
      good: { ...TIER_DEFAULTS.good, ...p.selections?.good },
      better: { ...TIER_DEFAULTS.better, ...p.selections?.better },
      best: { ...TIER_DEFAULTS.best, ...p.selections?.best },
    },
    ...migrateRenders(p),
    custom: p.custom ? { ...p.custom, selection: { ...TIER_DEFAULTS[p.custom.baseTier], ...p.custom.selection } } : null,
    recommended: p.recommended ?? null,
    proposal: p.proposal ?? null,
    declutter: p.declutter ?? true,
  }
}

/** Older saves had renders of the hero photo only, keyed by look. Attach them to that photo. */
function migrateRenders(p: Project): Pick<Project, 'renders' | 'activeRender'> {
  const hero = p.heroPhotoId ?? ''
  const renders = (p.renders ?? []).map((r) => (r.sourcePhotoId ? r : { ...r, sourcePhotoId: hero }))
  const activeRender: Record<string, string> = {}
  for (const [k, v] of Object.entries(p.activeRender ?? {})) {
    if (!v) continue
    if (k.includes('@')) activeRender[k] = v
    else activeRender[`${k}@${renders.find((r) => r.id === v)?.sourcePhotoId ?? hero}`] = v
  }
  return { renders, activeRender }
}
