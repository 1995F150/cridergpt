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
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController

@Composable
fun UpgradeScreen(navController: NavHostController) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Upgrade", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Choose a subscription tier to unlock higher limits and advanced features.",
            style = MaterialTheme.typography.bodyLarge
        )

        Button(
            onClick = { navController.navigate("pricing") },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("View Pricing")
        }

        OutlinedButton(
            onClick = { navController.navigate("home") },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Back Home")
        }
    }
}
