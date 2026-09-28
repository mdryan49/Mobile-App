/**
 * MATERIALS CATALOG — SAMPLE DATA ONLY.
 * Brand names are placeholders for demonstration; all prices are sample prices.
 * Edit this file to change products, prices, or swatches. No other code changes needed.
 *
 * Units:  lf = linear foot · sqft = square foot · each = per piece · pkg = package
 * Swatch: `color` is the main color; `accent` + `pattern` add speckle/veining/wood grain.
 */

export type Tier = 'good' | 'better' | 'best'
export const TIERS: Tier[] = ['good', 'better', 'best']
export const TIER_LABELS: Record<Tier | 'custom', string> = {
  good: 'Good',
  better: 'Better',
  best: 'Best',
  custom: 'Custom Mix',
}

export type SwatchPattern = 'solid' | 'speckle' | 'veined' | 'wood' | 'tile' | 'metal'
export interface Swatch {
  color: string
  accent?: string
  pattern?: SwatchPattern
}

interface BaseItem {
  id: string
  name: string
  brand: string
  tier: Tier
  swatch: Swatch
}

// ---------------- Cabinets (MasterBrand Cabinets family) ----------------

export interface CabinetLine extends BaseItem {
  unit: 'lf'
  /** Base cabinets, per linear foot */
  baseCostPerLf: number
  /** Wall (upper) cabinets, per linear foot */
  wallCostPerLf: number
  description: string
}

export const CABINET_LINES: CabinetLine[] = [
  {
    id: 'aristokraft', name: 'Aristokraft', brand: 'MasterBrand Cabinets', tier: 'good', unit: 'lf',
    baseCostPerLf: 260, wallCostPerLf: 190, description: 'Framed, value line',
    swatch: { color: '#d9d4cc' },
  },
  {
    id: 'diamond', name: 'Diamond', brand: 'MasterBrand Cabinets', tier: 'better', unit: 'lf',
    baseCostPerLf: 380, wallCostPerLf: 280, description: 'Semi-custom, soft-close, more sizes',
    swatch: { color: '#cfc8bd' },
  },
  {
    id: 'decora', name: 'Decorá', brand: 'MasterBrand Cabinets', tier: 'best', unit: 'lf',
    baseCostPerLf: 560, wallCostPerLf: 410, description: 'Custom-grade, all plywood, premium finishes',
    swatch: { color: '#c4bcae' },
  },
]

export interface DoorStyle {
  id: string
  name: string
  /** Multiplies the cabinet line price */
  priceMultiplier: number
  description: string
  promptText: string
}

export const DOOR_STYLES: DoorStyle[] = [
  { id: 'shaker', name: 'Shaker', priceMultiplier: 1.0, description: 'Five-piece door with recessed center panel', promptText: 'shaker-style five-piece doors with a recessed flat center panel' },
  { id: 'slab', name: 'Slab', priceMultiplier: 0.95, description: 'Flat, modern, no frame', promptText: 'flat modern slab doors and drawer fronts with no frame detail' },
  { id: 'raised', name: 'Raised Panel', priceMultiplier: 1.08, description: 'Traditional raised center panel', promptText: 'traditional raised-panel doors' },
]

export interface CabinetFinish {
  id: string
  name: string
  /** Percent added to cabinet price, e.g. 0.05 = +5% */
  upcharge: number
  swatch: Swatch
  /** Plain-English description used in AI rendering prompts */
  promptText: string
}

export const CABINET_FINISHES: CabinetFinish[] = [
  { id: 'white', name: 'White', upcharge: 0, swatch: { color: '#f5f3ee' }, promptText: 'soft white painted' },
  { id: 'gray', name: 'Gray', upcharge: 0, swatch: { color: '#9a9a96' }, promptText: 'medium warm gray painted' },
  { id: 'navy', name: 'Navy', upcharge: 0.05, swatch: { color: '#1f2d4a' }, promptText: 'deep navy blue painted' },
  { id: 'sage', name: 'Sage', upcharge: 0.05, swatch: { color: '#9aa88f' }, promptText: 'muted sage green painted' },
  { id: 'natural', name: 'Natural Wood', upcharge: 0.08, swatch: { color: '#c49a6c', accent: '#a87c4f', pattern: 'wood' }, promptText: 'natural light oak wood grain' },
  { id: 'espresso', name: 'Espresso', upcharge: 0.03, swatch: { color: '#3b2a22', accent: '#2a1d17', pattern: 'wood' }, promptText: 'dark espresso stained wood' },
]

