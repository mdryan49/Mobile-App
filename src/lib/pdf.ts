import { jsPDF } from 'jspdf'
import { BRAND, SAMPLE_PRICING_NOTICE } from '../config/brand'
import { TIER_LABELS } from '../config/catalog'
import type { AppSettings } from '../config/defaultSettings'
import { PROPOSAL } from '../config/proposal'
import type { LookKey, Project } from '../types'
import { getPhotoBlob } from './db'
import { calculateEstimate, groupEstimate, GROUPS, money, moneyRange, type Estimate } from './estimate'
import { activeVersion, availableLooks, lookPricingTier, lookSelection } from './looks'
import { materialRows } from './materials'

/**
 * Client-side proposal PDF (US Letter, portrait). Designed to print well:
 * white background, black text, one accent color, no full-bleed fills.
 */

const PAGE_W = 215.9
const PAGE_H = 279.4
const M = 16 // margin
const CONTENT_W = PAGE_W - M * 2
const PT = 0.3528 // mm per point

type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
const ACCENT = hex(BRAND.colors.accent)
const INK: RGB = [0, 0, 0]
const GRAY: RGB = [95, 95, 95]
const LIGHT: RGB = [225, 225, 225]

/** The built-in PDF fonts only cover Latin-1; swap anything else for a safe equivalent. */
function safe(s: string): string {
  return s
    .replace(/[−‒–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[←-⇿☀-➿]/g, '')
    .replace(/[^\x00-\xFF]/g, '')
}

export function proposalNumber(p: Project, now = new Date()): string {
  const initials = BRAND.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const d = now
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${initials}-${ymd}-${p.id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase()}`
}

const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

/** Center-crop a photo to an aspect ratio and shrink it so the PDF stays small. */
async function cropped(blob: Blob, aspect: number, maxW = 1400): Promise<string> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not load an image for the PDF.'))
      i.src = url
    })
    let sw = img.naturalWidth
    let sh = sw / aspect
    if (sh > img.naturalHeight) {
      sh = img.naturalHeight
      sw = sh * aspect
    }
    const sx = (img.naturalWidth - sw) / 2
    const sy = (img.naturalHeight - sh) / 2
    const w = Math.min(maxW, Math.round(sw))
    const h = Math.round(w / aspect)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
    return c.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface LookData {
  look: LookKey
  estimate: Estimate
  image?: string
}

export interface ProposalResult {
  blob: Blob
  filename: string
  number: string
}

export async function buildProposalPdf(project: Project, settings: AppSettings, numberOverride?: string): Promise<ProposalResult> {
  const now = Date.now()
  const number = numberOverride ?? proposalNumber(project, new Date(now))
  const validUntil = now + PROPOSAL.validDays * 86_400_000
  const looks = availableLooks(project)
  const recommended: LookKey = project.recommended && looks.includes(project.recommended) ? project.recommended : looks.includes('custom') ? 'custom' : 'better'
  // Recommended look first everywhere
  const ordered = [recommended, ...looks.filter((l) => l !== recommended)]
  const m = project.measurements
  const heroId = project.heroPhotoId ?? ''
  const heroBlob = heroId ? await getPhotoBlob(heroId) : undefined

  const data: LookData[] = []
  for (const look of ordered) {
    const estimate = calculateEstimate(m, lookSelection(project, look), lookPricingTier(project, look), settings.pricing)
    const v = activeVersion(project, look)
    const blob = v && (await getPhotoBlob(v.id))
    data.push({ look, estimate, image: blob ? await cropped(blob, 16 / 9) : undefined })
  }
  const heroImg = heroBlob ? await cropped(heroBlob, 16 / 9) : undefined

  // Extra views: renderings of the recommended look from non-hero photos
  const extraViews: string[] = []
  for (const photo of project.photos) {
    if (photo.id === heroId || extraViews.length >= 2) continue
    const v = activeVersion(project, recommended, photo.id)
    const blob = v && (await getPhotoBlob(v.id))
    if (blob) extraViews.push(await cropped(blob, 4 / 3, 1000))
  }

  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true })
  doc.setProperties({ title: `${BRAND.name} ${PROPOSAL.title} ${number}`, author: BRAND.name, subject: project.customer.name })

  const text = (s: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'center' | 'right'; maxWidth?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10)
    doc.setTextColor(...(opts.color ?? INK))
    doc.text(safe(s), x, y, { align: opts.align ?? 'left', maxWidth: opts.maxWidth })
  }
  /** Wrapped paragraph; returns the y below it. */
  const para = (s: string, x: number, y: number, w: number, size = 10, color: RGB = INK, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(safe(s), w) as string[]
    doc.text(lines, x, y)
    return y + lines.length * size * PT * 1.35
  }
  const rule = (y: number, color: RGB = LIGHT, width = 0.3) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(width)
    doc.line(M, y, PAGE_W - M, y)
  }
  const image = (data: string | undefined, x: number, y: number, w: number, h: number, placeholder = 'Rendering not created yet') => {
    if (data) doc.addImage(data, 'JPEG', x, y, w, h, undefined, 'FAST')
    else {
      doc.setDrawColor(...LIGHT)
      doc.setLineWidth(0.4)
      doc.rect(x, y, w, h)
      text(placeholder, x + w / 2, y + h / 2, { size: 9, color: GRAY, align: 'center' })
    }
  }
  const badge = (label: string, x: number, y: number, size = 8) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    const w = doc.getTextWidth(label) + 4
    doc.setFillColor(...ACCENT)
    doc.roundedRect(x, y - size * PT - 1, w, size * PT + 2.4, 1, 1, 'F')
    text(label, x + 2, y, { size, bold: true, color: [255, 255, 255] })
    return w
  }

  const header = (title: string) => {
    // Logo mark: accent square with a white house
    doc.setFillColor(...ACCENT)
    doc.roundedRect(M, 12, 11, 11, 2, 2, 'F')
    doc.setFillColor(255, 255, 255)
    doc.triangle(M + 2.3, 18.2, M + 5.5, 15, M + 8.7, 18.2, 'F')
    doc.rect(M + 3.2, 18.1, 4.6, 3.1, 'F')
    text(BRAND.name, M + 14, 17, { size: 13, bold: true })
    text(BRAND.tagline, M + 14, 21.5, { size: 8.5, color: GRAY })
    text(title, PAGE_W - M, 17, { size: 11, bold: true, align: 'right' })
    text(`Proposal ${number} | ${fmtDate(now)}`, PAGE_W - M, 21.5, { size: 8.5, color: GRAY, align: 'right' })
    rule(26, ACCENT, 0.8)
  }

  // ---------------- Page 1: Cover ----------------
  header(PROPOSAL.title)
  let y = 40
  text(PROPOSAL.title, M, y, { size: 24, bold: true })
  y += 11
  const col2 = M + CONTENT_W / 2 + 4
  text('PREPARED FOR', M, y, { size: 8, bold: true, color: GRAY })
  text('PREPARED BY', col2, y, { size: 8, bold: true, color: GRAY })
  y += 5.5
  const c = project.customer
  const sp = settings.salesperson
  const forLines = [c.name || 'Homeowner', c.address, c.phone, c.email].filter(Boolean)
  const byLines = [sp.name || BRAND.name, sp.phone || BRAND.phone, sp.email || BRAND.email, BRAND.website].filter(Boolean)
  forLines.forEach((l, i) => text(l, M, y + i * 5, { size: i === 0 ? 12 : 10, bold: i === 0, maxWidth: CONTENT_W / 2 - 4 }))
  byLines.forEach((l, i) => text(l, col2, y + i * 5, { size: i === 0 ? 12 : 10, bold: i === 0, maxWidth: CONTENT_W / 2 - 4 }))
  y += Math.max(forLines.length, byLines.length) * 5 + 3
  text(`Date: ${fmtDate(now)}     Valid through: ${fmtDate(validUntil)}`, M, y, { size: 9.5, color: GRAY })
  y += 7
  y = para(PROPOSAL.intro.replace('{count}', ['zero', 'one', 'two', 'three', 'four'][data.length] ?? String(data.length)), M, y, CONTENT_W, 10.5) + 2

  const rec = data[0]
  const bigH = CONTENT_W * (9 / 16)
  image(rec.image ?? heroImg, M, y, CONTENT_W, bigH)
  badge(rec.image ? `RECOMMENDED: ${TIER_LABELS[rec.look].toUpperCase()}` : 'YOUR KITCHEN TODAY', M + 3, y + 7, 9)
  y += bigH + 5

  const smallW = 62
  const smallH = smallW * (9 / 16)
  if (rec.image && heroImg) {
    image(heroImg, M, y, smallW, smallH)
    badge('BEFORE', M + 2, y + 5.5, 7.5)
  }
  const tx = rec.image && heroImg ? M + smallW + 8 : M
  text(`${TIER_LABELS[rec.look]} look`, tx, y + 5, { size: 14, bold: true })
  text(moneyRange(rec.estimate.low, rec.estimate.high), tx, y + 13, { size: 18, bold: true, color: ACCENT })
  text('Estimated investment range', tx, y + 18.5, { size: 9, color: GRAY })
  text(`See all ${data.length} options on the next page.`, tx, y + 26, { size: 9.5 })

  // ---------------- Page 2: Options ----------------
  doc.addPage()
  header('Your Options')
  y = 36
  text('Your options, shown in your kitchen', M, y, { size: 16, bold: true })
  y += 6
  const rowsTop = y
  const rowsH = PAGE_H - 26 - rowsTop
  const rowH = rowsH / data.length
  data.forEach((d, i) => {
    const top = rowsTop + i * rowH + 2
    const imgW = Math.min((rowH - 8) * (16 / 9), 86)
    const imgH = imgW * (9 / 16)
    image(d.image, M, top, imgW, imgH)
    const x = M + imgW + 6
    const w = PAGE_W - M - x
    text(TIER_LABELS[d.look].toUpperCase(), x, top + 5, { size: 13, bold: true })
    if (d.look === recommended) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      badge('RECOMMENDED', x + doc.getTextWidth(TIER_LABELS[d.look].toUpperCase()) + 3, top + 5, 7.5)
    }
    text(moneyRange(d.estimate.low, d.estimate.high), x, top + 11.5, { size: 12, bold: true, color: ACCENT })
    let my = top + 17.5
    const lineH = Math.min(4.6, Math.max(3.9, (imgH - 16) / 6))
    for (const row of materialRows(lookSelection(project, d.look))) {
      doc.setFillColor(...hex(row.swatch.color))
      doc.setDrawColor(170, 170, 170)
      doc.setLineWidth(0.2)
      doc.rect(x, my - 2.6, 3, 3, 'FD')
      text(`${row.label}:`, x + 4.5, my, { size: 8, bold: true })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const lw = doc.getTextWidth(`${row.label}: `)
      // Keep every material on one line so rows never collide: shrink a little, then trim
      doc.setFont('helvetica', 'normal')
      let size = 8
      let t = safe(row.text)
      const maxW = w - 4.5 - lw
      doc.setFontSize(size)
      while (doc.getTextWidth(t) > maxW && size > 6.8) doc.setFontSize((size -= 0.2))
      while (doc.getTextWidth(t) > maxW && t.length > 4) t = t.slice(0, -2)
      if (t !== safe(row.text)) t = t.replace(/[ ,]*$/, '') + '...'
      text(t, x + 4.5 + lw, my, { size })
      my += lineH
    }
    if (i < data.length - 1) rule(rowsTop + (i + 1) * rowH - 1)
  })

  // ---------------- Page 3: Investment summary ----------------
  doc.addPage()
  header('Investment Summary')
  y = 36
  text('Investment summary', M, y, { size: 16, bold: true })
  y += 4
  const groupsByLook = data.map((d) => groupEstimate(d.estimate, lookSelection(project, d.look)))
  const groupKeys = GROUPS.map((g) => g.key).filter((k) => groupsByLook.some((gs) => gs.some((g) => g.key === k)))
  const labelW = 52
  const colW = (CONTENT_W - labelW) / data.length
  const colX = (i: number) => M + labelW + i * colW + colW - 2
  y += 8
  text('Category', M, y, { size: 8.5, bold: true, color: GRAY })
  data.forEach((d, i) => {
    text(TIER_LABELS[d.look].toUpperCase(), colX(i), y, { size: 9.5, bold: true, align: 'right', color: d.look === recommended ? ACCENT : INK })
  })
  y += 2.5
  rule(y, INK, 0.4)
  for (const k of groupKeys) {
    y += 7
    text(GROUPS.find((g) => g.key === k)!.label, M, y, { size: 9.5, bold: true })
    data.forEach((_, i) => {
      const g = groupsByLook[i].find((x) => x.key === k)
      text(g ? money(g.amount) : '-', colX(i), y, { size: 9.5, align: 'right' })
    })
    y += 2.5
    rule(y)
  }
  y += 8
  text('Estimated range', M, y, { size: 10.5, bold: true })
  data.forEach((d, i) => {
    text(safe(moneyRange(d.estimate.low, d.estimate.high)), colX(i), y, { size: data.length === 4 ? 8.5 : 9.5, bold: true, align: 'right', color: ACCENT })
  })
  y += 3
  rule(y, INK, 0.4)
  y += 6
  y = para(
    `Category amounts are shown for comparison and include materials, labor and project management. Totals are shown as a range of plus or minus ${settings.pricing.rangePct}%.`,
    M, y, CONTENT_W, 8.5, GRAY,
  )

  // Scope
  y += 6
  text('Project scope', M, y, { size: 13, bold: true })
  y += 6
  const layoutLabel = { 'l-shape': 'L-shape', 'u-shape': 'U-shape', galley: 'Galley', 'single-wall': 'Single wall' }[m.layout]
  const demoLabel = { 'full-gut': 'Full gut', 'cabinets-counters': 'Replace cabinets & counters', refresh: 'Refresh (keep cabinet boxes)' }[m.demoScope]
  const scope: [string, string][] = [
    ['Layout', `${layoutLabel}${m.hasIsland ? ` with ${m.islandLengthFt} x ${m.islandWidthFt} ft island` : ''}`],
    ['Cabinetry', `${m.baseCabinetLf} lin ft base, ${m.wallCabinetLf} lin ft wall${m.hasIsland ? `, ${m.islandLengthFt} lin ft island` : ''}`],
    ['Countertops', `approx. ${m.countertopSqft} sq ft`],
    ['Backsplash', `approx. ${m.backsplashSqft} sq ft`],
    ['Demolition', demoLabel],
    [
      'Also included',
      [
        m.movePlumbing ? 'plumbing relocation' : 'plumbing reconnect',
        m.electricalUpdates ? 'electrical updates' : 'electrical reconnect',
        m.newLighting && 'new lighting',
        m.newFlooring && `new flooring (${m.flooringSqft} sq ft)`,
        m.paintWalls && 'wall paint',
        m.permits && 'permits & inspections',
      ]
        .filter(Boolean)
        .join(', '),
    ],
  ]
  for (const [k, v] of scope) {
    text(k, M, y, { size: 9.5, bold: true })
    y = para(v, M + 38, y, CONTENT_W - 38, 9.5) + 1.2
  }
  y += 4
  y = para(PROPOSAL.terms, M, y, CONTENT_W, 8.5, GRAY)

  // ---------------- Page 4: Next steps & approval ----------------
  doc.addPage()
  header('Next Steps')
  y = 36
  if (extraViews.length) {
    text(`More views of your ${TIER_LABELS[recommended]} kitchen`, M, y, { size: 13, bold: true })
    y += 4
    const w = extraViews.length === 1 ? CONTENT_W * 0.6 : (CONTENT_W - 6) / 2
    const h = w * (3 / 4)
    const hh = Math.min(h, 62)
    const ww = hh * (4 / 3)
    extraViews.forEach((v, i) => image(v, M + i * (ww + 6), y, ww, hh))
    y += hh + 9
  }
  text('Next steps', M, y, { size: 16, bold: true })
  y += 7
  PROPOSAL.nextSteps.forEach((s, i) => {
    doc.setFillColor(...ACCENT)
    doc.circle(M + 3.2, y - 1.3, 3.2, 'F')
    text(String(i + 1), M + 3.2, y, { size: 9.5, bold: true, color: [255, 255, 255], align: 'center' })
    text(s.title, M + 10, y, { size: 11, bold: true })
    y = para(s.text, M + 10, y + 5, CONTENT_W - 10, 9.5, GRAY) + 2.5
  })

  y += 2
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.5)
  const boxTop = y
  y += 8
  text('Ready to move forward?', M + 6, y, { size: 14, bold: true })
  y += 5.5
  text(`This proposal is valid for ${PROPOSAL.validDays} days, through ${fmtDate(validUntil)}.`, M + 6, y, { size: 9.5, color: GRAY })
  y += 8
  text('I choose:', M + 6, y, { size: 10, bold: true })
  let cx = M + 26
  for (const d of data) {
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.35)
    doc.rect(cx, y - 3.4, 4, 4)
    text(`${TIER_LABELS[d.look]}`, cx + 6, y, { size: 10 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    cx += 6 + doc.getTextWidth(TIER_LABELS[d.look]) + 9
  }
  y += 14
  const sigW = (CONTENT_W - 12 - 10) * 0.66
  const dateX = M + 6 + sigW + 10
  const sigLine = (label: string) => {
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.3)
    doc.line(M + 6, y, M + 6 + sigW, y)
    doc.line(dateX, y, PAGE_W - M - 6, y)
    text(label, M + 6, y + 4, { size: 8, color: GRAY })
    text('Date', dateX, y + 4, { size: 8, color: GRAY })
    y += 15
  }
  sigLine('Homeowner signature')
  sigLine('Homeowner signature')
  sigLine(`${BRAND.name} representative${sp.name ? ` (${sp.name})` : ''}`)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.5)
  doc.roundedRect(M, boxTop, CONTENT_W, y - 6 - boxTop, 2, 2, 'S')

  // ---------------- Footer on every page ----------------
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    text(SAMPLE_PRICING_NOTICE.toUpperCase(), PAGE_W / 2, PAGE_H - 16.5, { size: 7.5, bold: true, align: 'center' })
    rule(PAGE_H - 14)
    text(`${BRAND.name} | ${BRAND.phone} | ${BRAND.website}`, M, PAGE_H - 9.5, { size: 7.5, color: GRAY })
    text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 9.5, { size: 7.5, color: GRAY, align: 'right' })
  }

  const who = (c.name || 'Homeowner').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return {
    blob: doc.output('blob'),
    filename: `${BRAND.shortName.replace(/\s+/g, '-')}-Proposal-${who}-${number}.pdf`,
    number,
  }
}
