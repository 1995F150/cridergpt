package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.cridergpt.nativeandroid.ui.components.ResponsiveChatUi

/**
 * Converted from web home route and now hosts a responsive native chat shell.
 */
@Composable
fun HomeScreen(navController: NavHostController) {
    ResponsiveChatUi()
}