// ---------------- Countertops (priced per sq ft INSTALLED) ----------------

export interface Countertop extends BaseItem {
  unit: 'sqft'
  material: 'Granite' | 'Quartz'
  /** Material + fabrication + install, per sq ft */
  installedCostPerSqft: number
}

const granite = (id: string, name: string, cost: number, swatch: Swatch): Countertop =>
  ({ id, name, brand: 'Arizona Tile', material: 'Granite', tier: 'good', unit: 'sqft', installedCostPerSqft: cost, swatch })
const silestone = (id: string, name: string, cost: number, swatch: Swatch): Countertop =>
  ({ id, name, brand: 'Silestone', material: 'Quartz', tier: 'better', unit: 'sqft', installedCostPerSqft: cost, swatch })
const cambria = (id: string, name: string, cost: number, swatch: Swatch): Countertop =>
  ({ id, name, brand: 'Cambria', material: 'Quartz', tier: 'best', unit: 'sqft', installedCostPerSqft: cost, swatch })

export const COUNTERTOPS: Countertop[] = [
  granite('az-luna-pearl', 'Luna Pearl', 55, { color: '#d8d4cf', accent: '#5b5753', pattern: 'speckle' }),
  granite('az-colonial-white', 'Colonial White', 58, { color: '#e6e1d8', accent: '#7d6f66', pattern: 'speckle' }),
  granite('az-steel-grey', 'Steel Grey', 56, { color: '#5e6064', accent: '#2e3033', pattern: 'speckle' }),
  granite('az-absolute-black', 'Absolute Black', 62, { color: '#1c1c1d', accent: '#343437', pattern: 'speckle' }),
  granite('az-santa-cecilia', 'Santa Cecilia', 57, { color: '#c9a978', accent: '#6b4f33', pattern: 'speckle' }),

  silestone('si-miami-white', 'Miami White', 82, { color: '#f4f3f0' }),
  silestone('si-calacatta-gold', 'Calacatta Gold', 94, { color: '#f2eee7', accent: '#b8a07a', pattern: 'veined' }),
  silestone('si-desert-silver', 'Desert Silver', 84, { color: '#c9c7c3', accent: '#a09d98', pattern: 'speckle' }),
  silestone('si-charcoal-soapstone', 'Charcoal Soapstone', 90, { color: '#3a3b3c', accent: '#6d6e6f', pattern: 'veined' }),
  silestone('si-et-marquina', 'Et. Marquina', 92, { color: '#161616', accent: '#e6e6e6', pattern: 'veined' }),

  cambria('ca-brittanicca', 'Brittanicca', 118, { color: '#f3f1ed', accent: '#6f6c68', pattern: 'veined' }),
  cambria('ca-skara-brae', 'Skara Brae', 112, { color: '#ebe6dc', accent: '#b5a893', pattern: 'veined' }),
  cambria('ca-inverness-frost', 'Inverness Frost', 110, { color: '#ededea', accent: '#9a9894', pattern: 'veined' }),
  cambria('ca-ella', 'Ella', 115, { color: '#f0ede6', accent: '#8d8a84', pattern: 'veined' }),
  cambria('ca-portrush', 'Portrush', 108, { color: '#dcdad5', accent: '#8b8984', pattern: 'speckle' }),
  cambria('ca-torquay', 'Torquay', 106, { color: '#f1efea', accent: '#c9c5bd', pattern: 'speckle' }),
]

