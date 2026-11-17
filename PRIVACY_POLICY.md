# Privacy Policy for Intervals Companion

**Effective Date:** November 17, 2026  
**Application Name:** Intervals Companion (`icu.intervals.companion`)  
**Developer Contact:** moshanov.ilia@gmail.com  
**Repository:** [https://github.com/Miltt/Intervals-Mobile-Companion](https://github.com/Miltt/Intervals-Mobile-Companion)

---

## 1. Overview
**Intervals Companion** is an unofficial, open-source mobile companion application for [Intervals.icu](https://intervals.icu). We respect your privacy and are committed to protecting your personal and athletic training data. This Privacy Policy explains what information the application accesses, how it is stored, and how you remain in full control of your data.

---

## 2. Information We Access
When you choose to sign in with your Intervals.icu account using official **OAuth 2.0 (PKCE)** authentication, the application requests read access (`ACTIVITY:READ`, `CALENDAR:READ`, `WELLNESS:READ`, `SETTINGS:READ`) directly from the official Intervals.icu API (`https://intervals.icu/api/v1`) to display:
- **Basic Athlete Profile:** Your Intervals.icu Athlete ID, display name, measurement unit preferences, and heart-rate/pace zone configurations.
- **Planned Workouts & Calendar Events:** Scheduled training sessions, workout step targets (duration, distance, pace, power, heart rate), and coach notes.
- **Completed Activities & Streams:** Completed workout summaries, lap/interval splits, heart-rate zone time distributions, and telemetry streams (time, pace, heart rate, cadence, altitude, power).

The application **never** sees, collects, or stores your Intervals.icu password. Authentication is handled directly by Intervals.icu via secure OAuth 2.0.

---

## 3. How Your Data Is Stored & Processed
- **Local On-Device Storage Only:** All OAuth access tokens, cached workout calendars, activity streams, and user preferences (theme, language, unit system, notification schedule) are stored **exclusively on your local device** using the application's private local storage.
- **No External Developer Databases:** We do not operate any external analytics database, advertising server, or third-party cloud storage that collects or retains your personal or athletic data.
- **Local Notifications:** If you enable the optional **Morning Workout Digest**, notifications are scheduled and triggered locally on your device using Android's native notification system (`POST_NOTIFICATIONS`). No push-notification tracking servers are used.

---

## 4. Data Sharing & Third Parties
- **No Sale or Sharing of Data:** We do **not** sell, rent, trade, or share your personal information or fitness data with any third parties, advertisers, or data brokers.
- **No Ads or Tracking SDKs:** Intervals Companion contains zero advertising SDKs, behavioral trackers, or third-party telemetry scripts.
- **Direct API Communication:** Network requests made by the mobile application communicate directly with `https://intervals.icu` (and GitHub solely when checking optional community translation files).

---

## 5. Data Retention & Deletion (How to Revoke Access)
You have complete control over your data at all times:
1. **In-App Sign Out & Data Wipe:** Tapping **Log Out** in the app's **Settings → Account** screen immediately deletes your OAuth token and clears your cached athlete profile and workout data from the device.
2. **Uninstalling the App:** Uninstalling **Intervals Companion** from your Android phone or tablet permanently erases all locally stored application data and cached workouts.
3. **Revoking OAuth Access on Intervals.icu:** You can revoke **Intervals Companion**'s OAuth authorization at any time directly from your Intervals.icu account settings at [https://intervals.icu/settings](https://intervals.icu/settings).

---

## 6. Children's Privacy
Intervals Companion is intended for adult athletes and users aged 16 and older who hold an existing Intervals.icu account. We do not knowingly collect personal information from children under 13.

---

## 7. Changes to This Privacy Policy
If we update this Privacy Policy, we will publish the revised version in this repository (`PRIVACY_POLICY.md`) and update the Effective Date at the top of this page.

---

## 8. Contact Us
If you have any questions or concerns regarding this Privacy Policy or how Intervals Companion handles your data, please contact:
- **Email:** moshanov.ilia@gmail.com
- **GitHub Issues:** [https://github.com/Miltt/Intervals-Mobile-Companion/issues](https://github.com/Miltt/Intervals-Mobile-Companion/issues)
