import type { Selection, Tier } from './config/catalog'

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

export interface Measurements {
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
  newFlooring: boolean
  flooringSqft: number
  paintWalls: boolean
  paintSqft: number
  newLighting: boolean
  permits: boolean
}

export type LookKey = Tier | 'custom'

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
  /** Rendering this one was edited from (Mix & Match), if any */
  parentId?: string
  width: number
  height: number
}

export interface Project {
  id: string
  createdAt: number
  updatedAt: number
  isDemo?: boolean
  customer: Customer
  photos: PhotoRef[]
  heroPhotoId: string | null
  measurements: Measurements
  /** The chosen look for each tier (starts from catalog defaults; edited in Mix & Match) */
  selections: Record<Tier, Selection>
  renders: RenderVersion[]
  /** Rendering currently shown for each look + photo. Key: `${look}@${photoId}` (see lib/looks.ts) */
  activeRender: Record<string, string>
  /** The homeowner's own mix (Mix & Match). Priced with the base tier's labor rates. */
  custom: { selection: Selection; baseTier: Tier } | null
  /** Ask the AI to tidy countertop clutter in renderings */
  declutter: boolean
}

export interface StoredPhoto {
  id: string
  projectId: string
  blob: Blob
}
