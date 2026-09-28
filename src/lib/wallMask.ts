import type { WallChange } from '../types'

/** Draw wall strokes (normalized 0..1) onto a canvas of the given size. */
export function drawWallStrokes(ctx: CanvasRenderingContext2D, walls: WallChange[], width: number, height: number, color = 'rgba(230, 30, 30, 0.55)') {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const w of walls) {
    ctx.lineWidth = Math.max(4, w.brush * width)
    for (const stroke of w.strokes) {
      if (!stroke.length) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0][0] * width, stroke[0][1] * height)
      for (const [x, y] of stroke.slice(1)) ctx.lineTo(x * width, y * height)
      if (stroke.length === 1) ctx.lineTo(stroke[0][0] * width + 0.1, stroke[0][1] * height)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** The photo (or rendering) with the walls to remove painted red: the AI's reference image. */
export async function annotateWalls(base: Blob, walls: WallChange[]): Promise<Blob> {
  const url = URL.createObjectURL(base)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not load the photo to mark the wall.'))
      i.src = url
    })
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    // Composite the strokes on their own layer so overlaps don't get darker
    const layer = document.createElement('canvas')
    layer.width = c.width
    layer.height = c.height
    drawWallStrokes(layer.getContext('2d')!, walls, c.width, c.height, 'rgb(230, 30, 30)')
    ctx.globalAlpha = 0.55
    ctx.drawImage(layer, 0, 0)
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not mark the wall.'))), 'image/jpeg', 0.85))
  } finally {
    URL.revokeObjectURL(url)
  }
}
