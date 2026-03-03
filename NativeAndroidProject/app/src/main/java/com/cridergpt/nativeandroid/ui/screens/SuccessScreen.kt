package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController

/**
 * Native success route after completing checkout.
 */
@Composable
fun SuccessScreen(navController: NavHostController) {
    StaticContentScreen(
        title = "Payment successful",
        body = "Thanks for upgrading. Your account benefits should be available shortly after your next session sync.",
        primaryActionLabel = "Continue to Home",
        onPrimaryAction = { navController.navigate("home") }
    )
}
