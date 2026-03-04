package com.cridergpt.nativeandroid.data.pricing

import com.cridergpt.nativeandroid.data.supabase.SupabaseConfig
import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.gotrue.auth
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class PlanRepository {
    fun getPlans(): List<PlanConfiguration> {
        val endpoint = URL(
            "${SupabaseConfig.URL}/rest/v1/plan_configurations?select=plan_name,plan_display_name,price_monthly,stripe_price_id,sort_order"
        )
        val conn = (endpoint.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", SupabaseConfig.PUBLISHABLE_KEY)
            val bearer = SupabaseProvider.client.auth.currentSessionOrNull()?.accessToken ?: SupabaseConfig.PUBLISHABLE_KEY
            setRequestProperty("Authorization", "Bearer $bearer")
        }

        return try {
            val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
            val raw = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            if (conn.responseCode !in 200..299) {
                throw IllegalStateException("Plan request failed (${conn.responseCode}): $raw")
            }

            val json = JSONArray(raw)
            buildList {
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    add(
                        PlanConfiguration(
                            plan_name = item.optString("plan_name"),
                            plan_display_name = item.optString("plan_display_name"),
                            price_monthly = item.optDouble("price_monthly", 0.0),
                            stripe_price_id = item.optString("stripe_price_id").ifBlank { null },
                            sort_order = item.optInt("sort_order", 0)
                        )
                    )
                }
            }.sortedBy { it.sort_order }
        } finally {
            conn.disconnect()
        }
    }
}
