package icu.intervals.companion.auth

import android.content.Context
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom

data class IntervalsOAuthSession(
    val accessToken: String,
    val athleteId: String,
    val athleteName: String,
    val scope: String
)

/**
 * Google Play Store-ready Web Browser Login for Intervals.icu using OAuth 2.0 + PKCE (S256).
 * Approved OAuth Client ID: 1781 (Public Client + Require PKCE).
 * Opens https://intervals.icu/oauth/authorize inside an Android Chrome Custom Tab
 * and exchanges the returned authorization code + PKCE code_verifier at
 * https://intervals.icu/api/oauth/token without embedding any client_secret in the APK.
 */
object IntervalsWebAuthManager {
    const val DEFAULT_CLIENT_ID = "1781"
    private const val AUTHORIZE_URL = "https://intervals.icu/oauth/authorize"
    private const val TOKEN_URL = "https://intervals.icu/api/oauth/token"
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

    fun launchBrowserLogin(context: Context, clientId: String = DEFAULT_CLIENT_ID) {
        val verifier = generateCodeVerifier()
        pendingCodeVerifier = verifier
        val challenge = computeCodeChallengeS256(verifier)

        val uri = Uri.parse(AUTHORIZE_URL).buildUpon()
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("scope", "CALENDAR:READ,ACTIVITY:READ")
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .appendQueryParameter("state", "intervals_android_login")
            .build()

        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        customTabsIntent.launchUrl(context, uri)
    }

    /**
     * Exchanges the OAuth authorization code + PKCE code_verifier for an Intervals.icu Bearer token.
     * Call this when MainActivity receives the deep link `intervalscompanion://oauth/callback?code=...`
     */
    suspend fun exchangeCodeForToken(
        code: String,
        clientId: String = DEFAULT_CLIENT_ID
    ): Result<IntervalsOAuthSession> = withContext(Dispatchers.IO) {
        runCatching {
            val verifier = pendingCodeVerifier
                ?: throw IllegalStateException("Missing PKCE code_verifier for OAuth token exchange")

            val formBody = FormBody.Builder()
                .add("client_id", clientId)
                .add("code", code)
                .add("code_verifier", verifier)
                .add("redirect_uri", REDIRECT_URI)
                .add("grant_type", "authorization_code")
                .build()

            val request = Request.Builder()
                .url(TOKEN_URL)
                .post(formBody)
                .header("Accept", "application/json")
                .build()

            val client = OkHttpClient()
            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    throw IllegalStateException("OAuth token exchange failed (${response.code}): $bodyStr")
                }

                val json = JSONObject(bodyStr)
                val accessToken = json.getString("access_token")
                val scope = json.optString("scope", "CALENDAR:READ,ACTIVITY:READ")
                val athleteObj = json.optJSONObject("athlete")
                val athleteId = athleteObj?.optString("id", "0") ?: "0"
                val athleteName = athleteObj?.optString("name", "Intervals.icu Athlete") ?: "Intervals.icu Athlete"

                pendingCodeVerifier = null

                IntervalsOAuthSession(
                    accessToken = accessToken,
                    athleteId = athleteId,
                    athleteName = athleteName,
                    scope = scope
                )
            }
        }
    }
}
