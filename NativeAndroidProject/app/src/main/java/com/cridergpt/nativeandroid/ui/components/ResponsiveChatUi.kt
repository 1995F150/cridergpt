package com.cridergpt.nativeandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cridergpt.nativeandroid.data.chat.ChatRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Mobile-first native chat UI with Supabase-backed AI reply support.
 */
@Composable
fun ResponsiveChatUi(modifier: Modifier = Modifier) {
    val config = LocalConfiguration.current
    val screenHeightDp = config.screenHeightDp.dp
    val minChatHeight = 460.dp
    val maxChatHeight = (screenHeightDp - 64.dp).coerceAtLeast(minChatHeight)
    val chatRepository = remember { ChatRepository() }

    var draft by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var messages by remember {
        mutableStateOf(
            listOf(
                UiMessage(UUID.randomUUID().toString(), "assistant", "Hey — this is the Android-native chat layout."),
                UiMessage(UUID.randomUUID().toString(), "assistant", "I can answer using the Supabase AI function when available.")
            )
        )
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        val isTablet = maxWidth >= 840.dp
        val contentMaxWidth = if (isTablet) 640.dp else 560.dp

        Surface(
            tonalElevation = 1.dp,
            shape = RoundedCornerShape(22.dp),
            modifier = Modifier
                .padding(horizontal = 12.dp, vertical = 10.dp)
                .fillMaxWidth()
                .widthIn(min = 320.dp, max = contentMaxWidth)
                .heightIn(min = minChatHeight, max = maxChatHeight)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .padding(12.dp)
            ) {
                Text(
                    text = "CriderGPT",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Android Chat",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp, bottom = 8.dp)
                )

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(messages, key = { it.id }) { message ->
                        val isUser = message.role == "user"
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isUser) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    }
                                ),
                                shape = RoundedCornerShape(18.dp),
                                modifier = Modifier.widthIn(max = 420.dp)
                            ) {
                                Text(
                                    text = message.content,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = if (isUser) {
                                        MaterialTheme.colorScheme.onPrimaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        placeholder = { Text("Type a message") },
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 56.dp, max = 120.dp),
                        maxLines = 3,
                        enabled = !isLoading
                    )

                    Box {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                        } else {
                            TextButton(
                                onClick = {
                                    val prompt = draft.trim()
                                    if (prompt.isBlank()) return@TextButton

                                    draft = ""
                                    messages = messages + UiMessage(UUID.randomUUID().toString(), "user", prompt)
                                    isLoading = true

                                    CoroutineScope(Dispatchers.IO).launch {
                                        val aiResult = chatRepository.sendMessageToAi(prompt)
                                        val aiText = aiResult.getOrElse {
                                            "I couldn't reach AI right now: ${it.message ?: "Unknown error"}"
                                        }

                                        CoroutineScope(Dispatchers.Main).launch {
                                            messages = messages + UiMessage(UUID.randomUUID().toString(), "assistant", aiText)
                                            isLoading = false
                                        }
                                    }
                                }
                            ) {
                                Text("Send")
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class UiMessage(
    val id: String,
    val role: String,
    val content: String
)
