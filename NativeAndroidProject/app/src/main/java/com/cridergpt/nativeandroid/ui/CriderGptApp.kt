package com.cridergpt.nativeandroid.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.cridergpt.nativeandroid.ui.screens.AuthScreen
import com.cridergpt.nativeandroid.ui.screens.CancelScreen
import com.cridergpt.nativeandroid.ui.screens.HomeScreen
import com.cridergpt.nativeandroid.ui.screens.NotFoundScreen
import com.cridergpt.nativeandroid.ui.screens.PaymentScreen
import com.cridergpt.nativeandroid.ui.screens.PricingScreen
import com.cridergpt.nativeandroid.ui.screens.SuccessScreen
import com.cridergpt.nativeandroid.ui.screens.SystemDiagnosticsScreen
import com.cridergpt.nativeandroid.ui.screens.TtsPolicyScreen
import com.cridergpt.nativeandroid.ui.screens.UpgradeScreen
import com.cridergpt.nativeandroid.ui.screens.UserAgreementScreen

/**
 * Converted from React Router in src/App.tsx into Navigation Compose destinations.
 */
@Composable
fun CriderGptApp() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "home") {
        composable("home") { HomeScreen(navController) }
        composable("auth") { AuthScreen(navController) }
        composable("success") { SuccessScreen(navController) }
        composable("cancel") { CancelScreen(navController) }
        composable("system-diagnostics") { SystemDiagnosticsScreen(navController) }
        composable("tts-policy") { TtsPolicyScreen(navController) }
        composable("user-agreement") { UserAgreementScreen(navController) }
        composable("not-found") { NotFoundScreen(navController) }
        composable("upgrade") { UpgradeScreen(navController) }
        composable("pricing") { PricingScreen(navController) }
        composable("payment") { PaymentScreen(navController) }
    }
}
