# Wellnest

A mobile-first personal wellness prototype for a hackathon. Built with Next.js App Router, React, TypeScript, Tailwind CSS, and local browser storage. No sign-in, API keys, or database setup is needed.

**Live demo:** https://wellnest-azure.vercel.app (open on a phone, then tap **Explore demo**)

## Run locally

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose **Start fresh** for your own records, or **Explore demo** for a week of sample history. The top-right space menu switches between them and can reset the demo. Switching spaces ends any in-progress work timer; completed records are retained in their original space.

## Deploy to Vercel

1. Push this folder to a Git repository and import it into Vercel.
2. Use the **Next.js** framework preset and Node.js **22.x** or newer supported by Vercel.
3. Keep the default install command (`npm install`), build command (`npm run build`), and output directory. No environment variables are required.
4. Deploy, then open the generated HTTPS link. HTTPS is required for camera access except on localhost.
5. Test scanning on the actual phone/browser you plan to use for your presentation. If camera access is denied or a product is absent from the database, manual barcode entry and the labeled sample product remain available.

Do not configure this as a static export: the product lookup route needs the Next.js server runtime. This repository is deployed on Vercel at https://wellnest-azure.vercel.app; every push to `main` redeploys it.

## Two-minute demo walkthrough

1. **Explore demo:** the overview shows sleep trends, movement, mindful minutes, and reminders.
2. **Sleep:** inspect the suggested bedtime, change the target wake-up time, then log or edit a night.
3. **Movement:** start a work session, pause/resume it, log a posture check and a stretch break, and add a workout.
4. **Breathe:** start the one-minute session. Pause/resume if needed, and finish to save the mindful minute.
5. **Reminders:** tap Taken, Undo, or Later. Add a daily reminder with multiple times to demonstrate scheduling.
6. **Nutrition:** scan a packaged product or enter its barcode. Open **Explore sample** for a predictable offline demonstration, then save it to the pantry.
7. Use **Use my own data** to show that demo records are separate from personal records.

## Features and behavior

- **Sleep:** bedtime/wake-up dates, quality ratings, edit/delete with Undo, and a seven-day chart with an adaptive scale, a "Not logged" state and tap-for-details. A night that overlaps an existing record is blocked, with an offer to edit that record instead. Recommendations use the median duration of nights rated 4–5 in the last 14 days after three qualifying records, rounded to 15 minutes and bounded to 7–9 hours. Before that, the starting target is eight hours. Suggested bedtime is target wake-up time minus suggested duration. This is a transparent experimental habit heuristic, not a medical optimum or a validated sleep model.
- **Movement:** in-app work timer, configurable 15/30/45/60-minute break interval, stretch and posture check-ins, and manual workout logging. Work timers pause when the document is hidden and require an explicit resume. End session saves work time. In-progress timers are not saved across reloads. Switching feature screens keeps the work timer running while the app remains visible.
- **Breathing:** 1/3/5-minute sessions, four-second inhale and six-second exhale with no holds, pause/resume/stop, automatic pause when hidden, and reduced-motion support. Only completed sessions are saved. Leaving the Breathe screen pauses an incomplete session and keeps it to resume.
- **Reminders:** daily schedules with one or more local times. Stable occurrence IDs prevent repeated Taken actions from duplicating a completion. Later snoozes one occurrence for 15 minutes, including across midnight; it does not alter the recurring schedule. Undo clears Taken. New reminders include selected times today even if those times already passed. Edit changes a reminder from now on; Pause stops future scheduling and Resume restarts it from now, preserving past records. Missed occurrences from earlier days can be marked Taken or Skipped. Missed occurrences are reconstructed when the app reopens. Seven-day history counts completion against the originally scheduled day.
- **Nutrition:** ZXing camera scanning, manual barcode entry, product details, saved pantry, a dated "eaten today" log (the daily nutrition habit counts this, not the pantry), missing-data states, and an illustrative sample. Unknown allergen data never implies allergen-free. Nutrition fields are displayed as supplied by the database; serving values are not invented when unavailable. Camera streams stop after a successful scan, when manually closed, when the document is hidden, and when leaving the screen.

- **Mobile:** each section has its own URL. On phones the app follows iOS conventions: a floating tab bar with a due-count badge, bottom sheets for forms, Dynamic Type text sizes, light and dark appearance, and safe areas.

## Persistence and privacy

Records are stored in versioned local storage under `wellnest:v1:personal` and `wellnest:v1:demo`. The selected mode is stored separately. All times use the device timezone. Data survives reloads in the same browser and origin, but does not sync between devices or between localhost and a deployed site. Clearing site data removes the records. If storage is blocked, full, or malformed, the app displays a warning and continues in memory; malformed saved records are not overwritten.

There is one local profile per browser. There is no analytics, authentication, cloud health-data storage, wearable integration, device-wide screen-time collection, or camera-based posture estimation. The server receives only the barcode for product lookup; camera frames and personal wellness records are not uploaded. Avoid using shared-device storage for sensitive real-world medical records in a hackathon demo.

Reminders only operate inside the open app. Background browser timers may be throttled, so due items are recalculated on focus and periodically while open. This version does not deliver notifications after the browser closes and is not a medication delivery or adherence guarantee. The app records users' own dose notes, not dose recommendations.

## Product API

`GET /api/products/[barcode]`

- Accepts numeric EAN/UPC/GTIN strings of 8, 12, 13, or 14 digits, retaining leading zeros.
- Returns a normalized product with nutrition values per 100g/100ml and per serving, using `null` for missing numbers.
- Returns `400` for invalid input, `404` for an unknown product, and `503` for upstream failures/timeouts.
- Identifies itself to Open Food Facts, limits the upstream request to ten seconds, requests only the needed fields, and caches successful responses for 24 hours.
- Repeated camera detections are locked to a single lookup. Users explicitly retry failed requests.

Data: [Open Food Facts](https://world.openfoodfacts.org), [API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/), [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). Product images are attributed to Open Food Facts contributors under CC BY-SA. The app includes a visible source link and attribution; sample oats data is clearly labeled illustrative. Check a product's physical label for authoritative ingredients and allergens.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The unit tests cover sleep calculation boundaries, stable recurring reminders, snooze across midnight, Taken/Undo, storage validation, demo isolation, and normalized nutrition/API errors. Browser tests cover the end-to-end feature flows, tab visibility, persistence, blocked storage, nutrition recovery, camera denial, mobile overflow, and WCAG AA automated checks. Test screenshots and failure traces are written to the ignored `test-results/` directory.

Use `npm run build && npm start` to preview the production build locally. Camera hardware and product database coverage vary, so check the intended demo device before the event.