/** How each countertop looks, in plain English, for AI rendering prompts */
export const COUNTERTOP_LOOKS: Record<string, string> = {
  'az-luna-pearl': 'light gray granite with fine black and silver speckles',
  'az-colonial-white': 'creamy white granite with soft gray and burgundy flecks',
  'az-steel-grey': 'dark steel gray granite with a fine even grain',
  'az-absolute-black': 'solid deep black granite with a subtle sheen',
  'az-santa-cecilia': 'golden beige granite with brown and burgundy speckles',
  'si-miami-white': 'pure bright white solid quartz with no pattern',
  'si-calacatta-gold': 'white quartz with dramatic soft gold and gray marble-style veining',
  'si-desert-silver': 'light silver-gray quartz with a subtle fine grain',
  'si-charcoal-soapstone': 'matte charcoal soapstone-look quartz with faint light veins',
  'si-et-marquina': 'black quartz with bold crisp white marble-style veining',
  'ca-brittanicca': 'bright white quartz with bold flowing gray marble-style veins',
  'ca-skara-brae': 'warm white quartz with soft taupe and cream veining',
  'ca-inverness-frost': 'frosty white quartz with delicate gray veining',
  'ca-ella': 'soft white quartz with thin elegant gray veins',
  'ca-portrush': 'light gray quartz with a subtle cloudy texture',
  'ca-torquay': 'white quartz with a soft, subtle pearl-gray speckle',
}

// ---------------- Backsplash tile (Arizona Tile, per sq ft material) ----------------

export interface BacksplashTile extends BaseItem {
  unit: 'sqft'
  style: 'Subway' | 'Zellige-look' | 'Large Format'
  materialCostPerSqft: number
  promptText: string
}

export const BACKSPLASHES: BacksplashTile[] = [
  { id: 'bs-subway-white', name: 'White Gloss Subway 3x6', style: 'Subway', brand: 'Arizona Tile', tier: 'good', unit: 'sqft', materialCostPerSqft: 6, swatch: { color: '#f7f7f5', accent: '#d9d9d6', pattern: 'tile' }, promptText: 'classic white glossy 3x6 subway tile in a running bond pattern' },
  { id: 'bs-subway-gray', name: 'Dove Gray Subway 3x12', style: 'Subway', brand: 'Arizona Tile', tier: 'good', unit: 'sqft', materialCostPerSqft: 8, swatch: { color: '#c6c5c1', accent: '#a9a8a4', pattern: 'tile' }, promptText: 'soft dove gray 3x12 subway tile in a stacked pattern' },
  { id: 'bs-zellige-white', name: 'Zellige-look Blanco', style: 'Zellige-look', brand: 'Arizona Tile', tier: 'better', unit: 'sqft', materialCostPerSqft: 18, swatch: { color: '#f1ede4', accent: '#d8d0bf', pattern: 'tile' }, promptText: 'handmade-look glossy white zellige tile with subtle variation' },
  { id: 'bs-zellige-sage', name: 'Zellige-look Sage', style: 'Zellige-look', brand: 'Arizona Tile', tier: 'better', unit: 'sqft', materialCostPerSqft: 20, swatch: { color: '#a9b5a0', accent: '#8e9c85', pattern: 'tile' }, promptText: 'handmade-look glossy sage green zellige tile' },
  { id: 'bs-zellige-navy', name: 'Zellige-look Navy', style: 'Zellige-look', brand: 'Arizona Tile', tier: 'better', unit: 'sqft', materialCostPerSqft: 20, swatch: { color: '#2d3d5c', accent: '#1f2b44', pattern: 'tile' }, promptText: 'handmade-look glossy navy blue zellige tile' },
  { id: 'bs-lf-calacatta', name: 'Calacatta Porcelain 24x48', style: 'Large Format', brand: 'Arizona Tile', tier: 'best', unit: 'sqft', materialCostPerSqft: 26, swatch: { color: '#f3f0ea', accent: '#b3a58c', pattern: 'veined' }, promptText: 'large-format 24x48 calacatta-look white marble porcelain with soft gold veining, minimal grout lines' },
  { id: 'bs-lf-concrete', name: 'Concrete Porcelain 24x48', style: 'Large Format', brand: 'Arizona Tile', tier: 'best', unit: 'sqft', materialCostPerSqft: 22, swatch: { color: '#a3a19c', accent: '#8a8883', pattern: 'speckle' }, promptText: 'large-format 24x48 light concrete-look porcelain tile, minimal grout lines' },
]

