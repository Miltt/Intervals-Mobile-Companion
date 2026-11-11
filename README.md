# Intervals Companion (Android Kotlin + Jetpack Compose)

A clean, lightweight Android companion app for **[Intervals.icu](https://intervals.icu)** focused on viewing incoming coach-prescribed workouts, interactive pace-time step diagrams, and completed activities.

<p align="center">
  <img src="public/pwa-512x512.png" width="128" height="128" alt="Intervals Companion Logo" />
</p>

## Key Features
- **Intervals.icu Web Browser Login (OAuth 2.0):** Simple one-tap login via Chrome Custom Tabs (`https://intervals.icu/oauth/authorize`) with automatic athlete profile resolution (`athleteId = 0`) — no manual Athlete ID or API key entry needed.
- **Current-Day & Weekly Training Calendar:** Defaults to today's workouts with one-tap switching across days of the week or the full week.
- **Multi-Sport Selection & Filtering:** Choose which activity types (`Running`, `Swimming`, `Strength`, `Mobility`, `Pilates`, `Yoga`, `Cycling`) to sync in **Settings**, and filter your calendar via the floating bottom-right filter button (`All / Incoming / Done` + workout types).
- **Running Pace-Time Step Diagrams:** Visualizes structured `workout_doc` intervals (`% Pace` and `min/km`) exclusively for running workouts.
- **Pull-Down to Force Collect & WorkManager Auto-Sync:** Pull down on the calendar at any time to sync immediately, or configure background auto-sync every `6h`, `12h`, `24h`, or `Manual Only`.
- **System / Dark / Light Appearance:** Full theme support in Settings.
- **Multi-Language Localization (`en`, `de`, `ru`, `fr`, `it`) + GitHub Remote Locales:** Built-in offline translations with dynamic over-the-air language updates directly from this repository.

---

## Repository Structure
- **`/android-kotlin/`** — Native Android application source code (`Kotlin 2.0`, `Jetpack Compose Material 3`, `Retrofit2`, `WorkManager`, and `CustomTabsIntent` OAuth 2.0 + PKCE `S256`).
- **`/public/locales/`** — JSON localization resource files (`index.json`, `en.json`, `de.json`, `ru.json`, `fr.json`, `it.json`) shared with `/android-kotlin/app/src/main/assets/locales/`.
- **`/src/` & `/server.ts`** — Interactive browser-based Android Studio + Pixel 9 Pro (Android 15) preview environment.
- **`/PRIVACY.md`** — Public Privacy Policy for Intervals.icu OAuth registration and Google Play Store.
- **`/public/pwa-512x512.png`** — App icon (512×512 PNG) for OAuth application registration.

---

## How to Add a New Language

The app uses flat JSON dictionary files located in **`public/locales/`**. New languages uploaded to the `main` branch of this repository can be fetched directly inside the app (**Settings → Fetch Languages from GitHub**) without waiting for a new Google Play Store release.

### Step 1: Create the Language JSON File
1. Copy [`public/locales/en.json`](./public/locales/en.json) to a new file named with the ISO 639-1 language code (for example, `public/locales/es.json` for Spanish or `public/locales/pl.json` for Polish).
2. Translate the values while keeping the JSON keys and `{placeholder}` variables (such as `{hours}`, `{load}`, `{num}`, `{count}`) unchanged:
   ```json
   {
     "nav.calendar": "Calendario",
     "nav.incoming": "Próximos",
     "nav.settings": "Ajustes",
     "calendar.week": "Semana {num}",
     "card.load": "Carga {load}"
   }
   ```
   *(Note: If any key is omitted, the app automatically falls back to `en.json` so the UI never breaks.)*

### Step 2: Register the Language in `public/locales/index.json`
Add an entry to the `"languages"` array in [`public/locales/index.json`](./public/locales/index.json):

```json
{
  "code": "es",
  "name": "Spanish",
  "nativeName": "Español",
  "flag": "🇪🇸",
  "file": "es.json"
}
```

### Step 3: Optional — Bundle for Offline Android Builds
If you also want the new language bundled inside future offline APK builds, copy the file into `/android-kotlin/app/src/main/assets/locales/`.

### Step 4: Load in the App
Once pushed to GitHub, open the app, go to **Settings → App Language & GitHub Locales**, and tap **Fetch Languages from GitHub**. The new language will appear immediately and be cached locally on the device.

---

## Building the Native Android App (`/android-kotlin`)
1. Open the `/android-kotlin` folder in **Android Studio Ladybug (or newer)** with **JDK 17** and **Android SDK 35**.
2. Once your Intervals.icu OAuth application is approved at [https://intervals.icu/oauth/apply](https://intervals.icu/oauth/apply), set your OAuth `client_id` in `IntervalsWebAuthManager.kt` (or `local.properties` — never commit secrets to git).
3. Run the `app` configuration on a physical Android device or emulator.

---

## Running the Interactive Browser Preview
```bash
npm install
cp .env.example .env
npm run dev
```

## Privacy Policy & License
- **Privacy Policy:** See [PRIVACY.md](./PRIVACY.md)
- **License:** [MIT](./LICENSE)

