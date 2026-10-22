package com.cridergpt.nativeandroid.data.todo

import com.cridergpt.nativeandroid.data.supabase.SupabaseConfig
import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.gotrue.auth
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * REST-backed todo query to avoid hard dependency on postgrest extension package.
 */
class TodoRepository {
    fun getTodos(): List<TodoItem> {
        val endpoint = URL("${SupabaseConfig.URL}/rest/v1/todos?select=id,name")
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
                throw IllegalStateException("Todo request failed (${conn.responseCode}): $raw")
            }

            val json = JSONArray(raw)
            buildList {
                for (i in 0 until json.length()) {
                    val item = json.getJSONObject(i)
                    val id = item.optString("id").ifBlank { item.opt("id")?.toString().orEmpty() }
                    val name = item.optString("name")
                    if (id.isNotBlank() && name.isNotBlank()) {
                        add(TodoItem(id = id, name = name))
                    }
                }
            }
        } finally {
            conn.disconnect()
        }
    }
}
