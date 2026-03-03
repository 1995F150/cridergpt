package com.cridergpt.nativeandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Responsive chat layout that keeps the chat container readable across phones/tablets:
 * - min width to avoid tiny content
 * - max width to avoid stretched text on large screens
 * - min/max height bounds so chat is never too small or too tall
 */
@Composable
fun ResponsiveChatUi(modifier: Modifier = Modifier) {
    val config = LocalConfiguration.current
    val screenHeightDp = config.screenHeightDp.dp
    val minChatHeight = 420.dp
    val maxChatHeight = (screenHeightDp - 96.dp).coerceAtLeast(minChatHeight)

    var draft by rememberSaveable { mutableStateOf("") }
    var messages by rememberSaveable {
        mutableStateOf(
            listOf(
                "Hey! I can help with farming, diagnostics, and planning.",
                "Try asking: 'Summarize my latest tasks.'"
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
        val contentMaxWidth = if (isTablet) 760.dp else 600.dp

        Surface(
            tonalElevation = 2.dp,
            shadowElevation = 1.dp,
            shape = MaterialTheme.shapes.large,
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .widthIn(min = 320.dp, max = contentMaxWidth)
                .fillMaxWidth()
                .heightIn(min = minChatHeight, max = maxChatHeight)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxHeight()
                    .padding(12.dp)
            ) {
                Text(
                    text = "CriderGPT Chat",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.sizeIn(minHeight = 10.dp))

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(messages) { message ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = message,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.sizeIn(minHeight = 8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        placeholder = { Text("Send a message") },
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 56.dp, max = 140.dp),
                        maxLines = 4
                    )

                    TextButton(
                        onClick = {
                            if (draft.isNotBlank()) {
                                messages = messages + draft.trim()
                                draft = ""
                            }
                        },
                        modifier = Modifier.heightIn(min = 48.dp)
                    ) {
                        Text("Send")
                    }
                }
            }
        }
    }
}
