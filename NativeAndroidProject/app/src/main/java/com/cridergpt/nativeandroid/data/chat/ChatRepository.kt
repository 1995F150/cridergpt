package com.cridergpt.nativeandroid.data.chat

import com.cridergpt.nativeandroid.data.supabase.SupabaseConfig
import com.cridergpt.nativeandroid.data.supabase.SupabaseProvider
import io.github.jan.supabase.gotrue.auth
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * Chat repository with a simple AI response call through Supabase Edge Functions.
 */
data class ChatMessage(val id: String, val role: String, val content: String)
data class Conversation(val id: String, val title: String)

class ChatRepository {
    suspend fun loadConversations(): List<Conversation> = emptyList()
    suspend fun loadMessages(conversationId: String): List<ChatMessage> = emptyList()
    suspend fun createConversation(title: String): Conversation? = Conversation(UUID.randomUUID().toString(), title)

    fun sendMessageToAi(prompt: String): Result<String> = runCatching {
        val endpoint = URL("${SupabaseConfig.URL}${SupabaseConfig.CHAT_WITH_AI_PATH}")
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
                put("message", prompt)
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
            val raw = BufferedReader(InputStreamReader(stream)).use { it.readText() }
            val json = runCatching { JSONObject(raw) }.getOrNull()

            json?.optString("response")
                ?.takeIf { it.isNotBlank() }
                ?: json?.optString("message")
                    ?.takeIf { it.isNotBlank() }
                ?: if (conn.responseCode in 200..299) {
                    raw.ifBlank { "AI responded with empty output." }
                } else {
                    throw IllegalStateException("AI request failed (${conn.responseCode}): $raw")
                }
        } finally {
            conn.disconnect()
        }
    }
}
