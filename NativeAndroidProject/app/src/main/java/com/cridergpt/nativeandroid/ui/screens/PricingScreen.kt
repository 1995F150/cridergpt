package com.cridergpt.nativeandroid.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.cridergpt.nativeandroid.data.pricing.PlanConfiguration
import com.cridergpt.nativeandroid.data.pricing.PlanRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun PricingScreen(navController: NavHostController) {
    var plans by remember { mutableStateOf<List<PlanConfiguration>>(emptyList()) }
    var selectedPlanId by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        runCatching {
            withContext(Dispatchers.IO) { PlanRepository().getPlans() }
        }.onSuccess {
            plans = it.filter { plan -> !plan.stripe_price_id.isNullOrBlank() }
            selectedPlanId = plans.firstOrNull()?.plan_name
            loading = false
        }.onFailure {
            error = it.message ?: "Failed to load plans"
            loading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Pricing", style = MaterialTheme.typography.headlineMedium)

        when {
            loading -> CircularProgressIndicator()
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
            else -> {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(plans, key = { it.plan_name }) { plan ->
                        val selected = plan.plan_name == selectedPlanId
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(plan.plan_display_name, style = MaterialTheme.typography.titleMedium)
                                val priceLabel = if (plan.plan_name == "lifetime") {
                                    "$${plan.price_monthly.toInt()} one-time"
                                } else {
                                    "$${plan.price_monthly.toInt()}/month"
                                }
                                Text(priceLabel, style = MaterialTheme.typography.bodyLarge)
                                RadioButton(
                                    selected = selected,
                                    onClick = { selectedPlanId = plan.plan_name }
                                )
                            }
                        }
                    }
                }

                Button(
                    onClick = {
                        val selected = plans.firstOrNull { it.plan_name == selectedPlanId } ?: return@Button
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_plan_name", selected.plan_name)
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_plan_display", selected.plan_display_name)
                        navController.currentBackStackEntry?.savedStateHandle?.set("selected_price_id", selected.stripe_price_id ?: "")
                        navController.navigate("payment")
                    },
                    enabled = selectedPlanId != null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Continue to Payment")
                }
            }
        }

        OutlinedButton(
            onClick = { navController.navigate("home") },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Back Home")
        }
    }
}
