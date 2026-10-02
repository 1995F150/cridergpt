package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import kotlinx.coroutines.launch

/**
 * Native auth screen for Supabase email/password and Google ID token sign-in.
 */
@Composable
fun AuthScreen(navController: NavHostController) {
    val authRepository = remember { SupabaseAuthRepository() }
    val scope = rememberCoroutineScope()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var googleIdToken by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Not signed in") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Sign in", style = MaterialTheme.typography.headlineSmall)

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Button(
            onClick = {
                scope.launch {
                    val result = authRepository.signInWithEmail(email.trim(), password)
                    status = if (result.isSuccess) "Email sign-in success" else "Email sign-in failed: ${result.exceptionOrNull()?.message}"
                    if (result.isSuccess) navController.navigate("home")
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Sign in with Email")
        }

        Text("Google Native (ID Token)", style = MaterialTheme.typography.titleSmall)
        OutlinedTextField(
            value = googleIdToken,
            onValueChange = { googleIdToken = it },
            label = { Text("Google ID token") },
            modifier = Modifier.fillMaxWidth()
        )

        Button(
            onClick = {
                scope.launch {
                    val result = authRepository.signInWithGoogleIdToken(googleIdToken.trim())
                    status = if (result.isSuccess) "Google sign-in success" else "Google sign-in failed: ${result.exceptionOrNull()?.message}"
                    if (result.isSuccess) navController.navigate("home")
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Sign in with Google")
        }

        Text(status, style = MaterialTheme.typography.bodyMedium)
        Text(
            "Use Android Credential Manager/Google Identity to obtain the ID token and pass it here.",
            style = MaterialTheme.typography.bodySmall
        )
    }
}