// ---------------- Sinks & faucets (Kohler, per package) ----------------

export interface SinkFaucetPackage extends BaseItem {
  unit: 'pkg'
  sink: string
  faucet: string
  cost: number
  promptText: string
}

export const SINK_FAUCETS: SinkFaucetPackage[] = [
  { id: 'kohler-good', name: 'Verse sink + Simplice faucet', brand: 'Kohler', tier: 'good', unit: 'pkg', sink: 'Verse undermount stainless steel', faucet: 'Simplice pull-down', cost: 650, swatch: { color: '#b9bcbf', pattern: 'metal' }, promptText: 'an undermount stainless sink with a simple pull-down faucet' },
  { id: 'kohler-better', name: 'Prolific workstation + Crue faucet', brand: 'Kohler', tier: 'better', unit: 'pkg', sink: 'Prolific stainless workstation', faucet: 'Crue semi-professional', cost: 1250, swatch: { color: '#a9adb1', pattern: 'metal' }, promptText: 'a stainless workstation sink with a semi-professional coil-spring faucet' },
  { id: 'kohler-best', name: 'Whitehaven farmhouse + Artifacts faucet', brand: 'Kohler', tier: 'best', unit: 'pkg', sink: 'Whitehaven cast-iron farmhouse', faucet: 'Artifacts bridge', cost: 2400, swatch: { color: '#f2f1ec' }, promptText: 'a white cast-iron farmhouse apron-front sink with a vintage bridge faucet' },
]

// ---------------- Metal finishes (faucets & cabinet hardware) ----------------

export interface MetalFinish {
  id: string
  name: string
  swatch: Swatch
  promptText: string
}

export const METAL_FINISHES: MetalFinish[] = [
  { id: 'chrome', name: 'Polished Chrome', swatch: { color: '#d6d9dc', accent: '#9fa4a9', pattern: 'metal' }, promptText: 'polished chrome' },
  { id: 'stainless', name: 'Stainless', swatch: { color: '#b9bcbf', accent: '#8f9296', pattern: 'metal' }, promptText: 'brushed stainless steel' },
  { id: 'nickel', name: 'Brushed Nickel', swatch: { color: '#c3bfb6', accent: '#9a968e', pattern: 'metal' }, promptText: 'brushed nickel' },
  { id: 'black', name: 'Matte Black', swatch: { color: '#232323', accent: '#3a3a3a', pattern: 'metal' }, promptText: 'matte black' },
  { id: 'brass', name: 'Brushed Brass', swatch: { color: '#c9a55c', accent: '#a8843d', pattern: 'metal' }, promptText: 'brushed brass' },
]

/** Faucet finish upcharge added to the sink & faucet package */
export const FAUCET_FINISH_UPCHARGE: Record<string, number> = {
  chrome: 0,
  stainless: 0,
  black: 90,
  brass: 180,
}
export const FAUCET_FINISH_IDS = Object.keys(FAUCET_FINISH_UPCHARGE)

/** Cabinet hardware (pulls/knobs), cost per piece */
export const HARDWARE_COST_EACH: Record<string, number> = {
  chrome: 6,
  nickel: 8,
  black: 9,
  brass: 14,
}
export const HARDWARE_FINISH_IDS = Object.keys(HARDWARE_COST_EACH)

// ---------------- Wall paint (labor & paint priced in Settings) ----------------

export interface PaintColor {
  id: string
  name: string
  brand: string
  code: string
  swatch: Swatch
}

