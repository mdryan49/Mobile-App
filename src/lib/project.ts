import { EMPTY_SELECTION, type Selection } from '../config/catalog'
import type { BathMeasurements, Design, Measurements, Project, RoomData, RoomType, StoredProject } from '../types'
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

export const DEFAULT_BATH: BathMeasurements = {
  floorSqft: 0,
  vanityWidthIn: 36,
  showerTileSqft: 0,
  showerTileManual: false,
  paintSqft: 0,
  demoScope: 'full-gut',
  movePlumbing: false,
  electricalUpdates: false,
  exhaustFan: true,
  heatedFloor: false,
  permits: true,
}

/** A standard 5 ft tub/shower alcove tiled to 8 ft: 3 walls ≈ 5×8 + 2×(2.5×8) ≈ 80 sq ft. */
export const DEFAULT_SHOWER_TILE_SQFT = 80

export function applyBathSuggestions(b: BathMeasurements): BathMeasurements {
  return { ...b, showerTileSqft: b.showerTileManual ? b.showerTileSqft : DEFAULT_SHOWER_TILE_SQFT }
}

export const ROOM_LABELS: Record<RoomType, string> = { kitchen: 'Kitchen', bath: 'Bath' }

export function newRoom(type: RoomType, name = ROOM_LABELS[type]): RoomData {
  return {
    id: newId(),
    type,
    name,
    photos: [],
    heroPhotoId: null,
    measurements: { ...DEFAULT_MEASUREMENTS },
    bath: applyBathSuggestions({ ...DEFAULT_BATH }),
    designs: [newDesign([])],
    walls: [],
    renders: [],
    activeRender: {},
    recommended: null,
    declutter: true,
  }
}

export function emptyProject(types: RoomType[] = ['kitchen']): StoredProject {
  const now = Date.now()
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    customer: { name: '', address: '', phone: '', email: '', notes: '' },
    proposal: null,
    rooms: types.map((t) => newRoom(t)),
  }
}

/** The consultation seen from one room (defaults to the first room). */
export function scopeToRoom(s: StoredProject, roomId?: string): Project {
  const room = s.rooms.find((r) => r.id === roomId) ?? s.rooms[0]
  const { id: roomIdValue, type, name, ...roomData } = room
  const { rooms: _rooms, ...common } = s
  return { ...common, ...roomData, roomId: roomIdValue, roomType: type, roomName: name }
}

/** Write a room-scoped view back into the stored consultation. */
export function unscope(s: StoredProject, p: Project): StoredProject {
  const { roomId, roomType, roomName, photos, heroPhotoId, measurements, bath, designs, walls, renders, activeRender, recommended, declutter, ...common } = p
  return {
    ...s,
    ...common,
    rooms: s.rooms.map((r) =>
      r.id === roomId
        ? { ...r, id: roomId, type: roomType, name: roomName, photos, heroPhotoId, measurements, bath, designs, walls, renders, activeRender, recommended, declutter }
        : r,
    ),
  }
}

/** Apply a room-scoped change to a stored consultation. */
export const updateRoom = (s: StoredProject, roomId: string, fn: (p: Project) => Project): StoredProject => unscope(s, fn(scopeToRoom(s, roomId)))

type LegacyFlat = Partial<RoomData> & Omit<StoredProject, 'rooms'> & { rooms?: RoomData[]; selections?: Record<string, Partial<Selection>> }

/** Upgrade consultations saved by older versions of the app so every field exists. */
export function normalizeProject(raw: LegacyFlat): StoredProject {
  // Before rooms existed, a consultation was one kitchen with its fields at the top level
  const rooms: Partial<RoomData>[] = raw.rooms?.length ? raw.rooms : [{ ...raw, id: newId(), type: 'kitchen', name: 'Kitchen' }]
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    isDemo: raw.isDemo,
    customer: raw.customer,
    proposal: raw.proposal ?? null,
    rooms: rooms.map(normalizeRoom),
  }
}

function normalizeRoom(r: Partial<RoomData> & { selections?: Record<string, Partial<Selection>> }): RoomData {
  const base = newRoom(r.type ?? 'kitchen', r.name)
  return {
    ...base,
    id: r.id ?? base.id,
    photos: r.photos ?? [],
    heroPhotoId: r.heroPhotoId ?? null,
    measurements: { ...DEFAULT_MEASUREMENTS, ...r.measurements },
    bath: { ...base.bath, ...r.bath },
    ...migrateDesigns(r),
    walls: r.walls ?? [],
    ...migrateRenders(r),
    declutter: r.declutter ?? true,
  }
}

/** Older saves had renders of the hero photo only, keyed by look. Attach them to that photo. */
function migrateRenders(p: Partial<RoomData>): Pick<RoomData, 'renders' | 'activeRender'> {
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

type LegacyProject = Partial<RoomData> & { selections?: Record<string, Partial<Selection>> }
const LEGACY_TIERS: [string, string][] = [['good', 'Option A: Good'], ['better', 'Option B: Better'], ['best', 'Option C: Best']]

/** Before design options existed, projects had Good/Better/Best. They become Options A-C (same ids, so renders keep working). */
function migrateDesigns(p: LegacyProject): Pick<RoomData, 'designs' | 'recommended'> {
  if (p.designs?.length) {
    const designs = p.designs.map((d) => ({ ...d, selection: { ...EMPTY_SELECTION, ...d.selection }, removeWalls: d.removeWalls ?? true }))
    return { designs, recommended: designs.some((d) => d.id === p.recommended) ? p.recommended ?? null : null }
  }
  if (p.selections) {
    const designs = LEGACY_TIERS.map(([id, name]) => ({ id, name, selection: { ...EMPTY_SELECTION, ...p.selections![id] }, removeWalls: true }))
    return { designs, recommended: designs.some((d) => d.id === p.recommended) ? p.recommended ?? null : null }
  }
  return { designs: [newDesign([])], recommended: null }
}
