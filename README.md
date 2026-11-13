# Intervals Companion

A fast, lightweight mobile & tablet companion app for **[Intervals.icu](https://intervals.icu)** built for viewing incoming coach-prescribed workouts, interactive running pace-time step diagrams, and completed training activities across all sports.

<p align="center">
  <img src="public/pwa-512x512.png" width="120" height="120" alt="Intervals Companion Logo" />
</p>

## Key Features

- **Official Intervals.icu OAuth 2.0 + PKCE (`S256`) Login:** One-tap authorization via Intervals.icu (`Client ID #1781`) using read-only scopes (`CALENDAR:READ`, `ACTIVITY:READ`). Automatically resolves the authenticated athlete (`athleteId = 0`) — no manual Athlete ID or API key required.
- **Unconditional Multi-Sport Sync & Dynamic Filter:** Downloads and displays **100% of all scheduled workouts and completed activities** returned by Intervals.icu (`Running`, `Cycling`, `Swimming`, `Walking`, `Hiking`, `Rowing`, `Nordic Ski`, `Strength`, `HIIT`, `Mobility`, `Pilates`, `Yoga`, and any other Intervals.icu sport). Filter by workout status (`All / Incoming / Done`) or toggle individual sports dynamically via the bottom-right filter button.
- **Interactive Running Pace-Time Step Diagrams:** Visualizes structured `workout_doc` intervals (`% Pace` and `min/km` or `min/mi`) with touch/click block inspection and time-in-zones breakdown.
- **Completed Activity Telemetry & Intervals:** Inspect heart rate, power, pace, GAP, cadence, elevation, workout compliance, fitness/fatigue/form (`CTL`/`ATL`), and lap splits.
- **Phone & Tablet Responsive Layouts:**
  - **Phone:** Locked to Portrait for focused one-handed navigation.
  - **Tablet Portrait & Landscape:** Automatic orientation adaptation featuring a **2-Pane Master–Detail Split View** in Tablet Landscape for both the Calendar/Incoming feed and Settings, plus a compact floating filter sheet.
- **Horizontal Card Swipe Navigation:** Swipe left or right inside any opened Scheduled Workout or Completed Activity card to step seamlessly through the active Calendar or Incoming list.
- **Pull-Down to Force Collect & 24h Background Auto-Sync:** Pull down on the calendar at any time to sync immediately, or configure background auto-sync (`Every 24h` default, `12h`, `6h`, or `Manual Only`), Wi-Fi only sync, and daily `07:00 AM` workout digest notifications.
- **Android 15+ Adaptive & Monochrome Launcher Icon:** Includes both full-color adaptive icons and a single-color monochrome vector layer (`public/icon-monochrome.svg`) for Android 13–15+ Material You themed home screens.
- **Multi-Language Localization (`en`, `es`, `de`, `ru`, `fr`, `it`) + Live GitHub Locales:** Bundled offline translations for English, Español, Deutsch, Русский, Français, and Italiano, with automatic background fetching of new language files added to `/public/locales/` in this repository.

---

## Repository Structure

- **`/src/` & `/server.ts`** — Full-featured Progressive Web App (PWA) & interactive Android Phone/Tablet companion interface (React 19, TypeScript, Tailwind CSS, Express with `express-rate-limit`).
- **`/android-kotlin/`** — Native Android Kotlin + Jetpack Compose project reference (`Kotlin 2.0`, `Material 3`, `Retrofit2`, `WorkManager`, and `CustomTabsIntent` PKCE OAuth).
- **`/public/locales/`** — JSON localization dictionaries (`index.json`, `en.json`, `es.json`, `de.json`, `ru.json`, `fr.json`, `it.json`).
- **`/PRIVACY.md`** — Public Privacy Policy for Intervals.icu OAuth and Google Play Store.
- **`/TERMS.md`** — Open-source Terms & Conditions ("AS IS" warranty disclaimer and training/health notice).
- **`/SECURITY.md`** — Security architecture & vulnerability reporting policy.
- **`/LICENSE`** — MIT License.

---

## How to Add or Update a Language

The app uses flat JSON dictionary files located in **`public/locales/`**. New languages uploaded to the `main` branch of this repository are fetched automatically when opening the language selector in **Onboarding** or **Settings → Language** without requiring an app update.

1. Copy [`public/locales/en.json`](./public/locales/en.json) to `public/locales/<code >.json` (e.g., `pt.json` or `pl.json`).
2. Translate the string values while keeping `{placeholder}` tokens (`{hours}`, `{load}`, `{num}`, `{count}`, `{days}`) intact. Any omitted keys automatically fall back to English (`en.json`).
3. Add the language metadata entry to [`public/locales/index.json`](./public/locales/index.json):
   ```json
   {
     "code": "pt",
     "name": "Portuguese",
     "nativeName": "Português",
     "flag": "🇵🇹",
     "file": "pt.json"
   }
   ```

---

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

---

## Legal & Documentation

- **Privacy Policy:** [PRIVACY.md](./PRIVACY.md)
- **Terms & Conditions:** [TERMS.md](./TERMS.md)
- **Security Policy:** [SECURITY.md](./SECURITY.md)
- **License:** [MIT License](./LICENSE)
