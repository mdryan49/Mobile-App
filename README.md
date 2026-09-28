# Ryan Brothers · Remodel Consult (prototype)

An installable iPad web app for in-home **kitchen and bath** remodel consultations. Each consultation is a
**Kitchen**, a **Bath**, or **Both** (chosen when you start one; change it later on the Customer step).
With both, a **Kitchen | Bath** switch appears at the top of the room steps. At the kitchen table, the salesperson:

1. Enters **customer info**
2. Takes **3-6 photos per room** and picks a hero shot
3. Fills in **measurements & scope**, and paints any **wall to remove** right on a photo
4. Builds **up to 3 design options** from supplier products, with live pricing
5. Shows the **estimate** for each option side by side, as price ranges
6. Generates **AI renderings** of the homeowner's actual kitchen for each option (before/after slider)
7. Creates a branded **proposal PDF** to share, download or print (4 pages for one room, 6 for kitchen + bath,
   with a combined total on the cover)

Everything is stored **on the iPad only** (IndexedDB). No login, no cloud database.

> **All pricing is SAMPLE data**, labeled "Sample pricing - for demonstration only" in the app and on the PDF.

---

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build (installable PWA)
```

To try it on a real iPad on the same Wi-Fi: `npm run dev -- --host`, then open the Network URL in Safari.

**Local dev does not run the AI function.** Renderings only work on the deployed Netlify site (or with `npx netlify-cli dev`, which runs functions locally using your Netlify environment variables).

## Add the Gemini API key

The key **never** goes in the code or on the iPad. It lives only in Netlify.

1. Create a key at [Google AI Studio](https://aistudio.google.com/apikey).
2. Netlify → your project → **Project configuration → Environment variables** → add:

| Variable | Required | What it does |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Your Gemini key. Mark it as a secret. |
| `RENDER_ACCESS_CODE` | Recommended | Any secret phrase. Type the same phrase on each iPad in **Settings → AI renderings**. Stops strangers from spending your AI credits. |
| `GEMINI_IMAGE_MODEL` | No | Defaults to `gemini-3.1-flash-image` (Nano Banana 2). Set `gemini-3-pro-image` (Nano Banana Pro) for higher quality, slower renders. |

3. **Redeploy** (Deploys → Trigger deploy) so the function picks up the change.

How it works: the app calls `/api/render` → `netlify/functions/render.mts` → Gemini. Photos are shrunk to 1600 px before sending. The prompts live in `src/lib/prompt.ts`.

## Deploy to Netlify

**Recommended: connect GitHub** (every push deploys automatically)

1. Netlify → **Add new project → Import an existing project → GitHub** → pick this repo and branch.
2. Build settings come from `netlify.toml` (`npm run build`, publish `dist`, functions in `netlify/functions`).
3. Add the environment variables above, then deploy.

**Or from your computer:** `npx netlify-cli link` once, then `npx netlify-cli deploy --build --prod`.

## Install on the iPad

Open the site in Safari → Share → **Add to Home Screen**. It then opens full screen like an app, works offline (except AI renders), and is much less likely to have its saved data cleared.

## Design options (how the salesperson builds a kitchen)

On the **Design** step, create up to 3 options (e.g. "Option A: Classic White"). A new option starts **empty**.
For each category (cabinets, door style, cabinet color, countertop, backsplash, sink & faucet, faucet finish,
hardware, wall paint, flooring, lighting) pick a product, or leave it on **Keep existing**:

- *Keep existing* costs nothing and the AI leaves that part of the kitchen exactly as photographed.
- A cabinet **color** with no cabinet **line** = refinish/paint the existing cabinets (priced per foot in Settings).
- Every product card shows its price difference (+$1,200 / -$800) before you tap it.
- Change something after rendering and tap **Update picture**. Additions are edited onto the current rendering;
  going back to "keep existing" or changing walls re-renders from the original photo.

## Baths (full bath remodel)

The bath uses the same flow: photos, **bath measurements** (floor area, vanity width, shower wall tile, paint area,
full gut or partial, plumbing moves, fan, heated floor, permits), design options, estimate and renderings.

Bath design categories: **vanity, vanity color, door style, vanity top, shower / tub, shower tile, glass, toilet,
fixture finish, hardware, wall paint, flooring, mirror & lighting**. Shower / tub is chosen per option:
new tub + tiled surround, tiled walk-in shower, curbless shower, tub-to-shower conversion or acrylic surround
(or keep the existing one and just re-tile the walls).

- Vanity color & door style reuse the cabinet finishes; the vanity top reuses the countertop catalog; shower walls reuse the tile catalog.
- A tiled shower with no tile picked yet is priced with a **$10/sq ft tile allowance** (`TILE_ALLOWANCE_PER_SQFT` in `src/lib/estimate.ts`).
- Renderings use bath-specific prompts that keep the vanity, toilet and tub/shower in the same places.

## Wall removal

**Scope → Walls to remove → Mark a wall on (photo)**. Paint over the wall with a finger, choose load-bearing /
not load-bearing / don't know, enter the length and a note ("open to the dining room").

- Priced from Settings. **"Don't know" is priced as load-bearing** until verified.
- Each design option has a **"Remove the marked wall"** switch, so Option A can open the wall and Option B can keep it.
- The AI gets a second copy of the photo with the wall painted red. It only opens walls marked **on that photo**.
- Renderings with a wall removed are stamped **"Concept only: subject to structural review"** in the app and on the PDF.

## Edit the catalog (products, suppliers & prices)

Everything lives in **`src/config/catalog.ts`**. Each item has a name, brand, **supplier**, unit, unit cost and swatch.
**Only list what your suppliers can actually deliver.** Set `available: false` to hide an item without deleting it.
Rename your suppliers once in `SUPPLIERS` at the top of the file.

| Section | Priced by |
|---|---|
| `CABINET_LINES` (Aristokraft / Diamond / Decorá) | per linear foot (base & wall) |
| `DOOR_STYLES` | price multiplier |
| `CABINET_FINISHES` | % upcharge |
| `COUNTERTOPS` (Arizona Tile granite, Silestone, Cambria) | per sq ft **installed** |
| `BACKSPLASHES` (Arizona Tile) | per sq ft material (+ tile install labor from Settings) |
| `SINK_FAUCETS` (Kohler) | per package; `FAUCET_FINISH_UPCHARGE` adds by finish |
| `HARDWARE_COST_EACH` | per pull |
| `PAINT_COLORS` | color only (labor in Settings) |
| `FLOORING` | per sq ft **installed** |
| `LIGHTING` | per package, installed |
| **Bath:** `VANITIES` | each (x door style multiplier & color upcharge) + install |
| `SHOWER_SYSTEMS` | per package (tub/base, valve, drain); tiled walls add tile + install + waterproofing |
| `SHOWER_GLASS`, `TOILETS`, `BATH_LIGHTING` | each / per package |

- Products can be limited to one room with `rooms: ['bath']` or `rooms: ['kitchen']` (e.g. hardwood is kitchen-only, hex mosaic is bath-only).
- Bath suppliers are **placeholders**: rename `vanities`, `bathFixtures` and `glass` in `SUPPLIERS`.

- `COUNTERTOP_LOOKS` and each item's `promptText` describe finishes to the AI. Keep them visual ("white quartz with soft gray veining").
- Save, commit and push. Netlify redeploys automatically.

## Edit labor rates, markup, contingency & range (no code)

Home screen → **Settings** → PIN (default **1234**; change it on the same screen).

- **Company markup** is built into every line price and **never shown to homeowners**.
- **Contingency** shows as its own line.
- **Wall removal** rates: per wall + per foot, for non-load-bearing and load-bearing walls.
- **Bath labor**: demo (full gut / partial), plumbing rough-in, vanity & toilet install, shower waterproofing,
  faucets & trim, glass install, exhaust fan, heated floor.
- **Price range** sets the ± on totals.
- **Salesperson** name, phone and email print on the proposal.
- Starting values are in `src/config/defaultSettings.ts`. Edits made in Settings are saved on that iPad.

The estimate shows homeowners **grouped categories**. Tap **🔒 Staff detail** (PIN) to see every line item.

> The PIN keeps homeowners out of your margins. It is not real security.

## Change branding & proposal wording

- **Company name, colors, phone, website:** `src/config/brand.ts` (the only place).
- **Proposal text** (intro, next steps, terms, "valid for 30 days"): `src/config/proposal.ts`.

## Demo mode

Tap **Demo mode** on the home screen to create a sample consultation with photos, measurements and two sample
options (a full remodel and a budget refresh that keeps the existing cabinet boxes).
Replace `public/demo/kitchen-1.jpg` (hero), `kitchen-2.jpg` and `kitchen-3.jpg` to change the demo kitchen.

**Tip:** render the demo once, then use **Duplicate** before each pitch. Duplicates keep the renderings, so a demo works even without internet.

## Project structure

```
src/config/brand.ts           Company name, colors, contact info
src/config/catalog.ts         Materials catalog (sample prices)
src/config/defaultSettings.ts Default labor rates, markup, contingency, PIN
src/config/proposal.ts        Proposal PDF wording
src/lib/db.ts                 IndexedDB storage (projects, photos, renderings, settings)
src/lib/estimate.ts           Pricing engine + homeowner categories
src/lib/prompt.ts             AI rendering prompts
src/lib/renderJobs.ts         Render queue with retry (never loses inputs)
src/lib/renderActions.ts      Decides quick edit vs. fresh render for a design option
src/lib/wallMask.ts           Paints marked walls red for the AI reference image
src/pages/DesignStep.tsx      Build design options from supplier products (kitchen & bath pickers)
src/lib/project.ts            Rooms (kitchen/bath), defaults, migration of older saves
src/lib/pdf.ts                Proposal PDF (jsPDF, client-side)
src/pages/                    One screen per step
netlify/functions/render.mts  Server-side Gemini proxy (keeps the API key secret)
```

## Troubleshooting

| Message | Fix |
|---|---|
| "Render access code is missing or wrong" | Settings → AI renderings: enter the same code as `RENDER_ACCESS_CODE` in Netlify. |
| "The AI service is not set up yet" | Add `GEMINI_API_KEY` in Netlify and redeploy. |
| "The rendering took longer than the server allows" | Tap Retry. If it keeps happening, your Netlify plan's function time limit is too short for the model; try `gemini-3.1-flash-lite-image` or contact your developer. |
| "Rendering only works on the deployed site" | You're on `npm run dev`; use the Netlify URL. |
| Print does nothing on iPad | Print opens the PDF in a new tab; tap Share → Print there. |
