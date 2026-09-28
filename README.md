# Ryan Brothers · Kitchen Consult (prototype)

An iPad web app (installable PWA) for in-home kitchen remodel consultations.
Everything is stored **on the iPad only** (IndexedDB). No login, no cloud database.

> Status: **Phase 1 of 5** — home screen, customer info, kitchen photos, demo mode.
> Full setup docs (Gemini key, Netlify deploy, catalog & pricing) arrive in Phase 5.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build (PWA/service worker active)
```

To test on a real iPad on the same Wi-Fi: `npm run dev -- --host`, then open the
Network URL in Safari. (The camera needs HTTPS or localhost. Use a Netlify deploy
preview for full camera testing.)

## Install on the iPad

Open the site in Safari → Share → **Add to Home Screen**. Installing it also
helps keep Safari from clearing saved consultations.

## Rename the company / change colors

Edit `src/config/brand.ts`. That's the only place.

## Demo mode

Tap **Demo mode** on the home screen to create a sample consultation.
To use your own kitchen photos, drop them in `public/demo/` as:

```
public/demo/kitchen-1.jpg   ← hero photo (straight-on shot)
public/demo/kitchen-2.jpg
public/demo/kitchen-3.jpg
```

`.jpg`, `.png`, or `.webp` all work and take priority over the illustrated `.svg` placeholders.

## Project structure

```
src/config/brand.ts     Brand name, colors, contact info
src/config/steps.ts     The 7-step consultation flow
src/lib/db.ts           IndexedDB storage (projects, photos, settings)
src/lib/image.ts        Photo compression (max 1600px JPEG)
src/lib/demo.ts         Demo consultation loader
src/pages/              Screens
netlify/functions/      Server-side Gemini proxy (Phase 3)
```
