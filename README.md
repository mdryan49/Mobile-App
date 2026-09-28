# Ryan Brothers · Kitchen Consult (prototype)

An iPad web app (installable PWA) for in-home kitchen remodel consultations.
Everything is stored **on the iPad only** (IndexedDB). No login, no cloud database.

> Status: **Phase 3 of 5**: home screen, customer info, photos, demo mode, measurements, grouped Good/Better/Best estimate, PIN-protected settings, AI renderings with before/after slider.
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

`.jpg`, `.png`, or `.webp` all work. Replace these files to change the demo kitchen.

## Edit products & prices (catalog)

All products live in **`src/config/catalog.ts`**: cabinet lines, door styles, finishes,
countertops, backsplash tile, Kohler sink/faucet packages, hardware and paint colors.
Each item has a name, brand, tier, unit, unit cost and swatch color. Change a number,
save, redeploy. Default looks for Good / Better / Best are in `TIER_DEFAULTS` at the bottom.

## Edit labor rates, markup, contingency & range (no code)

Home screen → **Settings** → enter the PIN (default **1234**, change it on the same screen).
Everything is saved on that iPad. Starting values are in `src/config/defaultSettings.ts`.

- **Markup** is built into every line price and never shown to homeowners.
- **Contingency** appears as its own line.
- **Price range** controls the ± shown on totals.
- **Salesperson** name/phone/email print on the proposal PDF.

> The PIN keeps homeowners out of your margins. It is not real security:
> anyone with the iPad and developer tools could read the data.

All pricing is labeled **"Sample pricing - for demonstration only"** until real pricing is loaded.

## AI renderings (Gemini "Nano Banana")

Renderings go through a Netlify Function (`netlify/functions/render.mts`) at `/api/render`.
**The Gemini key never touches the iPad or the code.** It lives only in Netlify.

Netlify → your site → **Project configuration → Environment variables**:

| Variable | Required | What it does |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your key from Google AI Studio |
| `RENDER_ACCESS_CODE` | Recommended | Any secret phrase. Enter the same phrase on the iPad in Settings → AI renderings. Stops strangers from using your AI credits. |
| `GEMINI_IMAGE_MODEL` | No | Defaults to `gemini-3.1-flash-image` (Nano Banana 2). Use `gemini-3-pro-image` for higher quality. |

After changing environment variables, redeploy so the function picks them up.
The prompts live in `src/lib/prompt.ts`.

## Deploy to Netlify

```bash
npx netlify-cli deploy --build --prod   # after `npx netlify-cli link`
```

Or connect the GitHub repo in the Netlify UI (build command `npm run build`, publish `dist`).
Local `npm run dev` does not run the AI function; test renderings on the deployed site.

## Project structure

```
src/config/brand.ts     Brand name, colors, contact info
src/config/steps.ts     The 7-step consultation flow
src/config/catalog.ts   Materials catalog (sample prices)
src/config/defaultSettings.ts  Default labor rates, markup, contingency
src/lib/estimate.ts     Pricing engine
src/lib/db.ts           IndexedDB storage (projects, photos, settings)
src/lib/image.ts        Photo compression (max 1600px JPEG)
src/lib/demo.ts         Demo consultation loader
src/pages/              Screens
netlify/functions/      Server-side Gemini proxy (keeps the API key secret)
src/lib/prompt.ts       AI rendering prompts
src/lib/renderJobs.ts   Render queue with retry
```
