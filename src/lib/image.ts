/**
 * Photo compression. iPad photos are 3–12 MB; we shrink to ~1600px JPEG
 * (~250–450 KB) so storage stays light and AI renders stay fast and cheap.
 */
export const MAX_PHOTO_EDGE = 1600
export const JPEG_QUALITY = 0.82

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image. Try a JPEG or PNG photo.'))
    img.src = src
  })
}

/** Resize (respecting EXIF rotation — browsers apply it when decoding) and re-encode as JPEG. */
export async function compressImage(
  source: Blob,
  maxEdge = MAX_PHOTO_EDGE,
  quality = JPEG_QUALITY,
): Promise<CompressedImage> {
  const url = URL.createObjectURL(source)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.fillStyle = '#fff' // flatten transparent PNGs/SVGs onto white
    ctx.fillRect(0, 0, width, height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression failed'))), 'image/jpeg', quality),
    )
    return { blob, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
