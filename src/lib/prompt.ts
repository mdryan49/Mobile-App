import { COUNTERTOP_LOOKS, resolveSelection, type Selection } from '../config/catalog'

/**
 * Prompts for Gemini image editing.
 * Rule #1: the homeowner must recognize THEIR kitchen. Only finishes change.
 */

const KEEP_IDENTICAL = `KEEP EXACTLY THE SAME (do not move, resize, add or remove):
- Camera position, angle, lens, framing and perspective
- Room layout, walls, ceiling, crown molding, windows, window blinds, doors and door trim
- Flooring
- All appliances (range, microwave, refrigerator, dishwasher, hood) with their current finish and position
- Light fixtures and their positions
- Cabinet boxes: same count, sizes, positions, and the same arrangement of doors and drawers
- Natural lighting direction and time of day`

const STYLE_RULES = `Output a single photorealistic photograph, like a professional real-estate photo of a freshly remodeled kitchen. Realistic materials, accurate reflections and shadows, straight vertical lines. No text, labels, watermarks or people.`

function describe(sel: Selection) {
  const r = resolveSelection(sel)
  return {
    cabinets: `${r.cabinetFinish.promptText} cabinets with ${r.doorStyle.promptText}`,
    hardware: `${r.hardwareFinish.promptText} cabinet pulls and knobs`,
    countertop: `${r.countertop.material.toLowerCase()} countertops: ${COUNTERTOP_LOOKS[r.countertop.id] ?? r.countertop.name}, polished, with a clean eased edge`,
    backsplash: `backsplash of ${r.backsplash.promptText}`,
    sink: `${r.sinkFaucet.promptText}, faucet in ${r.faucetFinish.promptText}`,
    paint: `wall paint in ${r.paint.name} (${r.paint.brand} ${r.paint.code}), color ${r.paint.swatch.color}`,
  }
}

export type ChangeKey = keyof ReturnType<typeof describe>

export const CHANGE_LABELS: Record<ChangeKey, string> = {
  cabinets: 'Cabinets',
  hardware: 'Hardware',
  countertop: 'Countertop',
  backsplash: 'Backsplash',
  sink: 'Sink & faucet',
  paint: 'Wall paint',
}

const DECLUTTER = `Tidy the countertops: remove loose clutter such as bottles, food, bags, papers, dish towels and cleaning products. Small appliances may stay but keep counters mostly clear and styled simply.`

/** Full restyle of the homeowner's original photo into one look. */
export function fullRenderPrompt(sel: Selection, declutter: boolean): string {
  const d = describe(sel)
  return [
    `Edit this photo of a homeowner's kitchen to show it after a remodel.`,
    KEEP_IDENTICAL,
    `CHANGE ONLY THESE FINISHES:
- Cabinets: ${d.cabinets}
- Hardware: ${d.hardware}
- Countertops: ${d.countertop}
- Backsplash: ${d.backsplash}
- Sink & faucet: ${d.sink}
- Walls: ${d.paint}`,
    declutter ? DECLUTTER : `Keep all items on the countertops as they are.`,
    STYLE_RULES,
  ].join('\n\n')
}

/** Which visible finish each selection field controls (cabinet line affects price, not the picture). */
export const FIELD_TO_CHANGE: Partial<Record<keyof Selection, ChangeKey>> = {
  cabinetFinishId: 'cabinets',
  doorStyleId: 'cabinets',
  countertopId: 'countertop',
  backsplashId: 'backsplash',
  hardwareFinishId: 'hardware',
  sinkFaucetId: 'sink',
  faucetFinishId: 'sink',
  paintId: 'paint',
}

/** Visible finishes that differ between what a rendering shows and the current selection. */
export function pendingChanges(rendered: Selection, current: Selection): ChangeKey[] {
  const out = new Set<ChangeKey>()
  for (const [field, change] of Object.entries(FIELD_TO_CHANGE) as [keyof Selection, ChangeKey][]) {
    if (rendered[field] !== current[field]) out.add(change)
  }
  return [...out]
}

/** Edit an existing rendering, changing ONLY the listed finishes (Mix & Match). */
export function changesPrompt(sel: Selection, changes: ChangeKey[]): string {
  const d = describe(sel)
  const list = changes.map((c) => `- ${CHANGE_LABELS[c]} → ${d[c]}`).join('\n')
  const one = changes.length === 1
  return [
    `This is a rendering of a remodeled kitchen. Make ${one ? 'exactly ONE change' : `ONLY these ${changes.length} changes`} and leave everything else pixel-for-pixel identical.`,
    `${one ? 'THE CHANGE' : 'THE CHANGES'}:\n${list}`,
    `Do not change anything else: keep every other finish, the appliances, layout, camera angle, framing, lighting and objects exactly as they are.`,
    STYLE_RULES,
  ].join('\n\n')
}

const RATIOS: [string, number][] = [
  ['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['3:2', 3 / 2], ['2:3', 2 / 3], ['16:9', 16 / 9], ['9:16', 9 / 16], ['21:9', 21 / 9],
]

/** Closest aspect ratio Gemini supports, so the rendering lines up with the before photo. */
export function nearestAspectRatio(width: number, height: number): string {
  const target = width / height
  return RATIOS.reduce((best, cur) => (Math.abs(cur[1] - target) < Math.abs(best[1] - target) ? cur : best))[0]
}
