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

export interface Project {
  id: string
  createdAt: number
  updatedAt: number
  isDemo?: boolean
  customer: Customer
  photos: PhotoRef[]
  heroPhotoId: string | null
  // Measurements, selections, renders and versions are added in later phases.
}

export interface StoredPhoto {
  id: string
  projectId: string
  blob: Blob
}
