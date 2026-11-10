# Privacy Policy — Intervals Companion

**Last Updated:** November 2026

**Intervals Companion** is an open-source mobile companion application for [Intervals.icu](https://intervals.icu). We take your privacy seriously and design the application so your training data stays under your control.

---

## 1. Information We Access
When you sign in using the official **Intervals.icu OAuth 2.0** login flow (`https://intervals.icu/oauth/authorize`), the application requests read-only permissions:
- **`CALENDAR:READ`** — To display your upcoming scheduled workouts, coach notes, and structured workout step targets (`workout_doc`).
- **`ACTIVITY:READ`** — To display your completed training activities, summary metrics, and interval splits.

We do **not** collect your Intervals.icu password. Authentication is handled directly on the official Intervals.icu website in your system browser.

## 2. How Your Data Is Stored and Used
- **Local Device Storage Only:** Your OAuth 2.0 access token, user preferences, and cached workout calendar are stored locally on your device (`EncryptedSharedPreferences` / local storage) so the app can display your schedule quickly and work offline.
- **Background Sync:** If enabled in Settings, Android `WorkManager` periodically refreshes your calendar directly from `https://intervals.icu/api/v1/athlete/0/` at your chosen interval (every 6, 12, or 24 hours, or manual pull-to-refresh only).

## 3. Data Sharing & Third Parties
- We **never** sell, rent, trade, or transfer your personal profile or training data to any third parties, analytics brokers, or advertising networks.
- No external tracking or advertising SDKs are included in the application.

## 4. Revoking Access & Deleting Data
- You can log out or clear your local workout cache at any time inside the app's **Settings** screen (`Log Out` / `Reset Cache`), which immediately removes locally stored tokens and cached workouts.
- You can also revoke OAuth access at any time from your account settings on [https://intervals.icu/settings](https://intervals.icu/settings).

## 5. Contact
If you have questions about this Privacy Policy, please open an issue in this GitHub repository.
