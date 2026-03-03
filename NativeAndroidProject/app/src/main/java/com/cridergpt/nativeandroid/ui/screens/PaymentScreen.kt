package com.cridergpt.nativeandroid.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.cridergpt.nativeandroid.data.payments.CheckoutRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PaymentScreen(navController: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val checkoutRepository = remember { CheckoutRepository() }

    val selectedPlanName = navController.previousBackStackEntry
        ?.savedStateHandle
        ?.get<String>("selected_plan_name")
        ?: ""
    val selectedPlanDisplay = navController.previousBackStackEntry
        ?.savedStateHandle
        ?.get<String>("selected_plan_display")
        ?: "No plan selected"
    val selectedPriceId = navController.previousBackStackEntry
        ?.savedStateHandle
        ?.get<String>("selected_price_id")
        ?: ""

    var acceptTerms by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Payment", style = MaterialTheme.typography.headlineMedium)
        Text("Selected plan: $selectedPlanDisplay", style = MaterialTheme.typography.bodyLarge)
        Text(
            "Checkout is created via Supabase edge function create-checkout (Stripe webhooks update final plan state).",
            style = MaterialTheme.typography.bodyMedium
        )

        Checkbox(
            checked = acceptTerms,
            onCheckedChange = { acceptTerms = it }
        )
        Text("I accept billing terms for this plan.")

        if (loading) {
            CircularProgressIndicator()
        }

        status?.let {
            Text(
                text = it,
                color = if (it.startsWith("Error")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
        }

        Button(
            onClick = {
                if (selectedPriceId.isBlank() || selectedPlanName.isBlank()) {
                    status = "Error: selected plan is missing Stripe price id."
                    return@Button
                }

                scope.launch {
                    loading = true
                    val result = withContext(Dispatchers.IO) {
                        checkoutRepository.createCheckout(selectedPriceId, selectedPlanName)
                    }

                    result.onSuccess { checkoutUrl ->
                        status = "Checkout created. Opening Stripe checkout..."
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                        )
                    }.onFailure {
                        status = "Error: ${it.message ?: "Failed to create checkout session"}"
                    }
                    loading = false
                }
            },
            enabled = acceptTerms && !loading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Open Stripe Checkout")
        }

        OutlinedButton(
            onClick = { navController.navigate("cancel") },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancel Checkout")
        }
    }
}
