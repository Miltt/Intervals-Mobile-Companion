package icu.intervals.companion.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Google Play Store-ready Web Browser Login for Intervals.icu.
 * Opens https://intervals.icu/oauth/authorize inside an Android Chrome Custom Tab
 * so the user signs in via the familiar Intervals.icu web form (or Google/Strava/Garmin SSO)
 * without ever typing an Athlete ID or generating an API key.
 */
object IntervalsWebAuthManager {
    private const val AUTHORIZE_URL = "https://intervals.icu/oauth/authorize"
    const val REDIRECT_URI = "intervalscompanion://oauth/callback"

    fun launchBrowserLogin(context: Context, clientId: String) {
        val uri = Uri.parse(AUTHORIZE_URL).buildUpon()
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("scope", "CALENDAR:READ,ACTIVITY:READ")
            .appendQueryParameter("state", "intervals_android_login")
            .build()

        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        customTabsIntent.launchUrl(context, uri)
    }
}
