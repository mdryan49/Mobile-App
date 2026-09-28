import { COUNTERTOP_LOOKS, resolveSelection, type Selection } from '../config/catalog'
import type { WallChange } from '../types'

/**
 * Prompts for Gemini image editing.
 * Rule #1: the homeowner must recognize THEIR kitchen. Only what the design option
 * chooses changes; everything else ("keep existing") stays exactly as photographed.
 */

const STYLE_RULES = `Output a single photorealistic photograph, like a professional real-estate photo of a freshly remodeled kitchen. Realistic materials, accurate reflections and shadows, straight vertical lines. No text, labels, watermarks, red markings or people.`

export type ChangeKey = 'cabinets' | 'hardware' | 'countertop' | 'backsplash' | 'sink' | 'paint' | 'flooring' | 'walls'

export const CHANGE_LABELS: Record<ChangeKey, string> = {
  cabinets: 'Cabinets',
  hardware: 'Hardware',
  countertop: 'Countertop',
  backsplash: 'Backsplash',
  sink: 'Sink & faucet',
  paint: 'Wall paint',
  flooring: 'Flooring',
  walls: 'Wall removal',
}

/** What each part of the kitchen should become. Only chosen items appear. */
function describe(sel: Selection): Partial<Record<ChangeKey, string>> {
  const r = resolveSelection(sel)
  const out: Partial<Record<ChangeKey, string>> = {}
  if (r.cabinetLine) {
    out.cabinets = `new ${r.cabinetFinish ? r.cabinetFinish.promptText : 'cabinets in the same color as now'} cabinets${r.doorStyle ? ` with ${r.doorStyle.promptText}` : ''}`
  } else if (r.cabinetFinish || r.doorStyle) {
    out.cabinets = `the existing cabinets${r.cabinetFinish ? ` refinished in ${r.cabinetFinish.promptText}` : ''}${r.doorStyle ? `, with ${r.doorStyle.promptText}` : ', same door style'}`
  }
  if (r.hardwareFinish) out.hardware = `${r.hardwareFinish.promptText} cabinet pulls and knobs`
  if (r.countertop) out.countertop = `${r.countertop.material.toLowerCase()} countertops: ${COUNTERTOP_LOOKS[r.countertop.id] ?? r.countertop.name}, polished, with a clean eased edge`
  if (r.backsplash) out.backsplash = `backsplash of ${r.backsplash.promptText}`
  if (r.sinkFaucet) out.sink = `${r.sinkFaucet.promptText}${r.faucetFinish ? `, faucet in ${r.faucetFinish.promptText}` : ''}`
  else if (r.faucetFinish) out.sink = `the existing sink with a faucet in ${r.faucetFinish.promptText}`
  if (r.paint) out.paint = `wall paint in ${r.paint.name} (${r.paint.brand} ${r.paint.code}), color ${r.paint.swatch.color}`
  if (r.flooring) out.flooring = r.flooring.promptText
  return out
}

/** Things a design leaves alone, stated explicitly so the AI doesn't "improve" them. */
function keepList(changing: Set<ChangeKey>): string {
  const keep = [
    'Camera position, angle, lens, framing and perspective',
    changing.has('walls') ? 'Every wall that is NOT marked for removal, plus the ceiling, windows, window blinds, doors and door trim' : 'Room layout, walls, ceiling, crown molding, windows, window blinds, doors and door trim',
    'All appliances (range, microwave, refrigerator, dishwasher, hood) with their current finish and position',
    'Light fixtures and their positions',
    'Cabinet boxes: same count, sizes, positions, and the same arrangement of doors and drawers',
    !changing.has('cabinets') && 'Cabinet color and door style (keep existing)',
    !changing.has('hardware') && 'Cabinet hardware (keep existing)',
    !changing.has('countertop') && 'Countertops (keep existing)',
    !changing.has('backsplash') && 'Backsplash (keep existing)',
    !changing.has('sink') && 'Sink and faucet (keep existing)',
    !changing.has('paint') && 'Wall paint color (keep existing)',
    !changing.has('flooring') && 'Flooring (keep existing)',
    'Natural lighting direction and time of day',
  ].filter(Boolean)
  return `KEEP EXACTLY THE SAME (do not move, resize, add, remove or restyle):\n${keep.map((k) => `- ${k}`).join('\n')}`
}

