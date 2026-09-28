import type { Tier } from './catalog'

/**
 * Default pricing settings — SAMPLE DATA.
 * These are only the starting values. Everything here can be edited on the
 * iPad in Settings (PIN protected), and the edited values are saved on the device.
 */
export interface PricingSettings {
  /** Hidden from homeowners — built into every line price. e.g. 35 = 35% */
  markupPct: number
  /** Added as its own line, e.g. 10 = 10% of job cost */
  contingencyPct: number
  /** Price range shown to homeowners, e.g. 10 = ±10% */
  rangePct: number

  demoFullGut: number
  demoCabinetsCounters: number
  demoRefresh: number
  haulAway: number

  cabinetInstallPerLf: number
  /** "Refresh" scope keeps existing boxes: cabinets are painted/refinished instead of replaced */
  cabinetRefinishPerLf: number
  hardwareInstallEach: number
  /** Pulls per linear foot of cabinetry (used to estimate hardware count) */
  hardwarePerLf: number

  tileInstallPerSqft: number
  sinkFaucetInstall: number

  plumbingReconnect: number
  plumbingRelocate: number
  electricalReconnect: number
  electricalUpdates: number

  flooringPerSqft: Record<Tier, number>
  paintPerSqft: number
  lighting: Record<Tier, number>
  permits: number
}

export interface Salesperson {
  name: string
  phone: string
  email: string
}

export interface AppSettings {
  pin: string
  salesperson: Salesperson
  pricing: PricingSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  salesperson: { name: '', phone: '', email: '' },
  pricing: {
    markupPct: 35,
    contingencyPct: 10,
    rangePct: 10,

    demoFullGut: 4500,
    demoCabinetsCounters: 2800,
    demoRefresh: 900,
    haulAway: 650,

    cabinetInstallPerLf: 85,
    cabinetRefinishPerLf: 150,
    hardwareInstallEach: 6,
    hardwarePerLf: 1.2,

    tileInstallPerSqft: 18,
    sinkFaucetInstall: 450,

    plumbingReconnect: 600,
    plumbingRelocate: 2800,
    electricalReconnect: 400,
    electricalUpdates: 3200,

    flooringPerSqft: { good: 9, better: 13, best: 18 },
    paintPerSqft: 3.5,
    lighting: { good: 1200, better: 2200, best: 3800 },
    permits: 1200,
  },
}
