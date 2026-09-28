import { EMPTY_SELECTION, type Selection } from '../config/catalog'
import type { Design, Measurements, Project } from '../types'
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
  flooringSqft: 0,
  paintSqft: 0,
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

export const MAX_DESIGNS = 3
const LETTERS = ['A', 'B', 'C', 'D']

/** A blank design option: nothing chosen yet, so everything is "keep existing". */
export function newDesign(existing: Design[], from?: Design): Design {
  const letter = LETTERS.find((l) => !existing.some((d) => d.name.startsWith(`Option ${l}`))) ?? String(existing.length + 1)
  return {
    id: newId(),
    name: from ? `Option ${letter}: ${from.name.replace(/^Option [A-Z0-9]+:?\s*/, '') || 'Copy'}` : `Option ${letter}`,
    selection: from ? structuredClone(from.selection) : { ...EMPTY_SELECTION },
    removeWalls: from?.removeWalls ?? true,
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
    designs: [newDesign([])],
    walls: [],
    renders: [],
    activeRender: {},
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
    ...migrateDesigns(p),
    walls: p.walls ?? [],
    ...migrateRenders(p),
    proposal: p.proposal ?? null,
    declutter: p.declutter ?? true,
  }
}

/** Older saves had renders of the hero photo only, keyed by look. Attach them to that photo. */
function migrateRenders(p: Project): Pick<Project, 'renders' | 'activeRender'> {
  const hero = p.heroPhotoId ?? ''
  const designIds = new Set(migrateDesigns(p).designs.map((d) => d.id))
  // Renders of looks that no longer exist (e.g. the old Custom Mix) are dropped
  const renders = (p.renders ?? []).filter((r) => designIds.has(r.look)).map((r) => (r.sourcePhotoId ? r : { ...r, sourcePhotoId: hero }))
  const activeRender: Record<string, string> = {}
  for (const [k, v] of Object.entries(p.activeRender ?? {})) {
    if (!v || !renders.some((r) => r.id === v)) continue
    if (k.includes('@')) activeRender[k] = v
    else activeRender[`${k}@${renders.find((r) => r.id === v)?.sourcePhotoId ?? hero}`] = v
  }
  return { renders, activeRender }
}

type LegacyProject = Project & { selections?: Record<string, Partial<Selection>> }
const LEGACY_TIERS: [string, string][] = [['good', 'Option A: Good'], ['better', 'Option B: Better'], ['best', 'Option C: Best']]

/** Before design options existed, projects had Good/Better/Best. They become Options A-C (same ids, so renders keep working). */
function migrateDesigns(p: LegacyProject): Pick<Project, 'designs' | 'recommended'> {
  if (p.designs?.length) {
    const designs = p.designs.map((d) => ({ ...d, selection: { ...EMPTY_SELECTION, ...d.selection }, removeWalls: d.removeWalls ?? true }))
    return { designs, recommended: designs.some((d) => d.id === p.recommended) ? p.recommended : null }
  }
  if (p.selections) {
    const designs = LEGACY_TIERS.map(([id, name]) => ({ id, name, selection: { ...EMPTY_SELECTION, ...p.selections![id] }, removeWalls: true }))
    return { designs, recommended: designs.some((d) => d.id === p.recommended) ? p.recommended : null }
  }
  return { designs: [newDesign([])], recommended: null }
}
