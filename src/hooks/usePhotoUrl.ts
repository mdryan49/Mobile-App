import { useEffect, useState } from 'react'
import { getPhotoBlob } from '../lib/db'

/** Loads a photo blob from IndexedDB and returns an object URL (revoked on unmount). */
export function usePhotoUrl(photoId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!photoId) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    getPhotoBlob(photoId).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])
  return url
}
