package com.cridergpt.nativeandroid.ui.components

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cridergpt.nativeandroid.data.ChatRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatWorkspace(
    chatRepository: ChatRepository,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)

    val conversations = remember {
        mutableStateListOf(
            ConversationUiModel(id = "1", title = "Welcome", updatedAtMillis = System.currentTimeMillis()),
        )
    }
    var selectedConversationId by remember { mutableStateOf(conversations.firstOrNull()?.id) }
    var isSending by remember { mutableStateOf(false) }
    val messages = remember(selectedConversationId) { mutableStateListOf<ChatMessageUiModel>() }

    fun createConversation() {
        val id = System.currentTimeMillis().toString()
        conversations.add(0, ConversationUiModel(id = id, title = "New Chat", updatedAtMillis = System.currentTimeMillis()))
        selectedConversationId = id
    }

    suspend fun sendMessage(message: String) {
        val activeId = selectedConversationId ?: return
        messages.add(ChatMessageUiModel(id = "u-${System.nanoTime()}", role = ChatRole.User, text = message))
        isSending = true
        try {
            val reply = chatRepository.sendMessageToAi(message)
            messages.add(ChatMessageUiModel(id = "a-${System.nanoTime()}", role = ChatRole.Assistant, text = reply))
            conversations.replaceAll {
                if (it.id == activeId) it.copy(updatedAtMillis = System.currentTimeMillis(), title = it.title.ifBlank { message.take(40) }) else it
            }
        } finally {
            isSending = false
        }
    }

    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val showSideBySide = maxWidth >= 840.dp
        val sidebarContent: @Composable () -> Unit = {
            ChatSidebarPane(
                conversations = conversations,
                selectedConversationId = selectedConversationId,
                onSelectConversation = {
                    selectedConversationId = it
                    scope.launch { drawerState.close() }
                },
                onNewChat = {
                    createConversation()
                    scope.launch { drawerState.close() }
                },
                modifier = Modifier.fillMaxHeight().width(320.dp),
            )
        }

        if (showSideBySide) {
            Row(modifier = Modifier.fillMaxSize()) {
                sidebarContent()
                ChatThreadPane(
                    conversationTitle = conversations.firstOrNull { it.id == selectedConversationId }?.title ?: "Chat",
                    messages = messages,
                    isSending = isSending,
                    onSendMessage = { sendMessage(it) },
                    modifier = Modifier.fillMaxSize(),
                )
            }
        } else {
            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    ModalDrawerSheet {
                        sidebarContent()
                    }
                },
            ) {
                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = { Text("CriderGPT", color = MaterialTheme.colorScheme.onSurface) },
                            navigationIcon = {
                                IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                    Icon(Icons.Outlined.Menu, contentDescription = "Open chats")
                                }
                            },
                        )
                    },
) { innerPadding ->
                    ChatThreadPane(
                        conversationTitle = conversations.firstOrNull { it.id == selectedConversationId }?.title ?: "Chat",
                        messages = messages,
                        isSending = isSending,
                        onSendMessage = { sendMessage(it) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight()
                            .padding(innerPadding),
                    )
                }
            }
        }
    }
}

data class ConversationUiModel(
    val id: String,
    val title: String,
    val updatedAtMillis: Long,
)

enum class ChatRole { User, Assistant }

data class ChatMessageUiModel(
    val id: String,
    val role: ChatRole,
    val text: String,
)
