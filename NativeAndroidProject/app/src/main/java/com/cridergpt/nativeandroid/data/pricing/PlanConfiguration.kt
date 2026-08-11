package com.cridergpt.nativeandroid.data.pricing

import kotlinx.serialization.Serializable

@Serializable
data class PlanConfiguration(
    val plan_name: String,
    val plan_display_name: String,
    val price_monthly: Double,
    val stripe_price_id: String? = null,
    val sort_order: Int = 0
)
