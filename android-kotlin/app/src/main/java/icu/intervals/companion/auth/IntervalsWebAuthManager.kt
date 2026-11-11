package icu.intervals.companion.auth

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabsIntent
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Google Play Store-ready Web Browser Login for Intervals.icu using OAuth 2.0 + PKCE (S256).
 * Opens https://intervals.icu/oauth/authorize inside an Android Chrome Custom Tab
 * so the user signs in via the familiar Intervals.icu web form (or Google/Strava/Garmin SSO)
 * without ever typing an Athlete ID, generating an API key, or embedding a client secret in the APK.
 */
object IntervalsWebAuthManager {
    private const val AUTHORIZE_URL = "https://intervals.icu/oauth/authorize"
    const val REDIRECT_URI = "intervalscompanion://oauth/callback"

    var pendingCodeVerifier: String? = null
        private set

    fun generateCodeVerifier(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    fun computeCodeChallengeS256(verifier: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII))
        return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    fun launchBrowserLogin(context: Context, clientId: String) {
        val verifier = generateCodeVerifier()
        pendingCodeVerifier = verifier
        val challenge = computeCodeChallengeS256(verifier)

        val uri = Uri.parse(AUTHORIZE_URL).buildUpon()
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("scope", "CALENDAR:READ,ACTIVITY:READ")
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("state", "intervals_android_login")
            .build()

        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        customTabsIntent.launchUrl(context, uri)
    }
}

