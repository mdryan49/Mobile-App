import { jsPDF } from 'jspdf'
import { BRAND, SAMPLE_PRICING_NOTICE } from '../config/brand'
import type { AppSettings } from '../config/defaultSettings'
import { PROPOSAL } from '../config/proposal'
import type { LookKey, Project, StoredProject } from '../types'
import { getPhotoBlob } from './db'
import { estimateFor, groupEstimate, groupsFor, money, moneyRange, WALL_LABELS, type Estimate } from './estimate'
import { activeVersion, availableLooks, lookName, lookSelection, lookWalls } from './looks'
import { materialRows } from './materials'
import { scopeToRoom } from './project'
import { longestLead, specRows } from './specs'

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

export function proposalNumber(p: { id: string }, now = new Date()): string {
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
  name: string
  estimate: Estimate
  image?: string
  /** The rendering shows a wall removed: label it as a concept */
  concept?: boolean
}

export interface ProposalResult {
  blob: Blob
  filename: string
  number: string
  pages: number
}

/** Which design options of a room go on the proposal, and which one is recommended. */
export interface RoomPlan {
  roomId: string
  looks: LookKey[]
  recommended: LookKey
}

interface RoomSection {
  project: Project
  label: string
  word: string
  data: LookData[]
  recommended: LookKey
  heroImg?: string
  extraViews: string[]
  extraConcept: boolean
}

/** Default plan: every option that has something picked; the saved recommendation (or the first option). */
export function defaultPlans(stored: StoredProject, settings: AppSettings): RoomPlan[] {
  return stored.rooms
    .map((room) => {
      const p = scopeToRoom(stored, room.id)
      const looks = availableLooks(p).filter((l) => !estimateFor(p, lookSelection(p, l), settings.pricing, lookWalls(p, l)).empty)
      const recommended = p.recommended && looks.includes(p.recommended) ? p.recommended : looks[0]
      return { roomId: room.id, looks, recommended }
    })
    .filter((plan) => plan.looks.length > 0)
}

