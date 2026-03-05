package com.cridergpt.nativeandroid.data.payments

import com.cridergpt.nativeandroid.data.supabase.SupabaseConfig
import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.gotrue.auth
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class CheckoutRepository {
    fun createCheckout(priceId: String, planName: String): Result<String> = runCatching {
        val endpoint = URL("${SupabaseConfig.URL}/functions/v1/create-checkout")
        val conn = (endpoint.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
            SupabaseProvider.client.auth.currentSessionOrNull()?.accessToken?.let { token ->
                setRequestProperty("Authorization", "Bearer $token")
            }
        }

        try {
            val payload = JSONObject().apply {
                put("priceId", priceId)
                put("planName", planName)
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
            val raw = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            val json = runCatching { JSONObject(raw) }.getOrNull()
            val checkoutUrl = json?.optString("url")?.takeIf { it.isNotBlank() }

            if (conn.responseCode in 200..299 && checkoutUrl != null) {
                checkoutUrl
            } else {
                throw IllegalStateException(
                    "Checkout failed (${conn.responseCode}): ${json?.optString("error") ?: raw}"
                )
            }
        } finally {
            conn.disconnect()
        }
    }
}
