export interface Step {
  path: string
  label: string
  short: string
}

/** The consultation flow, in order. */
export const STEPS: Step[] = [
  { path: 'customer', label: 'Customer Info', short: 'Customer' },
  { path: 'photos', label: 'Kitchen Photos', short: 'Photos' },
  { path: 'scope', label: 'Measurements & Scope', short: 'Scope' },
  { path: 'estimate', label: 'Estimate', short: 'Estimate' },
  { path: 'renderings', label: 'Renderings', short: 'Renderings' },
  { path: 'mix', label: 'Mix & Match', short: 'Mix & Match' },
  { path: 'proposal', label: 'Proposal', short: 'Proposal' },
]