export const PAINT_COLORS: PaintColor[] = [
  { id: 'sw-alabaster', name: 'Alabaster', brand: 'Sherwin-Williams', code: 'SW 7008', swatch: { color: '#edeae0' } },
  { id: 'sw-pure-white', name: 'Pure White', brand: 'Sherwin-Williams', code: 'SW 7005', swatch: { color: '#f1efe8' } },
  { id: 'sw-agreeable-gray', name: 'Agreeable Gray', brand: 'Sherwin-Williams', code: 'SW 7029', swatch: { color: '#d1cbc1' } },
  { id: 'sw-repose-gray', name: 'Repose Gray', brand: 'Sherwin-Williams', code: 'SW 7015', swatch: { color: '#ccc9c0' } },
  { id: 'sw-accessible-beige', name: 'Accessible Beige', brand: 'Sherwin-Williams', code: 'SW 7036', swatch: { color: '#d1c7b8' } },
  { id: 'bm-chantilly-lace', name: 'Chantilly Lace', brand: 'Benjamin Moore', code: 'OC-65', swatch: { color: '#f4f3ee' } },
  { id: 'bm-pale-oak', name: 'Pale Oak', brand: 'Benjamin Moore', code: 'OC-20', swatch: { color: '#ddd4c8' } },
  { id: 'bm-classic-gray', name: 'Classic Gray', brand: 'Benjamin Moore', code: 'OC-23', swatch: { color: '#e0ddd6' } },
  { id: 'bm-revere-pewter', name: 'Revere Pewter', brand: 'Benjamin Moore', code: 'HC-172', swatch: { color: '#ccc4b6' } },
  { id: 'bm-edgecomb-gray', name: 'Edgecomb Gray', brand: 'Benjamin Moore', code: 'HC-173', swatch: { color: '#d8d0c3' } },
]

// ---------------- Default look for each tier ----------------

export interface Selection {
  cabinetLineId: string
  doorStyleId: string
  cabinetFinishId: string
  countertopId: string
  backsplashId: string
  sinkFaucetId: string
  faucetFinishId: string
  hardwareFinishId: string
  paintId: string
}

export const TIER_DEFAULTS: Record<Tier, Selection> = {
  good: {
    cabinetLineId: 'aristokraft', doorStyleId: 'shaker', cabinetFinishId: 'white',
    countertopId: 'az-luna-pearl', backsplashId: 'bs-subway-white',
    sinkFaucetId: 'kohler-good', faucetFinishId: 'chrome', hardwareFinishId: 'nickel',
    paintId: 'sw-agreeable-gray',
  },
  better: {
    cabinetLineId: 'diamond', doorStyleId: 'shaker', cabinetFinishId: 'sage',
    countertopId: 'si-calacatta-gold', backsplashId: 'bs-zellige-white',
    sinkFaucetId: 'kohler-better', faucetFinishId: 'black', hardwareFinishId: 'black',
    paintId: 'sw-alabaster',
  },
  best: {
    cabinetLineId: 'decora', doorStyleId: 'slab', cabinetFinishId: 'navy',
    countertopId: 'ca-brittanicca', backsplashId: 'bs-lf-calacatta',
    sinkFaucetId: 'kohler-best', faucetFinishId: 'brass', hardwareFinishId: 'brass',
    paintId: 'bm-chantilly-lace',
  },
}

// ---------------- Lookup helpers ----------------

const byId = <T extends { id: string }>(list: T[], id: string, fallback: T) => list.find((x) => x.id === id) ?? fallback

export function resolveSelection(s: Selection) {
  return {
    cabinetLine: byId(CABINET_LINES, s.cabinetLineId, CABINET_LINES[0]),
    doorStyle: byId(DOOR_STYLES, s.doorStyleId, DOOR_STYLES[0]),
    cabinetFinish: byId(CABINET_FINISHES, s.cabinetFinishId, CABINET_FINISHES[0]),
    countertop: byId(COUNTERTOPS, s.countertopId, COUNTERTOPS[0]),
    backsplash: byId(BACKSPLASHES, s.backsplashId, BACKSPLASHES[0]),
    sinkFaucet: byId(SINK_FAUCETS, s.sinkFaucetId, SINK_FAUCETS[0]),
    faucetFinish: byId(METAL_FINISHES, s.faucetFinishId, METAL_FINISHES[0]),
    hardwareFinish: byId(METAL_FINISHES, s.hardwareFinishId, METAL_FINISHES[0]),
    paint: byId(PAINT_COLORS, s.paintId, PAINT_COLORS[0]),
  }
}
export type ResolvedSelection = ReturnType<typeof resolveSelection>
