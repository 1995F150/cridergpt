package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController

/**
 * Native cancellation route with clear recovery actions.
 */
@Composable
fun CancelScreen(navController: NavHostController) {
    StaticContentScreen(
        title = "Payment canceled",
        body = "Your checkout was canceled. No charge was created. You can return to chat or try the purchase flow again when you're ready.",
        primaryActionLabel = "Back to Home",
        onPrimaryAction = { navController.navigate("home") },
        secondaryActionLabel = "Retry Pricing",
        onSecondaryAction = { navController.navigate("pricing") }
    )
}
