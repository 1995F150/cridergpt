package com.cridergpt.nativeandroid.data.chat

/**
 * Converted from src/hooks/useChat.ts: encapsulates conversation/message API calls.
 */
data class ChatMessage(val id: String, val role: String, val content: String)
data class Conversation(val id: String, val title: String)

class ChatRepository {
    suspend fun loadConversations(): List<Conversation> = emptyList()
    suspend fun loadMessages(conversationId: String): List<ChatMessage> = emptyList()
    suspend fun createConversation(title: String): Conversation? = null
}