function wallInstructions(walls: WallChange[]): string {
  const notes = walls.map((w) => w.note.trim()).filter(Boolean)
  const bearing = walls.some((w) => w.structure !== 'non-bearing')
  return [
    `WALL REMOVAL: The SECOND image is the same view with the wall section(s) to remove painted in translucent red. In the output, remove that wall section completely so the kitchen opens to the space behind it.`,
    `Fill the opened area with a believable continuation of the adjoining room (matching flooring, ceiling height and lighting). Finish the ceiling where the wall was${bearing ? ' with a clean flush or slightly dropped drywall-wrapped beam' : ' smoothly, with no beam'}. Do not remove anything outside the red area.`,
    notes.length ? `Salesperson notes: ${notes.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

const DECLUTTER = `Tidy the countertops: remove loose clutter such as bottles, food, bags, papers, dish towels and cleaning products. Small appliances may stay but keep counters mostly clear and styled simply.`

/** Is this change something the design adds (vs. going back to "keep existing")? */
export function changeIsAddition(sel: Selection, c: ChangeKey): boolean {
  return !!describe(sel)[c]
}

/** Anything to render for this design on this photo? */
export function hasChanges(sel: Selection, walls: WallChange[]): boolean {
  return Object.keys(describe(sel)).length > 0 || walls.length > 0
}

/** Full restyle of the homeowner's original photo into one design option. */
export function fullRenderPrompt(sel: Selection, declutter: boolean, walls: WallChange[] = []): string {
  const d = describe(sel)
  const changing = new Set(Object.keys(d) as ChangeKey[])
  if (walls.length) changing.add('walls')
  const list = (Object.entries(d) as [ChangeKey, string][]).map(([k, v]) => `- ${CHANGE_LABELS[k]}: ${v}`)
  return [
    `Edit this photo of a homeowner's kitchen to show it after a remodel.`,
    keepList(changing),
    list.length ? `CHANGE ONLY THESE:\n${list.join('\n')}` : '',
    walls.length ? wallInstructions(walls) : '',
    declutter ? DECLUTTER : `Keep all items on the countertops as they are.`,
    STYLE_RULES,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Which visible finish each selection field controls (cabinet line and lighting affect price, not the picture). */
export const FIELD_TO_CHANGE: Partial<Record<keyof Selection, ChangeKey>> = {
  cabinetLineId: 'cabinets',
  cabinetFinishId: 'cabinets',
  doorStyleId: 'cabinets',
  countertopId: 'countertop',
  backsplashId: 'backsplash',
  hardwareFinishId: 'hardware',
  sinkFaucetId: 'sink',
  faucetFinishId: 'sink',
  paintId: 'paint',
  flooringId: 'flooring',
}

/**
 * Visible differences between what a rendering shows and the design now.
 * `walls` means the wall removal was switched on or off since that rendering.
 */
export function pendingChanges(rendered: Selection, current: Selection, renderedWalls = false, currentWalls = false): ChangeKey[] {
  const out = new Set<ChangeKey>()
  for (const [field, change] of Object.entries(FIELD_TO_CHANGE) as [keyof Selection, ChangeKey][]) {
    if (rendered[field] !== current[field]) out.add(change)
  }
  if (renderedWalls !== currentWalls) out.add('walls')
  return [...out]
}

/** Edit an existing rendering, changing ONLY the listed items. Anything set back to "keep existing" is left as rendered. */
export function changesPrompt(sel: Selection, changes: ChangeKey[], walls: WallChange[] = []): string {
  const d = describe(sel)
  const items = changes.filter((c) => c === 'walls' || d[c])
  const list = items.filter((c) => c !== 'walls').map((c) => `- ${CHANGE_LABELS[c]} → ${d[c]}`)
  const one = items.length === 1
  return [
    `This is a rendering of a remodeled kitchen. Make ${one ? 'exactly ONE change' : `ONLY these ${items.length} changes`} and leave everything else pixel-for-pixel identical.`,
    list.length ? `${one ? 'THE CHANGE' : 'THE CHANGES'}:\n${list.join('\n')}` : '',
    items.includes('walls') && walls.length ? wallInstructions(walls) : '',
    `Do not change anything else: keep every other finish, the appliances, layout, camera angle, framing, lighting and objects exactly as they are.`,
    STYLE_RULES,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const RATIOS: [string, number][] = [
  ['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['3:2', 3 / 2], ['2:3', 2 / 3], ['16:9', 16 / 9], ['9:16', 9 / 16], ['21:9', 21 / 9],
]

/** Closest aspect ratio Gemini supports, so the rendering lines up with the before photo. */
export function nearestAspectRatio(width: number, height: number): string {
  const target = width / height
  return RATIOS.reduce((best, cur) => (Math.abs(cur[1] - target) < Math.abs(best[1] - target) ? cur : best))[0]
}
