package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController

/**
 * Native TTS policy summary screen.
 */
@Composable
fun TtsPolicyScreen(navController: NavHostController) {
    StaticContentScreen(
        title = "Text-to-Speech policy",
        body = "Text-to-speech output must follow platform safety guidelines and local laws. Do not generate or distribute harmful, deceptive, or rights-violating content.",
        primaryActionLabel = "Accept and Continue",
        onPrimaryAction = { navController.navigate("home") }
    )
}
