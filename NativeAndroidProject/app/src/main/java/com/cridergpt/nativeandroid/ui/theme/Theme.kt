package com.cridergpt.nativeandroid.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val AppColorScheme = darkColorScheme()

/**
 * Converted from index.css/App.css theme tokens into a Compose Material theme shell.
 */
@Composable
fun CriderGptTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = AppColorScheme, content = content)
}
