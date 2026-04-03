package com.cridergpt.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cridergpt.android.data.SupabaseClient
import com.cridergpt.android.models.ChatMessage
import com.cridergpt.android.models.ChatUser
import com.cridergpt.android.models.Conversation
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch

class ChatViewModel : ViewModel() {

    private val supabase = SupabaseClient.client

    private val _conversations = MutableLiveData<List<Conversation>>()
    val conversations: LiveData<List<Conversation>> = _conversations

    private val _messages = MutableLiveData<List<ChatMessage>>()
    val messages: LiveData<List<ChatMessage>> = _messages

    private val _users = MutableLiveData<List<ChatUser>>()
    val users: LiveData<List<ChatUser>> = _users

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _currentConversationId = MutableLiveData<String?>()
    val currentConversationId: LiveData<String?> = _currentConversationId

    fun loadConversations(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["chat_conversations"]
                    .select {
                        filter {
                            eq("user_id", userId)
                        }
                    }

                val conversations = result.decodeList<Conversation>()
                _conversations.value = conversations.sortedByDescending { it.updatedAt }
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadUsers() {
        viewModelScope.launch {
            try {
                val result = supabase.postgrest["crider_chat_users"]
                    .select {
                        filter {
                            eq("is_synced", true)
                        }
                        limit(50)
                    }

                // Note: This would need proper mapping based on your table structure
                // For now, using placeholder
                _users.value = emptyList()
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun createConversation(title: String, participantUserId: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // This would call the Supabase Edge Function
                // For now, create a local conversation
                val newConversation = Conversation(
                    id = "temp_${System.currentTimeMillis()}",
                    title = title,
                    createdAt = "2024-01-01T00:00:00Z",
                    updatedAt = "2024-01-01T00:00:00Z"
                )

                val currentList = _conversations.value.orEmpty()
                _conversations.value = listOf(newConversation) + currentList
                _currentConversationId.value = newConversation.id
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun sendMessage(content: String, conversationId: String, userId: String) {
        viewModelScope.launch {
            try {
                // This would call the Supabase Edge Function
                val newMessage = ChatMessage(
                    id = "temp_${System.currentTimeMillis()}",
                    content = content,
                    role = "user",
                    createdAt = "2024-01-01T00:00:00Z",
                    userId = userId
                )

                val currentMessages = _messages.value.orEmpty()
                _messages.value = currentMessages + newMessage
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun loadMessages(conversationId: String, userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val result = supabase.postgrest["chat_messages"]
                    .select {
                        filter {
                            eq("conversation_id", conversationId)
                            eq("user_id", userId)
                        }
                    }

                val messages = result.decodeList<ChatMessage>()
                _messages.value = messages.sortedBy { it.createdAt }
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectConversation(conversationId: String, userId: String) {
        _currentConversationId.value = conversationId
        loadMessages(conversationId, userId)
    }
}