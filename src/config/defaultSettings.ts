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
  /** Install labor when flooring is an allowance or customer-supplied (catalog flooring prices include install) */
  flooringInstallPerSqft: number
  /** Install labor for a customer-supplied or allowance lighting package */
  lightingInstallOnly: number
  bathLightInstallOnly: number

  plumbingReconnect: number
  plumbingRelocate: number
  electricalReconnect: number
  electricalUpdates: number

  paintPerSqft: number
  permits: number
  /** Charged once per consultation */
  projectFee: number
  windowAllowance: number
  windowInstall: number
  /** Hang, tape, texture and prime */
  drywallPerSqft: number
  floorRemovalPerSqft: number
  applianceInstallEach: number

  /** Non-load-bearing wall: base + per linear foot (demo, patch floor/ceiling, drywall) */
  wallNonBearingBase: number
  wallNonBearingPerLf: number
  /** Load-bearing wall: base (engineer, permit, temporary shoring) + per linear foot (beam, posts) */
  wallLoadBearingBase: number
  wallLoadBearingPerLf: number

  // ----- Bath -----
  bathDemoFullGut: number
  bathDemoPartial: number
  /** Rough-in: supply & drain lines, valve for a full bath */
  bathPlumbingRoughIn: number
  vanityInstall: number
  toiletInstall: number
  /** Waterproofing membrane on tiled shower walls & pan */
  showerWaterproofPerSqft: number
  /** Faucets, shower valve trim & accessories (plus finish upcharge) */
  bathFixtureTrim: number
  glassInstall: number
  exhaustFan: number
  heatedFloorPerSqft: number
}

export interface Salesperson {
  name: string
  phone: string
  email: string
}

/** Company details entered on the iPad (never stored in the code). */
export interface CompanySettings {
  /** Contractor license, e.g. "CSLB #123456". Printed on every proposal when filled in. */
  licenseNumber: string
  /** Uploaded logo as a data URL (PNG/JPEG). Empty = the built-in Ryan Brothers mark. */
  logoDataUrl: string
}

export interface AppSettings {
  pin: string
  company: CompanySettings
  /** Must match RENDER_ACCESS_CODE on Netlify (if that is set). Stops strangers using your AI credits. */
  renderAccessCode: string
  salesperson: Salesperson
  pricing: PricingSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  company: { licenseNumber: '', logoDataUrl: '' },
  renderAccessCode: '',
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
    flooringInstallPerSqft: 4.5,
    lightingInstallOnly: 650,
    bathLightInstallOnly: 250,

    plumbingReconnect: 600,
    plumbingRelocate: 2800,
    electricalReconnect: 400,
    electricalUpdates: 3200,

    paintPerSqft: 3.5,
    permits: 1200,
    projectFee: 250,
    windowAllowance: 600,
    windowInstall: 520,
    drywallPerSqft: 6.5,
    floorRemovalPerSqft: 3,
    applianceInstallEach: 185,

    wallNonBearingBase: 1800,
    wallNonBearingPerLf: 120,
    wallLoadBearingBase: 6500,
    wallLoadBearingPerLf: 450,

    bathDemoFullGut: 3500,
    bathDemoPartial: 1600,
    bathPlumbingRoughIn: 2400,
    vanityInstall: 450,
    toiletInstall: 350,
    showerWaterproofPerSqft: 12,
    bathFixtureTrim: 850,
    glassInstall: 400,
    exhaustFan: 650,
    heatedFloorPerSqft: 22,
  },
}
