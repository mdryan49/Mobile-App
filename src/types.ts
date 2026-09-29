import type { Selection } from './config/catalog'

export interface Customer {
  name: string
  address: string
  phone: string
  email: string
  notes: string
}

/** Photo metadata lives on the project; the image Blob lives in the `photos` store. */
export interface PhotoRef {
  id: string
  width: number
  height: number
  addedAt: number
}

export type Layout = 'l-shape' | 'u-shape' | 'galley' | 'single-wall'
export type DemoScope = 'full-gut' | 'cabinets-counters' | 'refresh'

/** Construction items that apply to every design option of a room. */
export interface SharedScope {
  /** Windows replaced (allowance + install each, from Settings) */
  windowCount: number
  /** New or patched drywall incl. texture */
  drywallSqft: number
  /** Remove the existing floor (priced when an option includes new flooring) */
  removeFlooring: boolean
}

export type Measurements = {
  layout: Layout
  hasIsland: boolean
  baseCabinetLf: number
  wallCabinetLf: number
  islandLengthFt: number
  islandWidthFt: number
  countertopSqft: number
  /** true once the salesperson overrides the suggested value */
  countertopManual: boolean
  backsplashSqft: number
  backsplashManual: boolean
  demoScope: DemoScope
  movePlumbing: boolean
  electricalUpdates: boolean
  /** Area priced when a design includes new flooring */
  flooringSqft: number
  /** Wall area priced when a design includes wall paint */
  paintSqft: number
  permits: boolean
  /** Appliances we install (homeowner-provided or reinstalled), see APPLIANCES in catalog */
  appliances: string[]
} & SharedScope

/** A design option id (renderings and estimates are keyed by it). */
export type LookKey = string

/** One design option the salesperson builds from supplier products. */
export interface Design {
  id: string
  /** e.g. "Option A: Classic White" */
  name: string
  selection: Selection
  /** Include the marked wall removals in this option (price + rendering) */
  removeWalls: boolean
}

export type WallStructure = 'non-bearing' | 'load-bearing' | 'unknown'

/** A wall (or part of one) to remove, marked by drawing on a photo. */
export interface WallChange {
  id: string
  photoId: string
  /** Finger strokes, as points normalized 0..1 to the photo's width/height */
  strokes: [number, number][][]
  /** Brush width as a fraction of photo width */
  brush: number
  structure: WallStructure
  lengthFt: number
  note: string
}

/** One AI rendering. The image Blob is stored in the `photos` store under the same id. */
export interface RenderVersion {
  id: string
  look: LookKey
  createdAt: number
  /** Materials this rendering shows */
  selection: Selection
  /** Human label, e.g. "Initial render" or "Countertop → Cambria Ella" */
  label: string
  /** Which kitchen photo this rendering restyles */
  sourcePhotoId: string
  /** true if this rendering shows walls removed (shown as "concept only") */
  wallsRemoved?: boolean
  /** Rendering this one was edited from, if any */
  parentId?: string
  width: number
  height: number
}

export type RoomType = 'kitchen' | 'bath'

export type BathDemoScope = 'full-gut' | 'partial'

/** Full bath remodel measurements. */
export type BathMeasurements = {
  floorSqft: number
  vanityWidthIn: number
  /** Tiled shower/tub walls */
  showerTileSqft: number
  showerTileManual: boolean
  paintSqft: number
  demoScope: BathDemoScope
  movePlumbing: boolean
  electricalUpdates: boolean
  exhaustFan: boolean
  heatedFloor: boolean
  permits: boolean
} & SharedScope

/** Everything that belongs to one room of a consultation. */
export interface RoomData {
  id: string
  type: RoomType
  name: string
  photos: PhotoRef[]
  heroPhotoId: string | null
  /** Kitchen measurements (used when type is 'kitchen') */
  measurements: Measurements
  /** Bath measurements (used when type is 'bath') */
  bath: BathMeasurements
  /** Up to 3 design options built from supplier products */
  designs: Design[]
  /** Walls to remove, marked on photos */
  walls: WallChange[]
  renders: RenderVersion[]
  /** Rendering currently shown for each look + photo. Key: `${look}@${photoId}` (see lib/looks.ts) */
  activeRender: Record<string, string>
  /** Design option the salesperson recommends; featured first on the proposal */
  recommended: LookKey | null
  /** Ask the AI to tidy clutter in renderings */
  declutter: boolean
}

/** What's saved on the iPad: one consultation with one or more rooms. */
export interface StoredProject {
  id: string
  createdAt: number
  updatedAt: number
  isDemo?: boolean
  customer: Customer
  /** Set the first time a proposal PDF is created */
  proposal: { number: string; createdAt: number } | null
  rooms: RoomData[]
}

/**
 * The consultation as seen from one room. Step screens work with this, so they
 * don't need to know about rooms (see scopeToRoom in lib/project.ts).
 */
export interface Project extends Omit<StoredProject, 'rooms'>, Omit<RoomData, 'id' | 'type' | 'name'> {
  roomId: string
  roomType: RoomType
  roomName: string
  /** The project fee is charged once per consultation, on the first room */
  isFirstRoom: boolean
}

export interface StoredPhoto {
  id: string
  projectId: string
  blob: Blob
}
