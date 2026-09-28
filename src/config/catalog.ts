/**
 * MATERIALS CATALOG — SAMPLE DATA ONLY.
 * Brand names are placeholders for demonstration; all prices are sample prices.
 * Edit this file to change products, prices, suppliers or swatches. No other code changes needed.
 *
 * Only list products your suppliers can actually deliver. Set `available: false` to hide
 * an item from the pickers without deleting it (e.g. backordered or discontinued).
 *
 * Units:  lf = linear foot · sqft = square foot · each = per piece · pkg = package
 * Swatch: `color` is the main color; `accent` + `pattern` add speckle/veining/wood grain.
 */

/** Who you buy each product from. Rename these to your real suppliers. */
export const SUPPLIERS = {
  cabinets: 'Cabinet supplier (MasterBrand dealer)',
  stone: 'Countertop fabricator',
  tile: 'Arizona Tile',
  plumbing: 'Plumbing supplier (Kohler)',
  hardware: 'Hardware supplier',
  paint: 'Paint store',
  flooring: 'Flooring supplier',
  lighting: 'Lighting & electrical supplier',
  vanities: 'Vanity supplier',
  bathFixtures: 'Plumbing supplier (bath)',
  glass: 'Shower glass fabricator',
} as const

/** Which rooms a product is offered in (omit = all rooms). */
export type CatalogRoom = 'kitchen' | 'bath'

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
  supplier: string
  /** false hides it from the pickers (backordered, discontinued...) */
  available?: boolean
  /** Rooms this product is offered in; omit for every room */
  rooms?: CatalogRoom[]
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
    id: 'aristokraft', name: 'Aristokraft', brand: 'MasterBrand Cabinets', supplier: SUPPLIERS.cabinets, unit: 'lf',
    baseCostPerLf: 260, wallCostPerLf: 190, description: 'Framed, value line',
    swatch: { color: '#d9d4cc' },
  },
  {
    id: 'diamond', name: 'Diamond', brand: 'MasterBrand Cabinets', supplier: SUPPLIERS.cabinets, unit: 'lf',
    baseCostPerLf: 380, wallCostPerLf: 280, description: 'Semi-custom, soft-close, more sizes',
    swatch: { color: '#cfc8bd' },
  },
  {
    id: 'decora', name: 'Decorá', brand: 'MasterBrand Cabinets', supplier: SUPPLIERS.cabinets, unit: 'lf',
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
  ({ id, name, brand: 'Arizona Tile', supplier: SUPPLIERS.stone, material: 'Granite', unit: 'sqft', installedCostPerSqft: cost, swatch })
const silestone = (id: string, name: string, cost: number, swatch: Swatch): Countertop =>
  ({ id, name, brand: 'Silestone', supplier: SUPPLIERS.stone, material: 'Quartz', unit: 'sqft', installedCostPerSqft: cost, swatch })
const cambria = (id: string, name: string, cost: number, swatch: Swatch): Countertop =>
  ({ id, name, brand: 'Cambria', supplier: SUPPLIERS.stone, material: 'Quartz', unit: 'sqft', installedCostPerSqft: cost, swatch })

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
  { id: 'bs-subway-white', name: 'White Gloss Subway 3x6', style: 'Subway', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 6, swatch: { color: '#f7f7f5', accent: '#d9d9d6', pattern: 'tile' }, promptText: 'classic white glossy 3x6 subway tile in a running bond pattern' },
  { id: 'bs-subway-gray', name: 'Dove Gray Subway 3x12', style: 'Subway', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 8, swatch: { color: '#c6c5c1', accent: '#a9a8a4', pattern: 'tile' }, promptText: 'soft dove gray 3x12 subway tile in a stacked pattern' },
  { id: 'bs-zellige-white', name: 'Zellige-look Blanco', style: 'Zellige-look', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 18, swatch: { color: '#f1ede4', accent: '#d8d0bf', pattern: 'tile' }, promptText: 'handmade-look glossy white zellige tile with subtle variation' },
  { id: 'bs-zellige-sage', name: 'Zellige-look Sage', style: 'Zellige-look', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 20, swatch: { color: '#a9b5a0', accent: '#8e9c85', pattern: 'tile' }, promptText: 'handmade-look glossy sage green zellige tile' },
  { id: 'bs-zellige-navy', name: 'Zellige-look Navy', style: 'Zellige-look', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 20, swatch: { color: '#2d3d5c', accent: '#1f2b44', pattern: 'tile' }, promptText: 'handmade-look glossy navy blue zellige tile' },
  { id: 'bs-lf-calacatta', name: 'Calacatta Porcelain 24x48', style: 'Large Format', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 26, swatch: { color: '#f3f0ea', accent: '#b3a58c', pattern: 'veined' }, promptText: 'large-format 24x48 calacatta-look white marble porcelain with soft gold veining, minimal grout lines' },
  { id: 'bs-lf-concrete', name: 'Concrete Porcelain 24x48', style: 'Large Format', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', materialCostPerSqft: 22, swatch: { color: '#a3a19c', accent: '#8a8883', pattern: 'speckle' }, promptText: 'large-format 24x48 light concrete-look porcelain tile, minimal grout lines' },
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
  { id: 'kohler-good', name: 'Verse sink + Simplice faucet', brand: 'Kohler', supplier: SUPPLIERS.plumbing, unit: 'pkg', sink: 'Verse undermount stainless steel', faucet: 'Simplice pull-down', cost: 650, swatch: { color: '#b9bcbf', pattern: 'metal' }, promptText: 'an undermount stainless sink with a simple pull-down faucet' },
  { id: 'kohler-better', name: 'Prolific workstation + Crue faucet', brand: 'Kohler', supplier: SUPPLIERS.plumbing, unit: 'pkg', sink: 'Prolific stainless workstation', faucet: 'Crue semi-professional', cost: 1250, swatch: { color: '#a9adb1', pattern: 'metal' }, promptText: 'a stainless workstation sink with a semi-professional coil-spring faucet' },
  { id: 'kohler-best', name: 'Whitehaven farmhouse + Artifacts faucet', brand: 'Kohler', supplier: SUPPLIERS.plumbing, unit: 'pkg', sink: 'Whitehaven cast-iron farmhouse', faucet: 'Artifacts bridge', cost: 2400, swatch: { color: '#f2f1ec' }, promptText: 'a white cast-iron farmhouse apron-front sink with a vintage bridge faucet' },
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
  nickel: 60,
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

// ---------------- Flooring (priced per sq ft INSTALLED) ----------------

export interface Flooring extends BaseItem {
  unit: 'sqft'
  installedCostPerSqft: number
  promptText: string
}

export const FLOORING: Flooring[] = [
  { id: 'fl-lvp-oak', name: 'Natural Oak LVP', brand: 'Luxury vinyl plank', supplier: SUPPLIERS.flooring, unit: 'sqft', installedCostPerSqft: 7, swatch: { color: '#c9a77c', accent: '#a8845a', pattern: 'wood' }, promptText: 'natural light oak luxury vinyl plank flooring' },
  { id: 'fl-lvp-walnut', name: 'Smoked Walnut LVP', brand: 'Luxury vinyl plank', supplier: SUPPLIERS.flooring, unit: 'sqft', installedCostPerSqft: 7.5, swatch: { color: '#6b4b34', accent: '#523624', pattern: 'wood' }, promptText: 'warm dark walnut luxury vinyl plank flooring' },
  { id: 'fl-eng-white-oak', name: 'White Oak Engineered', brand: 'Engineered hardwood', supplier: SUPPLIERS.flooring, rooms: ['kitchen'], unit: 'sqft', installedCostPerSqft: 12, swatch: { color: '#d2b48c', accent: '#b8966a', pattern: 'wood' }, promptText: 'wide-plank white oak engineered hardwood flooring, matte finish' },
  { id: 'fl-hex-marble', name: 'Marble-look Hex Mosaic', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, rooms: ['bath'], unit: 'sqft', installedCostPerSqft: 22, swatch: { color: '#eeece8', accent: '#b9b6b0', pattern: 'tile' }, promptText: 'small white marble-look hexagon mosaic floor tile with gray veining' },
  { id: 'fl-wood-porc', name: 'Wood-look Porcelain Plank', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', installedCostPerSqft: 13, swatch: { color: '#b89572', accent: '#9a7852', pattern: 'wood' }, promptText: 'warm oak wood-look porcelain plank floor tile' },
  { id: 'fl-porc-stone', name: 'Stone-look Porcelain 12x24', brand: 'Arizona Tile', supplier: SUPPLIERS.tile, unit: 'sqft', installedCostPerSqft: 14, swatch: { color: '#bdb8ae', accent: '#9e998f', pattern: 'tile' }, promptText: 'large 12x24 warm gray stone-look porcelain floor tile' },
]

// ---------------- Lighting packages (installed) ----------------

export interface LightingPackage extends BaseItem {
  unit: 'pkg'
  cost: number
  description: string
}

export const LIGHTING: LightingPackage[] = [
  { id: 'lt-recessed', name: 'Recessed LED package', brand: 'LED', supplier: SUPPLIERS.lighting, unit: 'pkg', cost: 1200, description: '6 recessed LED cans', swatch: { color: '#f4f1e8' } },
  { id: 'lt-recessed-ucl', name: 'Recessed + under-cabinet', brand: 'LED', supplier: SUPPLIERS.lighting, unit: 'pkg', cost: 2200, description: 'Recessed cans plus LED under-cabinet strips', swatch: { color: '#f7e9c7' } },
  { id: 'lt-full', name: 'Full lighting package', brand: 'LED', supplier: SUPPLIERS.lighting, unit: 'pkg', cost: 3800, description: 'Recessed, under-cabinet and 3 island pendants', swatch: { color: '#e9d39c' } },
]

// ================= BATH =================

// ---------------- Vanities (color & door style come from CABINET_FINISHES / DOOR_STYLES) ----------------

export interface Vanity extends BaseItem {
  unit: 'each'
  widthIn: number
  sinks: 1 | 2
  mount: 'floor' | 'floating'
  cost: number
  promptText: string
}

const vanity = (id: string, name: string, widthIn: number, sinks: 1 | 2, mount: 'floor' | 'floating', cost: number): Vanity => ({
  id, name, brand: 'Diamond Bath', supplier: SUPPLIERS.vanities, rooms: ['bath'], unit: 'each', widthIn, sinks, mount, cost,
  swatch: { color: '#e8e4dc' },
  promptText: `a ${widthIn}-inch ${mount === 'floating' ? 'wall-hung floating' : 'floor-standing'} ${sinks === 2 ? 'double-sink ' : ''}bathroom vanity`,
})

export const VANITIES: Vanity[] = [
  vanity('van-30', '30" vanity', 30, 1, 'floor', 650),
  vanity('van-36', '36" vanity', 36, 1, 'floor', 850),
  vanity('van-48', '48" vanity', 48, 1, 'floor', 1150),
  vanity('van-60d', '60" double vanity', 60, 2, 'floor', 1650),
  vanity('van-36f', '36" floating vanity', 36, 1, 'floating', 1100),
  vanity('van-60fd', '60" floating double vanity', 60, 2, 'floating', 2100),
]

// ---------------- Shower / tub (wall tile comes from BACKSPLASHES) ----------------

export interface ShowerSystem extends BaseItem {
  unit: 'pkg'
  /** Tub or base, valve, drain and shower head (installed labor is in Settings) */
  cost: number
  /** Walls are tiled (uses the chosen wall tile + waterproofing) */
  tiled: boolean
  /** Needs a glass door or panel */
  glass: boolean
  promptText: string
}

export const SHOWER_SYSTEMS: ShowerSystem[] = [
  { id: 'sh-tub-tile', name: 'New tub + tiled surround', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'pkg', cost: 1800, tiled: true, glass: false, swatch: { color: '#f5f5f2' }, promptText: 'a new white alcove soaking tub with tiled walls around it' },
  { id: 'sh-walkin', name: 'Tiled walk-in shower', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'pkg', cost: 2400, tiled: true, glass: true, swatch: { color: '#e9ecef' }, promptText: 'a tiled walk-in shower with a low-profile base' },
  { id: 'sh-curbless', name: 'Curbless shower, linear drain', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'pkg', cost: 3800, tiled: true, glass: true, swatch: { color: '#dfe3e6' }, promptText: 'a curbless zero-threshold tiled shower with a linear drain, floor tile running into the shower' },
  { id: 'sh-conversion', name: 'Tub-to-shower conversion', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'pkg', cost: 2600, tiled: true, glass: true, swatch: { color: '#e6e9ec' }, promptText: 'the old tub replaced by a tiled walk-in shower in the same alcove' },
  { id: 'sh-acrylic', name: 'Acrylic tub/shower surround', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'pkg', cost: 2200, tiled: false, glass: false, swatch: { color: '#f7f7f5' }, promptText: 'a new white acrylic tub with a smooth one-piece acrylic wall surround' },
]

export interface ShowerGlass extends BaseItem {
  unit: 'each'
  cost: number
  promptText: string
}

export const SHOWER_GLASS: ShowerGlass[] = [
  { id: 'gl-frameless-door', name: 'Frameless glass door', brand: 'Custom glass', supplier: SUPPLIERS.glass, rooms: ['bath'], unit: 'each', cost: 1800, swatch: { color: '#dbe9ee' }, promptText: 'a frameless clear glass hinged shower door' },
  { id: 'gl-panel', name: 'Fixed glass panel', brand: 'Custom glass', supplier: SUPPLIERS.glass, rooms: ['bath'], unit: 'each', cost: 1200, swatch: { color: '#e3eef1' }, promptText: 'a single fixed frameless clear glass panel (open walk-in entry)' },
  { id: 'gl-slider', name: 'Semi-frameless sliding door', brand: 'Custom glass', supplier: SUPPLIERS.glass, rooms: ['bath'], unit: 'each', cost: 950, swatch: { color: '#d7e4e9' }, promptText: 'a semi-frameless clear glass sliding shower door' },
]

export interface Toilet extends BaseItem {
  unit: 'each'
  cost: number
  promptText: string
}

export const TOILETS: Toilet[] = [
  { id: 'tl-comfort', name: 'Comfort-height elongated', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'each', cost: 380, swatch: { color: '#fbfbfa' }, promptText: 'a white comfort-height elongated toilet' },
  { id: 'tl-one-piece', name: 'One-piece skirted', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'each', cost: 650, swatch: { color: '#fbfbfa' }, promptText: 'a sleek white one-piece skirted toilet' },
  { id: 'tl-smart', name: 'Smart bidet toilet', brand: 'Kohler', supplier: SUPPLIERS.bathFixtures, rooms: ['bath'], unit: 'each', cost: 1800, swatch: { color: '#f4f5f6' }, promptText: 'a modern white smart toilet with integrated bidet seat' },
]

export interface BathLighting extends BaseItem {
  unit: 'pkg'
  cost: number
  promptText: string
}

export const BATH_LIGHTING: BathLighting[] = [
  { id: 'bl-bar', name: 'Mirror + vanity light bar', brand: 'Lighting', supplier: SUPPLIERS.lighting, rooms: ['bath'], unit: 'pkg', cost: 450, swatch: { color: '#f4efe2' }, promptText: 'a simple rectangular mirror with a 3-light vanity light bar above it' },
  { id: 'bl-sconces', name: 'Framed mirror + 2 sconces', brand: 'Lighting', supplier: SUPPLIERS.lighting, rooms: ['bath'], unit: 'pkg', cost: 750, swatch: { color: '#efe4c8' }, promptText: 'a framed mirror flanked by two wall sconces' },
  { id: 'bl-led', name: 'Lighted LED mirror + recessed', brand: 'Lighting', supplier: SUPPLIERS.lighting, rooms: ['bath'], unit: 'pkg', cost: 1200, swatch: { color: '#f7f3e6' }, promptText: 'a frameless backlit LED mirror and recessed ceiling lights' },
]

/** Bath fixture finishes (faucets, shower trim, accessories). */
export const BATH_FIXTURE_FINISH_IDS = ['chrome', 'nickel', 'black', 'brass']

// ---------------- A design option: one product per category ----------------

/**
 * What a design option uses. `null` means "keep existing / not in this design":
 * it costs nothing and the AI leaves that part of the kitchen as it is.
 * Choosing a cabinet color with no cabinet line = refinish/paint the existing cabinets.
 */
export interface Selection {
  cabinetLineId: string | null
  doorStyleId: string | null
  cabinetFinishId: string | null
  countertopId: string | null
  backsplashId: string | null
  sinkFaucetId: string | null
  faucetFinishId: string | null
  hardwareFinishId: string | null
  paintId: string | null
  flooringId: string | null
  lightingId: string | null
  // Bath (kitchen designs leave these empty). In a bath, cabinet color/door style = vanity,
  // countertop = vanity top, backsplash = shower wall tile, faucet finish = all bath fixtures.
  vanityId: string | null
  showerId: string | null
  glassId: string | null
  toiletId: string | null
  bathLightId: string | null
}

export const EMPTY_SELECTION: Selection = {
  cabinetLineId: null,
  doorStyleId: null,
  cabinetFinishId: null,
  countertopId: null,
  backsplashId: null,
  sinkFaucetId: null,
  faucetFinishId: null,
  hardwareFinishId: null,
  paintId: null,
  flooringId: null,
  lightingId: null,
  vanityId: null,
  showerId: null,
  glassId: null,
  toiletId: null,
  bathLightId: null,
}

// ---------------- Lookup helpers ----------------

const find = <T extends { id: string }>(list: T[], id: string | null) => (id ? list.find((x) => x.id === id) : undefined)

/** Catalog items for a selection; anything not chosen is undefined ("keep existing"). */
export function resolveSelection(s: Selection) {
  return {
    cabinetLine: find(CABINET_LINES, s.cabinetLineId),
    doorStyle: find(DOOR_STYLES, s.doorStyleId),
    cabinetFinish: find(CABINET_FINISHES, s.cabinetFinishId),
    countertop: find(COUNTERTOPS, s.countertopId),
    backsplash: find(BACKSPLASHES, s.backsplashId),
    sinkFaucet: find(SINK_FAUCETS, s.sinkFaucetId),
    faucetFinish: find(METAL_FINISHES, s.faucetFinishId),
    hardwareFinish: find(METAL_FINISHES, s.hardwareFinishId),
    paint: find(PAINT_COLORS, s.paintId),
    flooring: find(FLOORING, s.flooringId),
    lighting: find(LIGHTING, s.lightingId),
    vanity: find(VANITIES, s.vanityId),
    shower: find(SHOWER_SYSTEMS, s.showerId),
    glass: find(SHOWER_GLASS, s.glassId),
    toilet: find(TOILETS, s.toiletId),
    bathLight: find(BATH_LIGHTING, s.bathLightId),
  }
}
export type ResolvedSelection = ReturnType<typeof resolveSelection>

/** Only products marked available show up in the pickers. */
export const isAvailable = (item: { available?: boolean }) => item.available !== false

/** Available and offered in this room. */
export const offeredIn = (room: CatalogRoom) => (item: { available?: boolean; rooms?: CatalogRoom[] }) =>
  isAvailable(item) && (!item.rooms || item.rooms.includes(room))
