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
}

export interface StoredPhoto {
  id: string
  projectId: string
  blob: Blob
}
