package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.cridergpt.nativeandroid.data.auth.SupabaseAuthRepository
import com.cridergpt.nativeandroid.data.supabase.SupabaseConfig
import kotlinx.coroutines.launch

/**
 * Diagnostics route to inspect basic auth + environment state.
 */
@Composable
fun SystemDiagnosticsScreen(navController: NavHostController) {
    val authRepository = remember { SupabaseAuthRepository() }
    val scope = rememberCoroutineScope()

    var authStatus by remember { mutableStateOf("Unknown") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("System diagnostics", style = MaterialTheme.typography.headlineMedium)
        Text("Supabase URL: ${SupabaseConfig.URL}")
        Text("Auth session state: $authStatus")

        Button(
            onClick = {
                scope.launch {
                    authRepository.syncSession()
                    authStatus = if (authRepository.isAuthenticated.value) "Authenticated" else "Not authenticated"
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Refresh session status")
        }

        OutlinedButton(
            onClick = { navController.navigate("auth") },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open Auth")
        }

        OutlinedButton(
            onClick = { navController.navigate("home") },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Back Home")
        }
    }
}
