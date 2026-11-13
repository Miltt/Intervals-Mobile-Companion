package icu.intervals.companion.i18n

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

data class LocaleOption(
    val code: String,
    val name: String,
    val nativeName: String,
    val flag: String,
    val file: String
)

/**
 * Hybrid JSON Localization Manager for Android:
 * 1. Bundled offline dictionaries in `assets/locales/*.json` (en, de, ru, fr, it).
 * 2. Dynamic over-the-air language updates from the public GitHub repository
 *    (`https://raw.githubusercontent.com/Miltt/Intervals-Mobile-Companion/main/public/locales/index.json`)
 *    cached locally in `context.filesDir/locales/`.
 */
object LocalizationManager {
    private const val GITHUB_RAW_BASE =
        "https://raw.githubusercontent.com/Miltt/Intervals-Mobile-Companion/main/public/locales"

    val defaultLanguages = listOf(
        LocaleOption("en", "English", "English", "🇬🇧", "en.json"),
        LocaleOption("es", "Spanish", "Español", "🇪🇸", "es.json"),
        LocaleOption("de", "German", "Deutsch", "🇩🇪", "de.json"),
        LocaleOption("ru", "Russian", "Русский", "🇷🇺", "ru.json"),
        LocaleOption("fr", "French", "Français", "🇫🇷", "fr.json"),
        LocaleOption("it", "Italian", "Italiano", "🇮🇹", "it.json")
    )

    private var fallbackEnglishMap: Map<String, String> = emptyMap()
    private var activeLocaleMap: Map<String, String> = emptyMap()

    fun loadLanguage(context: Context, langCode: String): Map<String, String> {
        if (fallbackEnglishMap.isEmpty()) {
            fallbackEnglishMap = readJsonAssetOrCache(context, "en.json")
        }
        activeLocaleMap = readJsonAssetOrCache(context, "$langCode.json")
        return activeLocaleMap
    }

    fun t(key: String, params: Map<String, Any> = emptyMap()): String {
        var text = activeLocaleMap[key] ?: fallbackEnglishMap[key] ?: key
        params.forEach { (k, v) ->
            text = text.replace("{$k}", v.toString())
        }
        return text
    }

    private fun readJsonAssetOrCache(context: Context, fileName: String): Map<String, String> {
        return try {
            val cachedFile = File(File(context.filesDir, "locales"), fileName)
            val jsonText = if (cachedFile.exists()) {
                cachedFile.readText()
            } else {
                context.assets.open("locales/$fileName").bufferedReader().use { it.readText() }
            }
            val obj = JSONObject(jsonText)
            val result = mutableMapOf<String, String>()
            obj.keys().forEach { k ->
                result[k] = obj.optString(k, k)
            }
            result
        } catch (_: Exception) {
            emptyMap()
        }
    }

    suspend fun syncFromGitHubRepository(context: Context): List<LocaleOption> =
        withContext(Dispatchers.IO) {
            val localesDir = File(context.filesDir, "locales").apply { mkdirs() }
            try {
                val indexJson = fetchUrl("$GITHUB_RAW_BASE/index.json")
                File(localesDir, "index.json").writeText(indexJson)
                val root = JSONObject(indexJson)
                val arr = root.getJSONArray("languages")
                val list = mutableListOf<LocaleOption>()
                for (i in 0 until arr.length()) {
                    val item = arr.getJSONObject(i)
                    val file = item.getString("file")
                    val langOption = LocaleOption(
                        code = item.getString("code"),
                        name = item.getString("name"),
                        nativeName = item.getString("nativeName"),
                        flag = item.optString("flag", "🌐"),
                        file = file
                    )
                    list.add(langOption)
                    runCatching {
                        val langJson = fetchUrl("$GITHUB_RAW_BASE/$file")
                        File(localesDir, file).writeText(langJson)
                    }
                }
                list
            } catch (_: Exception) {
                defaultLanguages
            }
        }

    private fun fetchUrl(urlStr: String): String {
        val conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
            connectTimeout = 5000
            readTimeout = 5000
            requestMethod = "GET"
        }
        return conn.inputStream.bufferedReader().use { it.readText() }
    }
}
