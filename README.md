# Ryan Brothers · Kitchen Consult (prototype)

An installable iPad web app for in-home kitchen remodel consultations. At the kitchen table, the salesperson:

1. Enters **customer info**
2. Takes **3-6 kitchen photos** and picks a hero shot
3. Fills in **measurements & scope**
4. Shows a **Good / Better / Best estimate** as price ranges
5. Generates **AI renderings** of the homeowner's actual kitchen in each look (before/after slider)
6. **Mixes & matches** finishes live, with instant pricing and one-change re-renders
7. Creates a branded **4-page proposal PDF** to share, download or print

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

## Edit the catalog (products & prices)

Everything lives in **`src/config/catalog.ts`**. Each item has a name, brand, tier, unit, unit cost and swatch.

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

- `TIER_DEFAULTS` at the bottom sets the starting look for Good, Better and Best.
- `COUNTERTOP_LOOKS` and each item's `promptText` describe finishes to the AI. Keep them visual ("white quartz with soft gray veining").
- Save, commit and push. Netlify redeploys automatically.

## Edit labor rates, markup, contingency & range (no code)

Home screen → **Settings** → PIN (default **1234**; change it on the same screen).

- **Company markup** is built into every line price and **never shown to homeowners**.
- **Contingency** shows as its own line.
- **Price range** sets the ± on totals.
- **Salesperson** name, phone and email print on the proposal.
- Starting values are in `src/config/defaultSettings.ts`. Edits made in Settings are saved on that iPad.

The estimate shows homeowners **grouped categories**. Tap **🔒 Staff detail** (PIN) to see every line item.

> The PIN keeps homeowners out of your margins. It is not real security.

## Change branding & proposal wording

- **Company name, colors, phone, website:** `src/config/brand.ts` (the only place).
- **Proposal text** (intro, next steps, terms, "valid for 30 days"): `src/config/proposal.ts`.

## Demo mode

Tap **Demo mode** on the home screen to create a sample consultation with photos and measurements already filled in.
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