export async function buildProposalPdf(stored: StoredProject, settings: AppSettings, numberOverride?: string, plans?: RoomPlan[]): Promise<ProposalResult> {
  const now = Date.now()
  const number = numberOverride ?? proposalNumber(stored, new Date(now))
  const validUntil = now + PROPOSAL.validDays * 86_400_000

  // Gather images and prices for every room first
  const sections: RoomSection[] = []
  for (const plan of plans ?? defaultPlans(stored, settings)) {
    const project = scopeToRoom(stored, plan.roomId)
    const recommended = plan.recommended
    const ordered = [recommended, ...plan.looks.filter((l) => l !== recommended)]
    const heroId = project.heroPhotoId ?? ''
    const heroBlob = heroId ? await getPhotoBlob(heroId) : undefined
    const data: LookData[] = []
    for (const look of ordered) {
      const estimate = estimateFor(project, lookSelection(project, look), settings.pricing, lookWalls(project, look))
      const v = activeVersion(project, look)
      const blob = v && (await getPhotoBlob(v.id))
      data.push({ look, name: lookName(project, look), estimate, image: blob ? await cropped(blob, 16 / 9) : undefined, concept: v?.wallsRemoved })
    }
    // Extra views: renderings of the recommended option from the room's other photos
    const extraViews: string[] = []
    let extraConcept = false
    for (const photo of project.photos) {
      if (photo.id === heroId || extraViews.length >= 2) continue
      const v = activeVersion(project, recommended, photo.id)
      const blob = v && (await getPhotoBlob(v.id))
      if (blob) extraViews.push(await cropped(blob, 4 / 3, 1000))
      if (blob && v.wallsRemoved) extraConcept = true
    }
    sections.push({
      project,
      label: project.roomName,
      word: project.roomType === 'bath' ? 'bathroom' : 'kitchen',
      data,
      recommended,
      heroImg: heroBlob ? await cropped(heroBlob, 16 / 9) : undefined,
      extraViews,
      extraConcept,
    })
  }
  if (!sections.length) throw new Error('Pick products for at least one design option first.')
  const multi = sections.length > 1

  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true })
  doc.setProperties({ title: `${BRAND.name} ${sections.map((s) => s.label).join(' & ')} Proposal ${number}`, author: BRAND.name, subject: stored.customer.name })

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
  /** Stamp on renderings that show a wall removed */
  const conceptStamp = (x: number, y: number, w: number, h: number) => {
    const label = 'CONCEPT ONLY - WALL REMOVAL SUBJECT TO STRUCTURAL REVIEW'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    const tw = Math.min(doc.getTextWidth(label) + 4, w - 4)
    doc.setFillColor(251, 191, 36)
    doc.rect(x + 2, y + h - 6.5, tw, 4.5, 'F')
    text(label, x + 4, y + h - 3.3, { size: 6.5, bold: true, maxWidth: tw - 2 })
  }
  const company = settings.company
  // Uploaded logo (fit inside 60 x 12 mm), else the built-in mark + company name
  let logo: { data: string; w: number; h: number } | null = null
  if (company.logoDataUrl) {
    try {
      const props = doc.getImageProperties(company.logoDataUrl)
      const scale = Math.min(60 / props.width, 12 / props.height)
      logo = { data: company.logoDataUrl, w: props.width * scale, h: props.height * scale }
    } catch {
      logo = null
    }
  }
  const header = (title: string) => {
    if (logo) {
      doc.addImage(logo.data, 'PNG', M, 11 + (12 - logo.h) / 2, logo.w, logo.h, 'company-logo', 'FAST')
    } else {
      // Built-in mark: accent square with a white house
      doc.setFillColor(...ACCENT)
      doc.roundedRect(M, 12, 11, 11, 2, 2, 'F')
      doc.setFillColor(255, 255, 255)
      doc.triangle(M + 2.3, 18.2, M + 5.5, 15, M + 8.7, 18.2, 'F')
      doc.rect(M + 3.2, 18.1, 4.6, 3.1, 'F')
      text(BRAND.name, M + 14, 17, { size: 13, bold: true })
      text(BRAND.tagline, M + 14, 21.5, { size: 8.5, color: GRAY })
    }
    text(title, PAGE_W - M, 17, { size: 11, bold: true, align: 'right' })
    text(`Proposal ${number} | ${fmtDate(now)}`, PAGE_W - M, 21.5, { size: 8.5, color: GRAY, align: 'right' })
    rule(26, ACCENT, 0.8)
  }
  const recOf = (sec: RoomSection) => sec.data[0]
  const combinedLow = sections.reduce((n, sec) => n + recOf(sec).estimate.low, 0)
  const combinedHigh = sections.reduce((n, sec) => n + recOf(sec).estimate.high, 0)

  // ---------------- Cover ----------------
  const coverTitle = `${sections.map((s) => s.label).join(' & ')} Remodel Proposal`
  header(coverTitle)
  let y = 40
  text(coverTitle, M, y, { size: 24, bold: true, maxWidth: CONTENT_W })
  y += 11
  const col2 = M + CONTENT_W / 2 + 4
  text('PREPARED FOR', M, y, { size: 8, bold: true, color: GRAY })
  text('PREPARED BY', col2, y, { size: 8, bold: true, color: GRAY })
  y += 5.5
  const c = stored.customer
  const sp = settings.salesperson
  const forLines = [c.name || 'Homeowner', c.address, c.phone, c.email].filter(Boolean)
  const byLines = [sp.name || BRAND.name, sp.name ? BRAND.name : '', sp.phone || BRAND.phone, sp.email || BRAND.email, company.licenseNumber].filter(Boolean)
  forLines.forEach((l, i) => text(l, M, y + i * 5, { size: i === 0 ? 12 : 10, bold: i === 0, maxWidth: CONTENT_W / 2 - 4 }))
  byLines.forEach((l, i) => text(l, col2, y + i * 5, { size: i === 0 ? 12 : 10, bold: i === 0, maxWidth: CONTENT_W / 2 - 4 }))
  y += Math.max(forLines.length, byLines.length) * 5 + 3
  text(`Date: ${fmtDate(now)}     Valid through: ${fmtDate(validUntil)}`, M, y, { size: 9.5, color: GRAY })
  y += 7

  if (!multi) {
    const sec = sections[0]
    const data = sec.data
    const intro = (data.length === 1 ? PROPOSAL.introSingle : PROPOSAL.intro.replace('{count}', ['zero', 'one', 'two', 'three'][data.length] ?? String(data.length))).replaceAll('{room}', sec.word)
    y = para(intro, M, y, CONTENT_W, 10.5) + 2
    const rec = recOf(sec)
    const bigH = CONTENT_W * (9 / 16)
    image(rec.image ?? sec.heroImg, M, y, CONTENT_W, bigH)
    badge(rec.image ? (data.length > 1 ? 'RECOMMENDED' : `YOUR NEW ${sec.word.toUpperCase()}`) : `YOUR ${sec.word.toUpperCase()} TODAY`, M + 3, y + 7, 9)
    if (rec.image && rec.concept) conceptStamp(M, y, CONTENT_W, bigH)
    y += bigH + 5
    const smallW = 62
    const smallH = smallW * (9 / 16)
    if (rec.image && sec.heroImg) {
      image(sec.heroImg, M, y, smallW, smallH)
      badge('BEFORE', M + 2, y + 5.5, 7.5)
    }
    const tx = rec.image && sec.heroImg ? M + smallW + 8 : M
    text(rec.name, tx, y + 5, { size: 14, bold: true, maxWidth: PAGE_W - M - tx })
    text(moneyRange(rec.estimate.low, rec.estimate.high), tx, y + 13, { size: 18, bold: true, color: ACCENT })
    text('Estimated investment range', tx, y + 18.5, { size: 9, color: GRAY })
    text(data.length > 1 ? `See all ${data.length} options on the next page.` : 'Details on the next page.', tx, y + 26, { size: 9.5 })
  } else {
    y = para(PROPOSAL.introMulti.replace('{rooms}', sections.map((s) => s.word).join(' and ')), M, y, CONTENT_W, 10.5) + 3
    const imgW = 100
    const imgH = imgW * (9 / 16)
    for (const sec of sections) {
      const rec = recOf(sec)
      image(rec.image ?? sec.heroImg, M, y, imgW, imgH)
      if (rec.image && rec.concept) conceptStamp(M, y, imgW, imgH)
      const tx = M + imgW + 7
      text(sec.label.toUpperCase(), tx, y + 5, { size: 9, bold: true, color: GRAY })
      if (sec.data.length > 1) badge('RECOMMENDED', tx, y + 12, 7.5)
      const ny = sec.data.length > 1 ? y + 19 : y + 12
      para(rec.name, tx, ny, PAGE_W - M - tx, 13, INK, true)
      text(moneyRange(rec.estimate.low, rec.estimate.high), tx, ny + 13, { size: 15, bold: true, color: ACCENT })
      text(sec.data.length > 1 ? `${sec.data.length} options inside` : 'Details inside', tx, ny + 19, { size: 9, color: GRAY })
      y += imgH + 6
    }
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.5)
    doc.roundedRect(M, y, CONTENT_W, 16, 2, 2, 'S')
    text('Combined investment (recommended options)', M + 5, y + 10, { size: 11, bold: true })
    text(moneyRange(combinedLow, combinedHigh), PAGE_W - M - 5, y + 10.5, { size: 15, bold: true, color: ACCENT, align: 'right' })
  }

  // ---------------- Per room: options + investment ----------------
  for (const sec of sections) {
    const { project, data, recommended } = sec
    const m = project.measurements
    const b = project.bath

    doc.addPage()
    header(multi ? `${sec.label} Options` : 'Your Options')
    y = 36
    text(`Your ${sec.word} ${data.length > 1 ? 'options' : 'design'}, shown in your home`, M, y, { size: 16, bold: true })
    y += 6
    const rowsTop = y
    const rowsH = PAGE_H - 26 - rowsTop
    const rowH = rowsH / Math.max(data.length, 2)
    data.forEach((d, i) => {
      const top = rowsTop + i * rowH + 2
      const imgW = Math.min((rowH - 8) * (16 / 9), 86)
      const imgH = imgW * (9 / 16)
      image(d.image, M, top, imgW, imgH)
      if (d.image && d.concept) conceptStamp(M, top, imgW, imgH)
      const x = M + imgW + 6
      const w = PAGE_W - M - x
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12.5)
      const showBadge = d.look === recommended && data.length > 1
      let title = safe(d.name)
      const titleMax = w - (showBadge ? 30 : 0)
      while (doc.getTextWidth(title) > titleMax && title.length > 4) title = title.slice(0, -2)
      if (title !== safe(d.name)) title = title.trimEnd() + '...'
      text(title, x, top + 5, { size: 12.5, bold: true })
      if (showBadge) badge('RECOMMENDED', x + doc.getTextWidth(title) + 3, top + 5, 7.5)
      text(moneyRange(d.estimate.low, d.estimate.high), x, top + 11.5, { size: 12, bold: true, color: ACCENT })
      let my = top + 17.5
      const rows = materialRows(lookSelection(project, d.look), { room: project.roomType })
      const lineH = Math.min(4.6, Math.max(3.5, (rowH - 22) / rows.length))
      for (const row of rows) {
        doc.setDrawColor(170, 170, 170)
        doc.setLineWidth(0.2)
        if (row.swatch) {
          doc.setFillColor(...hex(row.swatch.color))
          doc.rect(x, my - 2.6, 3, 3, 'FD')
        } else doc.rect(x, my - 2.6, 3, 3, 'S')
        text(`${row.label}:`, x + 4.5, my, { size: 8, bold: true, color: row.kept ? GRAY : INK })
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
        text(t, x + 4.5 + lw, my, { size, color: row.kept ? GRAY : INK })
        my += lineH
      }
      if (i < data.length - 1) rule(rowsTop + (i + 1) * rowH - 1)
    })

    doc.addPage()
    header(multi ? `${sec.label} Investment` : 'Investment Summary')
    y = 36
    text(multi ? `${sec.label} investment summary` : 'Investment summary', M, y, { size: 16, bold: true })
    y += 4
    const groups = groupsFor(project.roomType)
    const groupsByLook = data.map((d) => groupEstimate(d.estimate, lookSelection(project, d.look), project.roomType))
    const groupKeys = groups.map((g) => g.key).filter((k) => groupsByLook.some((gs) => gs.some((g) => g.key === k)))
    const labelW = 52
    const colW = (CONTENT_W - labelW) / data.length
    const colX = (i: number) => M + labelW + i * colW + colW - 2
    y += 8
    text('Category', M, y, { size: 8.5, bold: true, color: GRAY })
    let headerLines = 1
    data.forEach((d, i) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const lines = (doc.splitTextToSize(safe(d.name), colW - 4) as string[]).slice(0, 3)
      headerLines = Math.max(headerLines, lines.length)
      doc.setTextColor(...(d.look === recommended && data.length > 1 ? ACCENT : INK))
      doc.text(lines, colX(i), y, { align: 'right' })
    })
    y += (headerLines - 1) * 9 * PT * 1.25 + 2.5
    rule(y, INK, 0.4)
    for (const k of groupKeys) {
      y += 7
      text(groups.find((g) => g.key === k)!.label, M, y, { size: 9.5, bold: true })
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
      text(safe(moneyRange(d.estimate.low, d.estimate.high)), colX(i), y, { size: 9.5, bold: true, align: 'right', color: ACCENT })
    })
    y += 3
    rule(y, INK, 0.4)
    y += 6
    y = para(
      `Category amounts are shown for comparison and include materials, labor and project management. Totals are shown as a range of plus or minus ${settings.pricing.rangePct}%.`,
      M, y, CONTENT_W, 8.5, GRAY,
    )

    y += 6
    text(`${sec.label} scope`, M, y, { size: 13, bold: true })
    y += 6
    const wallsRow: [string, string][] = project.walls.length
      ? [[
          'Wall removal',
          `${project.walls.map((w) => `${w.lengthFt || '?'} ft (${WALL_LABELS[w.structure].toLowerCase()})`).join('; ')}. Included in: ${
            data.filter((d) => lookWalls(project, d.look).length).map((d) => d.name).join(', ') || 'no options'
          }. Subject to structural review.`,
        ]]
      : []
    const scope: [string, string][] =
      project.roomType === 'bath'
        ? [
            ['Room', `Full bath remodel, approx. ${b.floorSqft} sq ft floor`],
            ['Shower / tub', `approx. ${b.showerTileSqft} sq ft of tiled walls where tile is chosen`],
            ['Demolition', b.demoScope === 'full-gut' ? 'Full gut to studs' : 'Partial demolition'],
            ...wallsRow,
            [
              'Also included',
              [
                b.demoScope === 'full-gut' ? 'new plumbing rough-in' : 'plumbing reconnect',
                b.movePlumbing && 'fixture relocation',
                b.electricalUpdates && 'electrical updates',
                b.exhaustFan && 'exhaust fan',
                b.heatedFloor && 'heated floor (with new flooring)',
                b.permits && 'permits & inspections',
              ]
                .filter(Boolean)
                .join(', '),
            ],
            ['Not included', 'Anything marked "Keep existing" in an option stays as it is today.'],
          ]
        : [
            ['Layout', `${{ 'l-shape': 'L-shape', 'u-shape': 'U-shape', galley: 'Galley', 'single-wall': 'Single wall' }[m.layout]}${m.hasIsland ? ` with ${m.islandLengthFt} x ${m.islandWidthFt} ft island` : ''}`],
            ['Cabinetry', `${m.baseCabinetLf} lin ft base, ${m.wallCabinetLf} lin ft wall${m.hasIsland ? `, ${m.islandLengthFt} lin ft island` : ''}`],
            ['Countertops', `approx. ${m.countertopSqft} sq ft`],
            ['Backsplash', `approx. ${m.backsplashSqft} sq ft`],
            ['Demolition', { 'full-gut': 'Full gut', 'cabinets-counters': 'Replace cabinets & counters', refresh: 'Refresh (keep cabinet boxes)' }[m.demoScope]],
            ...wallsRow,
            [
              'Also included',
              [
                m.movePlumbing ? 'plumbing relocation' : 'plumbing reconnect where needed',
                m.electricalUpdates ? 'electrical updates' : 'electrical reconnect where needed',
                m.permits && 'permits & inspections',
              ]
                .filter(Boolean)
                .join(', '),
            ],
            ['Not included', 'Anything marked "Keep existing" in an option stays as it is today.'],
          ]
    for (const [k, v] of scope) {
      text(k, M, y, { size: 9.5, bold: true })
      y = para(v, M + 38, y, CONTENT_W - 38, 9.5) + 1.2
    }
    y += 4
    y = para(PROPOSAL.terms, M, y, CONTENT_W, 8.5, GRAY)

    // ---------------- Selections & specifications (recommended option) ----------------
    const rec = recOf(sec)
    const specs = specRows(project, lookSelection(project, rec.look), settings.pricing)
    if (specs.length) {
      doc.addPage()
      header(multi ? `${sec.label} Specifications` : 'Specifications')
      y = 36
      text('Selections & specifications', M, y, { size: 16, bold: true })
      y += 6
      text(`${rec.name}${multi ? ` (${sec.label})` : ''}`, M, y, { size: 10.5, color: GRAY, maxWidth: CONTENT_W })
      y += 8
      // Columns: Item | Product | SKU / code | Qty | Lead time | Supplied
      const cols = [
        { label: 'Item', w: 28 },
        { label: 'Product', w: 52 },
        { label: 'SKU / code', w: 40 },
        { label: 'Qty', w: 18 },
        { label: 'Lead time', w: 23 },
        { label: 'Supplied', w: CONTENT_W - 161 },
      ]
      const drawRow = (cells: string[], bold: boolean, color: RGB) => {
        let x = M
        let lines = 1
        const wrapped = cells.map((c, i) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal')
          doc.setFontSize(8)
          const l = (doc.splitTextToSize(safe(c), cols[i].w - 2) as string[]).slice(0, 3)
          lines = Math.max(lines, l.length)
          return l
        })
        wrapped.forEach((l, i) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal')
          doc.setFontSize(8)
          doc.setTextColor(...color)
          doc.text(l, x, y)
          x += cols[i].w
        })
        y += lines * 8 * PT * 1.3 + 2
      }
      drawRow(cols.map((c) => c.label.toUpperCase()), true, GRAY)
      rule(y - 2.5, INK, 0.4)
      y += 2
      for (const r of specs) {
        if (y > PAGE_H - 40) break // one page is plenty for a single room
        drawRow([r.item, r.product, r.sku, r.qty, r.leadTime, r.supply], false, INK)
        rule(y - 2.5)
        y += 2
      }
      const longest = longestLead(specs)
      y += 3
      if (longest) {
        y = para(`Longest lead time: ${longest.leadTime} (${longest.item.toLowerCase()}). Installation is scheduled once materials are confirmed.`, M, y, CONTENT_W, 9, INK, true) + 1
      }
      y = para(
        'Allowance items are budgets for materials you choose later; the final price is adjusted up or down to your actual selection. Customer-supplied items are purchased by you and installed by us. Quantities are estimates and are confirmed at the final measure.',
        M, y, CONTENT_W, 8.5, GRAY,
      )
    }
  }

  // ---------------- Next steps & approval ----------------
  doc.addPage()
  header('Next Steps')
  y = 36
  const withViews = sections.find((sec) => sec.extraViews.length)
  if (withViews) {
    const rec = recOf(withViews)
    text(`More views: ${rec.name}${multi ? ` (${withViews.label})` : ''}`, M, y, { size: 13, bold: true, maxWidth: CONTENT_W })
    y += 4
    const views = withViews.extraViews
    const hh = Math.min(((views.length === 1 ? CONTENT_W * 0.6 : (CONTENT_W - 6) / 2) * 3) / 4, multi ? 48 : 62)
    const ww = hh * (4 / 3)
    views.forEach((v, i) => {
      image(v, M + i * (ww + 6), y, ww, hh)
      if (withViews.extraConcept) conceptStamp(M + i * (ww + 6), y, ww, hh)
    })
    y += hh + 9
  }
  text('Next steps', M, y, { size: 16, bold: true })
  y += 7
  PROPOSAL.nextSteps.forEach((st, i) => {
    doc.setFillColor(...ACCENT)
    doc.circle(M + 3.2, y - 1.3, 3.2, 'F')
    text(String(i + 1), M + 3.2, y, { size: 9.5, bold: true, color: [255, 255, 255], align: 'center' })
    text(st.title, M + 10, y, { size: 11, bold: true })
    y = para(st.text, M + 10, y + 5, CONTENT_W - 10, 9.5, GRAY) + 2.5
  })

  y += 2
  const boxTop = y
  y += 8
  text('Ready to move forward?', M + 6, y, { size: 14, bold: true })
  y += 5.5
  text(`This proposal is valid for ${PROPOSAL.validDays} days, through ${fmtDate(validUntil)}.`, M + 6, y, { size: 9.5, color: GRAY })
  y += 8
  for (const sec of sections) {
    text(multi ? `${sec.label}:` : sec.data.length > 1 ? 'I choose:' : 'I approve:', M + 6, y, { size: 10, bold: true })
    for (const d of sec.data) {
      doc.setDrawColor(...INK)
      doc.setLineWidth(0.35)
      doc.rect(M + 30, y - 3.4, 4, 4)
      text(`${d.name}  (${moneyRange(d.estimate.low, d.estimate.high)})`, M + 36, y, { size: 10, maxWidth: CONTENT_W - 42 })
      y += 6.5
    }
    y += multi ? 1.5 : 0
  }
  y += 6
  const sigW = (CONTENT_W - 12 - 10) * 0.66
  const dateX = M + 6 + sigW + 10
  const sigLine = (label: string) => {
    doc.setDrawColor(...INK)
    doc.setLineWidth(0.3)
    doc.line(M + 6, y, M + 6 + sigW, y)
    doc.line(dateX, y, PAGE_W - M - 6, y)
    text(label, M + 6, y + 4, { size: 8, color: GRAY })
    text('Date', dateX, y + 4, { size: 8, color: GRAY })
    y += 14
  }
  sigLine('Homeowner signature')
  sigLine('Homeowner signature')
  sigLine(`${BRAND.name} representative${sp.name ? ` (${sp.name})` : ''}`)
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.5)
  doc.roundedRect(M, boxTop, CONTENT_W, y - 5 - boxTop, 2, 2, 'S')

  // ---------------- Footer on every page ----------------
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    text(SAMPLE_PRICING_NOTICE.toUpperCase(), PAGE_W / 2, PAGE_H - 16.5, { size: 7.5, bold: true, align: 'center' })
    rule(PAGE_H - 14)
    text([BRAND.name, BRAND.phone, BRAND.website, company.licenseNumber].filter(Boolean).join(' | '), M, PAGE_H - 9.5, { size: 7.5, color: GRAY })
    text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 9.5, { size: 7.5, color: GRAY, align: 'right' })
  }

  const who = (c.name || 'Homeowner').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return {
    blob: doc.output('blob'),
    filename: `${BRAND.shortName.replace(/\s+/g, '-')}-Proposal-${who}-${number}.pdf`,
    number,
    pages,
  }
}
