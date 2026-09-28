/**
 * PROPOSAL CONTENT — edit wording here. Shown on the PDF.
 */
export const PROPOSAL = {
  validDays: 30,
  title: 'Remodel Proposal',
  /** {count} is replaced with the number of options */
  intro:
    'Thank you for inviting us into your home. Below are {count} design options for your {room}, each shown in your own space with an estimated investment range.',
  introSingle:
    'Thank you for inviting us into your home. Below is the {room} design we created together, shown in your own space with an estimated investment range.',
  /** {rooms} becomes e.g. "kitchen and bathroom" */
  introMulti:
    'Thank you for inviting us into your home. Here is our recommended design for your {rooms}, each shown in your own space, with all options and details on the pages that follow.',
  nextSteps: [
    { title: 'Choose your look', text: 'Pick the option you love, or keep mixing finishes with us until it feels right.' },
    { title: 'Final site measure', text: 'We verify every dimension and confirm your final price in writing.' },
    { title: 'Design & ordering', text: 'We finalize your design and order cabinets and countertops. Typical lead time is 4-8 weeks.' },
    { title: 'Installation', text: 'A dedicated project manager runs your job. Most kitchens take 3-6 weeks on site; most full baths take 2-4 weeks.' },
  ],
  terms:
    'Prices are estimate ranges based on preliminary measurements and selections shown. Final pricing is confirmed after a site measure. Taxes, if any, are not included.',
}
