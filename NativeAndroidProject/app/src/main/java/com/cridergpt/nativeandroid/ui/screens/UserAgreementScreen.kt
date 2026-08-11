package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController

/**
 * Native user agreement summary screen.
 */
@Composable
fun UserAgreementScreen(navController: NavHostController) {
    StaticContentScreen(
        title = "User agreement",
        body = "By using this app, you agree to follow acceptable use requirements and acknowledge that cloud-backed features depend on third-party services.",
        primaryActionLabel = "I Understand",
        onPrimaryAction = { navController.navigate("home") }
    )
}
