/**
 * BRAND CONFIG — rename the company or change colors here and nowhere else.
 */
export const BRAND = {
  name: 'Ryan Brothers',
  shortName: 'Ryan Bros',
  tagline: 'Kitchen & Bath Remodeling',
  phone: '(555) 555-0100',
  email: 'hello@ryanbrothers.example',
  website: 'ryanbrothers.example',
  colors: {
    accent: '#0072D5',
    accentDark: '#005BAA',
    ink: '#000000',
    paper: '#FFFFFF',
  },
} as const

/** Shown in the app and on the PDF until real pricing is loaded. */
export const SAMPLE_PRICING_NOTICE = 'Sample pricing - for demonstration only'
