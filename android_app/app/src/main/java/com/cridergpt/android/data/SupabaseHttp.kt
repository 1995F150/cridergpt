package com.cridergpt.android.data

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Thin HTTP helper for Supabase REST + Edge Functions.
 *
 * We intentionally bypass supabase-kt postgrest for these calls because the
 * project's data classes are not @Serializable. OkHttp + Gson are already
 * available as dependencies.
 */
object SupabaseHttp {
    private const val PROJECT_URL = "https://udpldrrpebdyuiqdtqnq.supabase.co"
    private const val ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcGxkcnJwZWJkeXVpcWR0cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NjA4ODgsImV4cCI6MjA2NzIzNjg4OH0.Gsb6STpmSRsyspSsGIMJ_GJ03-fFR7W3Zizz7cCRnkc"

    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val gson: Gson = Gson()

    private fun accessToken(): String =
        try {
            SupabaseClient.client.auth.currentSessionOrNull()?.accessToken ?: ANON_KEY
        } catch (_: Throwable) {
            ANON_KEY
        }

    /** Call a Supabase Edge Function and return the raw JSON body. */
    suspend fun invokeFunction(name: String, body: Map<String, Any?>): String =
        withContext(Dispatchers.IO) {
            val json = gson.toJson(body)
            val req = Request.Builder()
                .url("$PROJECT_URL/functions/v1/$name")
                .addHeader("Authorization", "Bearer ${accessToken()}")
                .addHeader("apikey", ANON_KEY)
                .addHeader("Content-Type", "application/json")
                .post(json.toRequestBody("application/json".toMediaType()))
                .build()
            http.newCall(req).execute().use { resp ->
                val txt = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw RuntimeException("Edge function $name failed (${resp.code}): $txt")
                }
                txt
            }
        }

    /** GET against PostgREST. `query` example: "select=*&user_id=eq.$uid&order=date.asc". */
    suspend fun restGet(table: String, query: String): String =
        withContext(Dispatchers.IO) {
            val req = Request.Builder()
                .url("$PROJECT_URL/rest/v1/$table?$query")
                .addHeader("Authorization", "Bearer ${accessToken()}")
                .addHeader("apikey", ANON_KEY)
                .addHeader("Accept", "application/json")
                .get()
                .build()
            http.newCall(req).execute().use { resp ->
                val txt = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    throw RuntimeException("REST GET $table failed (${resp.code}): $txt")
                }
                txt
            }
        }

    fun parseObject(raw: String): JsonObject = JsonParser.parseString(raw).asJsonObject
}

/** Mirror of iOS TagIdParser / web TagLookup normalization. */
object TagIdParser {
    private val RX = Regex("CriderGPT-[A-Z0-9]{6}", RegexOption.IGNORE_CASE)

    fun normalize(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        var s = raw.trim()
        // Strip braces / quotes that some encoders add
        s = s.removePrefix("{").removeSuffix("}")
        s = s.removePrefix("\"").removeSuffix("\"")
        // URL-decode quickly if encoded
        if (s.contains("%")) {
            s = try { java.net.URLDecoder.decode(s, "UTF-8") } catch (_: Throwable) { s }
        }
        val m = RX.find(s) ?: return null
        return m.value.uppercase()
    }
}
