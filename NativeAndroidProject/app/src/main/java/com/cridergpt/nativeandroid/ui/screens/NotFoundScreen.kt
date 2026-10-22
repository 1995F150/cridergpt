package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController

/**
 * Fallback route for unknown navigation paths.
 */
@Composable
fun NotFoundScreen(navController: NavHostController) {
    StaticContentScreen(
        title = "Page not found",
        body = "The destination you requested is not available in the native Android client yet.",
        primaryActionLabel = "Go Home",
        onPrimaryAction = { navController.navigate("home") }
    )
}
